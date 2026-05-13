#!/bin/bash
# create_worker_ec2.sh — Provisión de EC2 worker para SwitchFile
# Crea: IAM Role + Policy + Instance Profile + Security Group + EC2 instance
# Idempotente: re-ejecutarse no rompe nada y reporta lo que ya existe.

set -e

export AWS_PAGER=cat

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-us-east-1}"

# Configuración (overridable via env vars)
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
INSTANCE_NAME="${INSTANCE_NAME:-switchfile-worker}"
EBS_VOLUME_SIZE="${EBS_VOLUME_SIZE:-16}"
ROLE_NAME="${ROLE_NAME:-SwitchFileWorkerRole}"
POLICY_NAME="${POLICY_NAME:-SwitchFileWorkerPolicy}"
INSTANCE_PROFILE="${INSTANCE_PROFILE:-SwitchFileWorkerProfile}"
SG_NAME="${SG_NAME:-switchfile-worker-sg}"

QUEUE_NAME="${SQS_QUEUE_NAME:-switchfile-conversions-queue.fifo}"
BUCKET_UPLOADS="${BUCKET_UPLOADS:-switchfile-uploads-${ACCOUNT_ID}}"
BUCKET_CONVERTED="${BUCKET_CONVERTED:-switchfile-converted-${ACCOUNT_ID}}"
TABLE_FILES="${TABLE_FILES:-switchfile-files}"
TABLE_CONVERSIONS="${TABLE_CONVERSIONS:-switchfile-conversions}"

QUEUE_URL="https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/${QUEUE_NAME}"

echo "═══════════════════════════════════════"
echo "  Provisión EC2 Worker para SwitchFile"
echo "═══════════════════════════════════════"
echo "  Cuenta:   $ACCOUNT_ID"
echo "  Región:   $AWS_REGION"
echo "  Tipo:     $INSTANCE_TYPE"
echo "  Nombre:   $INSTANCE_NAME"
echo "═══════════════════════════════════════"
echo ""

# ---------------------------------------------------------------------------
# Paso 1: IAM Role + AmazonSSMManagedInstanceCore
# ---------------------------------------------------------------------------
echo "Paso 1: IAM Role ($ROLE_NAME)..."

TRUST_POLICY=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo "  ✓ Role ya existe"
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY" \
        --description "Role del worker EC2 de SwitchFile" >/dev/null
    echo "  ✓ Role creado"
fi

aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore >/dev/null 2>&1 || true
echo "  ✓ AmazonSSMManagedInstanceCore adjunto"

# ---------------------------------------------------------------------------
# Paso 2: Custom policy con permisos del worker
# ---------------------------------------------------------------------------
echo ""
echo "Paso 2: Custom Policy ($POLICY_NAME)..."

POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadUploads",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${BUCKET_UPLOADS}",
        "arn:aws:s3:::${BUCKET_UPLOADS}/*"
      ]
    },
    {
      "Sid": "WriteConverted",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::${BUCKET_CONVERTED}/*"
    },
    {
      "Sid": "ConsumeQueue",
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": "arn:aws:sqs:${AWS_REGION}:${ACCOUNT_ID}:${QUEUE_NAME}"
    },
    {
      "Sid": "DynamoRW",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:${AWS_REGION}:${ACCOUNT_ID}:table/${TABLE_FILES}",
        "arn:aws:dynamodb:${AWS_REGION}:${ACCOUNT_ID}:table/${TABLE_CONVERSIONS}"
      ]
    },
    {
      "Sid": "PublishMetrics",
      "Effect": "Allow",
      "Action": "cloudwatch:PutMetricData",
      "Resource": "*",
      "Condition": {
        "StringEquals": { "cloudwatch:namespace": "SwitchFile" }
      }
    }
  ]
}
EOF
)

POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
    echo "  ✓ Policy ya existe — creando nueva versión y promoviendo a default"
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "$POLICY_DOC" \
        --set-as-default >/dev/null
else
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "$POLICY_DOC" \
        --description "Permisos del worker EC2 sobre S3/SQS/DynamoDB/CloudWatch" >/dev/null
    echo "  ✓ Policy creada"
fi

aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN" >/dev/null 2>&1 || true
echo "  ✓ Policy adjunta al role"

# ---------------------------------------------------------------------------
# Paso 3: Instance Profile
# ---------------------------------------------------------------------------
echo ""
echo "Paso 3: Instance Profile ($INSTANCE_PROFILE)..."

if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE" >/dev/null 2>&1; then
    echo "  ✓ Instance Profile ya existe"
else
    aws iam create-instance-profile --instance-profile-name "$INSTANCE_PROFILE" >/dev/null
    echo "  ✓ Instance Profile creado"
fi

CURRENT_ROLE=$(aws iam get-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE" \
    --query 'InstanceProfile.Roles[0].RoleName' \
    --output text 2>/dev/null || echo "")

if [ "$CURRENT_ROLE" != "$ROLE_NAME" ]; then
    aws iam add-role-to-instance-profile \
        --instance-profile-name "$INSTANCE_PROFILE" \
        --role-name "$ROLE_NAME" >/dev/null 2>&1 || true
fi
echo "  ✓ Role asignado al Instance Profile"

# IAM tarda en propagar. Pausa antes de usar el profile en EC2.
echo "  ⏳ Esperando 10s para que IAM propague..."
sleep 10

# ---------------------------------------------------------------------------
# Paso 4: Security Group (solo egress)
# ---------------------------------------------------------------------------
echo ""
echo "Paso 4: Security Group ($SG_NAME)..."

DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=true" \
    --query 'Vpcs[0].VpcId' --output text)

if [ -z "$DEFAULT_VPC_ID" ] || [ "$DEFAULT_VPC_ID" = "None" ]; then
    echo "  ✗ No se encontró VPC default. Abortando."
    exit 1
fi
echo "  ✓ VPC default: $DEFAULT_VPC_ID"

SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
    echo "  ✓ Security Group ya existe ($SG_ID)"
else
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SG_NAME" \
        --description "SwitchFile worker EC2 - egress only (SSM-managed)" \
        --vpc-id "$DEFAULT_VPC_ID" \
        --query 'GroupId' --output text)
    echo "  ✓ Security Group creado ($SG_ID)"

    # Revocar default egress ALL y agregar solo HTTPS
    aws ec2 revoke-security-group-egress \
        --group-id "$SG_ID" \
        --ip-permissions '[{"IpProtocol":"-1","FromPort":-1,"ToPort":-1,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]}]' \
        >/dev/null 2>&1 || true

    aws ec2 authorize-security-group-egress \
        --group-id "$SG_ID" \
        --ip-permissions '[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"HTTPS para AWS APIs y git pull"}]}]' \
        >/dev/null
    echo "  ✓ Egress configurado (solo 443/tcp)"
fi

# ---------------------------------------------------------------------------
# Paso 5: Lookup subnet pública en una AZ que soporte el tipo de instancia
# ---------------------------------------------------------------------------
echo ""
echo "Paso 5: Buscando subnet pública compatible con $INSTANCE_TYPE..."

# AZs donde el INSTANCE_TYPE está disponible
SUPPORTED_AZS=$(aws ec2 describe-instance-type-offerings \
    --location-type availability-zone \
    --filters "Name=instance-type,Values=$INSTANCE_TYPE" \
    --query 'InstanceTypeOfferings[].Location' --output text)

if [ -z "$SUPPORTED_AZS" ]; then
    echo "  ✗ $INSTANCE_TYPE no está disponible en ninguna AZ de $AWS_REGION"
    exit 1
fi

# Buscar primera subnet pública en una AZ soportada
SUBNET_ID=""
SUBNET_AZ=""
for AZ in $SUPPORTED_AZS; do
    CANDIDATE=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
                  "Name=map-public-ip-on-launch,Values=true" \
                  "Name=availability-zone,Values=$AZ" \
        --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
    if [ -n "$CANDIDATE" ] && [ "$CANDIDATE" != "None" ]; then
        SUBNET_ID="$CANDIDATE"
        SUBNET_AZ="$AZ"
        break
    fi
done

if [ -z "$SUBNET_ID" ]; then
    echo "  ✗ No se encontró subnet pública en ninguna AZ que soporte $INSTANCE_TYPE."
    exit 1
fi
echo "  ✓ Subnet: $SUBNET_ID ($SUBNET_AZ)"

# ---------------------------------------------------------------------------
# Paso 6: Verificar si la instancia ya existe
# ---------------------------------------------------------------------------
echo ""
echo "Paso 6: EC2 Instance..."

EXISTING_INSTANCE=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "None")

if [ "$EXISTING_INSTANCE" != "None" ] && [ -n "$EXISTING_INSTANCE" ]; then
    INSTANCE_ID="$EXISTING_INSTANCE"
    INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].State.Name' --output text)
    echo "  ✓ Instancia ya existe: $INSTANCE_ID (state=$INSTANCE_STATE)"
else
    # AMI: Amazon Linux 2023 más reciente
    AMI_ID=$(aws ssm get-parameter \
        --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
        --query 'Parameter.Value' --output text)
    echo "  ✓ AMI: $AMI_ID"

    # User-data: instala tools + clona repo + crea unit systemd + escribe .env
    # NO arranca el servicio (eso lo hace el primer deploy desde CI/CD)
    USER_DATA=$(cat <<EOF
#!/bin/bash
# NOTA: no usamos 'set -e' deliberadamente para que fallos en pasos no críticos
# (ej. LibreOffice bundle) no aborten el resto del setup.
set -uxo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

# Espera a que la red esté lista
sleep 5

# Espera a que cloud-init / dnf liberen su lock (común en boot)
for i in 1 2 3 4 5 6 7 8 9 10; do
    pgrep -x dnf >/dev/null || break
    echo "Esperando a que dnf libere lock (intento \$i)..."
    sleep 5
done

# Paquetes del sistema disponibles en repos de Amazon Linux 2023.
# NO incluir 'curl' aquí: AL2023 trae curl-minimal y crea conflict si se
# intenta instalar curl completo.
dnf update -y || true

# Node.js 20 via NodeSource (el repo por defecto de AL2023 trae v18)
curl -sSL https://rpm.nodesource.com/setup_20.x | bash - || true
dnf install -y nodejs git ImageMagick unzip tar gzip || true

# X11 / fontconfig / cairo: dependencias runtime de LibreOffice incluso en headless.
# AL2023 minimal install no las trae; sin esto soffice falla con "libX*.so.1 not found".
dnf install -y libXinerama libSM libICE libX11 libX11-xcb libXrender \
               libXtst libXrandr libXcursor libXi libxcb libxslt \
               cairo cups-libs dbus-libs nss nss-util mesa-libGL \
               fontconfig liberation-fonts dejavu-sans-fonts || true

# LibreOffice NO está en repos de AL2023. Descargar bundle RPM oficial.
# Versión "stable" — verificar disponibilidad en https://download.documentfoundation.org/libreoffice/stable/
LO_VERSION="25.8.7"
LO_URL="https://download.documentfoundation.org/libreoffice/stable/\${LO_VERSION}/rpm/x86_64/LibreOffice_\${LO_VERSION}_Linux_x86-64_rpm.tar.gz"
cd /tmp
echo "Descargando LibreOffice \${LO_VERSION}..."
curl -sSL "\$LO_URL" -o lo.tar.gz || echo "ERROR: download LibreOffice"
tar -xzf lo.tar.gz || echo "ERROR: untar LibreOffice"
cd LibreOffice_*_Linux_x86-64_rpm/RPMS 2>/dev/null && {
    dnf install -y *.rpm || echo "ERROR: install LibreOffice rpms"
}
cd /tmp
rm -rf lo.tar.gz LibreOffice_*

# Symlink para que el binario soffice esté en PATH estándar
SOFFICE_BIN=\$(find /opt -name soffice -type f 2>/dev/null | head -1)
if [ -n "\$SOFFICE_BIN" ]; then
    ln -sf "\$SOFFICE_BIN" /usr/local/bin/soffice
    ln -sf "\$SOFFICE_BIN" /usr/local/bin/libreoffice
fi

# Crea directorio de la app
mkdir -p /opt/switchfile-worker
chown ec2-user:ec2-user /opt/switchfile-worker

# Clona el repo (público, no requiere auth)
sudo -u ec2-user git clone https://github.com/saranda44/SwitchFile.git /opt/switchfile-worker

# Escribe .env del worker (las vars son conocidas; account_id viene de metadata)
ACCOUNT_ID=$ACCOUNT_ID
cat > /opt/switchfile-worker/worker/.env <<ENVEOF || true
AWS_REGION=$AWS_REGION
SQS_QUEUE_URL=$QUEUE_URL
S3_BUCKET_UPLOADS=$BUCKET_UPLOADS
S3_BUCKET_CONVERTED=$BUCKET_CONVERTED
DYNAMODB_TABLE_FILES=$TABLE_FILES
DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS
ENVEOF
chown ec2-user:ec2-user /opt/switchfile-worker/worker/.env 2>/dev/null || true

# Crea unit systemd (la app aún no existe; servicio se arranca después)
cat > /etc/systemd/system/switchfile-worker.service <<'UNITEOF'
[Unit]
Description=SwitchFile Conversion Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/switchfile-worker/worker
EnvironmentFile=/opt/switchfile-worker/worker/.env
ExecStart=/usr/bin/node /opt/switchfile-worker/worker/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/switchfile-worker.log
StandardError=append:/var/log/switchfile-worker.log

[Install]
WantedBy=multi-user.target
UNITEOF

touch /var/log/switchfile-worker.log
chown ec2-user:ec2-user /var/log/switchfile-worker.log
systemctl daemon-reload
systemctl enable switchfile-worker.service
# NO se inicia ahora: el primer deploy desde CI/CD lo arranca

echo "user-data completado a las \$(date)"
EOF
)

    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --subnet-id "$SUBNET_ID" \
        --security-group-ids "$SG_ID" \
        --iam-instance-profile "Name=$INSTANCE_PROFILE" \
        --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":$EBS_VOLUME_SIZE,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=SwitchFile}]" \
        --user-data "$USER_DATA" \
        --query 'Instances[0].InstanceId' --output text)
    echo "  ✓ Instancia lanzada: $INSTANCE_ID"
fi

# ---------------------------------------------------------------------------
# Paso 7: Esperar a que esté running y reportar
# ---------------------------------------------------------------------------
echo ""
echo "Paso 7: Esperando a que la instancia esté 'running'..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
echo "  ✓ Instance running"

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
PRIVATE_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PrivateIpAddress' --output text)

echo ""
echo "═══════════════════════════════════════"
echo "  ✓ Worker EC2 listo"
echo "═══════════════════════════════════════"
echo "  InstanceId:  $INSTANCE_ID"
echo "  PrivateIP:   $PRIVATE_IP"
echo "  PublicIP:    ${PUBLIC_IP:-N/A}"
echo "  SecurityGrp: $SG_ID"
echo "  Subnet:      $SUBNET_ID"
echo "═══════════════════════════════════════"
echo ""
echo "Siguientes pasos manuales:"
echo "  1. Actualizar GitHub Secret EC2_WORKER_INSTANCE_ID = $INSTANCE_ID"
echo "  2. Esperar ~2-3 min a que termine el user-data (instala tools + clona repo)"
echo "  3. Verificar con: aws ssm describe-instance-information --filters 'Key=InstanceIds,Values=$INSTANCE_ID'"
echo "  4. Mergear código del worker a main para el primer deploy automático"
