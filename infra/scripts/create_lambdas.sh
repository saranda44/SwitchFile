#!/bin/bash
# create_lambdas.sh — Crea/actualiza lambdas en AWS Lambda 

set -e
export AWS_PAGER=cat

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$INFRA_DIR/.." && pwd)"
LAMBDAS_DIR="$ROOT_DIR/lambdas"
PACKAGES_DIR="$ROOT_DIR/packages"

LAMBDA_PREFIX="switchfile"
STATE_MACHINE_NAME="SwitchFileStateMachine"
AWS_REGION="${AWS_REGION:-us-east-1}"
RUNTIME="nodejs22.x"
HANDLER_SUFFIX="handler.handler"
TIMEOUT="30"
MEMORY="256"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Nombres de recursos
TABLE_FILES="${DYNAMODB_TABLE_FILES:-switchfile-files}"
TABLE_CONVERSIONS="${DYNAMODB_TABLE_CONVERSIONS:-switchfile-conversions}"
BUCKET_UPLOADS="${S3_BUCKET_UPLOADS:-switchfile-uploads-${ACCOUNT_ID}}"
BUCKET_CONVERTED="${S3_BUCKET_CONVERTED:-switchfile-converted-${ACCOUNT_ID}}"
SQS_QUEUE_NAME="${SQS_QUEUE_NAME:-switchfile-conversions-queue.fifo}"

echo "═══════════════════════════════════════"
echo "  Deploy Lambdas to AWS"
echo "═══════════════════════════════════════"
echo ""

# Obtener rol ARN (Learner Lab)
echo "Detectando entorno AWS..."
ROLE_ARN=$(aws iam get-role --role-name SwitchFileRole --query 'Role.Arn' --output text 2>/dev/null) || true

if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" = "None" ]; then
    echo "  No se encontró rol 'SwitchFileRole'."
    echo ""
    echo "Opciones:"
    echo "  1. Asegúrate de estar en AWS Learner Lab"
    echo "  2. O exporta: export LAMBDA_ROLE_ARN='arn:aws:iam::...'"
    echo ""
    echo "Continuando: Solo actualizaremos lambdas existentes"
    echo ""
    CREATE_MODE=false
else
    CREATE_MODE=true
    echo "✓ Rol encontrado: $ROLE_ARN"
    echo ""
fi

# Resolver URL de la cola SQS
echo "Resolviendo recursos AWS..."
SQS_QUEUE_URL=$(aws sqs get-queue-url \
    --queue-name "$SQS_QUEUE_NAME" \
    --region "$AWS_REGION" \
    --query 'QueueUrl' \
    --output text 2>/dev/null || true)

if [ -z "$SQS_QUEUE_URL" ] || [ "$SQS_QUEUE_URL" = "None" ]; then
    echo "  ADVERTENCIA: Cola SQS '$SQS_QUEUE_NAME' no encontrada"
    SQS_QUEUE_URL=""
else
    echo "✓ SQS URL resuelta"
fi

# Resolver ARN del Step Function
if [ -z "$STEP_FUNCTION_ARN" ]; then
    STEP_FUNCTION_ARN=$(aws stepfunctions list-state-machines \
        --region "$AWS_REGION" \
        --query "stateMachines[?name=='$STATE_MACHINE_NAME'].stateMachineArn" \
        --output text 2>/dev/null || true)

    if [ -z "$STEP_FUNCTION_ARN" ] || [ "$STEP_FUNCTION_ARN" = "None" ]; then
        echo "  ADVERTENCIA: Step Function '$STATE_MACHINE_NAME' no encontrada"
        STEP_FUNCTION_ARN=""
    else
        echo "✓ Step Function ARN resuelto"
    fi
else
    echo "✓ STEP_FUNCTION_ARN recibido del entorno"
fi
echo ""

# ---------------------------------------------------------------------------
# Lista explícita de lambdas a desplegar
# ---------------------------------------------------------------------------
LAMBDA_NAMES="registerDB enqueueSQS getFiles getFileDetail getVault getVaultDetail download upload reconvert"

echo "Procesando lambdas..."
echo ""

CREATED=0
UPDATED=0
SKIPPED=0

for FUNC_NAME in $LAMBDA_NAMES; do
    FULL_NAME="$LAMBDA_PREFIX-$FUNC_NAME"
    ZIP_FILE="$PACKAGES_DIR/$FUNC_NAME.zip"
    HANDLER="$FUNC_NAME/$HANDLER_SUFFIX"

    # Variables de entorno por lambda según los servicios que usa
    case "$FUNC_NAME" in
        registerDB)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS}"
            ;;
        enqueueSQS)
            ENV_VARS="Variables={SQS_QUEUE_URL=$SQS_QUEUE_URL}"
            ;;
        getFiles)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,S3_BUCKET_CONVERTED=$BUCKET_CONVERTED,S3_BUCKET_UPLOADS=$BUCKET_UPLOADS}"
            ;;
        getFileDetail)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,S3_BUCKET_CONVERTED=$BUCKET_CONVERTED,S3_BUCKET_UPLOADS=$BUCKET_UPLOADS}"
            ;;
        getVault)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,S3_BUCKET_CONVERTED=$BUCKET_CONVERTED,S3_BUCKET_UPLOADS=$BUCKET_UPLOADS}"
            ;;
        getVaultDetail)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,S3_BUCKET_CONVERTED=$BUCKET_CONVERTED,S3_BUCKET_UPLOADS=$BUCKET_UPLOADS}"
            ;;
        download)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,S3_BUCKET_CONVERTED=$BUCKET_CONVERTED,S3_BUCKET_UPLOADS=$BUCKET_UPLOADS}"
            ;;
        upload)
            ENV_VARS="Variables={S3_BUCKET_UPLOADS=$BUCKET_UPLOADS,STEP_FUNCTION_ARN=$STEP_FUNCTION_ARN,DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS}"
            ;;
        reconvert)
            ENV_VARS="Variables={DYNAMODB_TABLE_FILES=$TABLE_FILES,DYNAMODB_TABLE_CONVERSIONS=$TABLE_CONVERSIONS,STEP_FUNCTION_ARN=$STEP_FUNCTION_ARN}"
            ;;
        *)
            ENV_VARS=""
            ;;
    esac

    # Validar que el ZIP existe
    if [ ! -f "$ZIP_FILE" ]; then
        echo "  Saltando $FULL_NAME: ZIP no encontrado"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Verificar si la lambda ya existe
    if aws lambda get-function --function-name "$FULL_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
        # Lambda existe: actualizar
        echo -n " Actualizando $FULL_NAME... "
        
        aws lambda update-function-code \
            --function-name "$FULL_NAME" \
            --zip-file "fileb://$ZIP_FILE" \
            --region "$AWS_REGION" > /dev/null 2>&1

        aws lambda wait function-updated \
            --function-name "$FULL_NAME" \
            --region "$AWS_REGION"

        UPDATE_CONFIG_CMD="aws lambda update-function-configuration \
            --function-name \"$FULL_NAME\" \
            --runtime \"$RUNTIME\" \
            --handler \"$HANDLER\" \
            --timeout \"$TIMEOUT\" \
            --memory-size \"$MEMORY\" \
            --region \"$AWS_REGION\""

        if [ -n "$ENV_VARS" ]; then
            UPDATE_CONFIG_CMD="$UPDATE_CONFIG_CMD --environment \"$ENV_VARS\""
        fi

        eval "$UPDATE_CONFIG_CMD" > /dev/null 2>&1

        echo "✓"
        UPDATED=$((UPDATED + 1))
    else
        # Lambda no existe: crear
        if [ "$CREATE_MODE" = false ]; then
            echo "  Saltando $FULL_NAME: No existe y no hay rol para crear"
            SKIPPED=$((SKIPPED + 1))
            continue
        fi

        echo -n " Creando $FULL_NAME... "

        CREATE_CMD="aws lambda create-function \
            --function-name \"$FULL_NAME\" \
            --runtime \"$RUNTIME\" \
            --role \"$ROLE_ARN\" \
            --handler \"$HANDLER\" \
            --zip-file \"fileb://$ZIP_FILE\" \
            --timeout \"$TIMEOUT\" \
            --memory-size \"$MEMORY\" \
            --region \"$AWS_REGION\""

        if [ -n "$ENV_VARS" ]; then
            CREATE_CMD="$CREATE_CMD --environment \"$ENV_VARS\""
        fi

        eval "$CREATE_CMD" > /dev/null 2>&1

        echo "✓"
        CREATED=$((CREATED + 1))
    fi
done

echo ""
echo "═══════════════════════════════════════"
echo "  Resumen del Despliegue"
echo "═══════════════════════════════════════"
echo "  Creadas:      $CREATED"
echo "  Actualizadas: $UPDATED"
echo "  Saltadas:     $SKIPPED"
echo "  Total:        $((CREATED + UPDATED + SKIPPED))"
echo "═══════════════════════════════════════"
echo ""

if [ $((CREATED + UPDATED)) -eq 0 ]; then
    echo "  No se realizó ningún cambio"
    exit 1
fi

echo "✓ Despliegue completado"