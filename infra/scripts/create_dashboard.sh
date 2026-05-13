#!/bin/bash
# create_dashboard.sh — Crea/actualiza el dashboard CloudWatch SwitchFile-Operations
# con 6 widgets en 3 filas (grilla de 24 columnas).
#
# Idempotente: put-dashboard reemplaza el dashboard por nombre.

set -e
export AWS_PAGER=cat

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-us-east-1}"

WORKER_INSTANCE_ID="${WORKER_INSTANCE_ID:-i-02652ab4cd8953ac5}"
BUCKET_UPLOADS="${BUCKET_UPLOADS:-switchfile-uploads-${ACCOUNT_ID}}"
BUCKET_CONVERTED="${BUCKET_CONVERTED:-switchfile-converted-${ACCOUNT_ID}}"
UPLOAD_LAMBDA_LOG_GROUP="${UPLOAD_LAMBDA_LOG_GROUP:-/aws/lambda/switchfile-upload}"
DASHBOARD_NAME="${DASHBOARD_NAME:-SwitchFile-Operations}"

echo "═══════════════════════════════════════"
echo "  Creando dashboard CloudWatch"
echo "═══════════════════════════════════════"
echo "  Nombre:   $DASHBOARD_NAME"
echo "  Región:   $AWS_REGION"
echo "  Worker:   $WORKER_INSTANCE_ID"
echo "═══════════════════════════════════════"
echo ""

TMP_JSON=$(mktemp /tmp/switchfile-dashboard.XXXXXX.json)
cat > "$TMP_JSON" <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/EC2", "CPUUtilization", "InstanceId", "$WORKER_INSTANCE_ID" ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "CPU del Worker (%)",
        "period": 300,
        "stat": "Average",
        "annotations": {
          "horizontal": [
            { "label": "Alarma 80%", "value": 80, "color": "#d62728" }
          ]
        }
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/S3", "BucketSizeBytes", "BucketName", "$BUCKET_UPLOADS",    "StorageType", "StandardStorage" ],
          [ "AWS/S3", "BucketSizeBytes", "BucketName", "$BUCKET_CONVERTED", "StorageType", "StandardStorage" ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "Almacenamiento S3 por bucket (bytes)",
        "period": 86400,
        "stat": "Average"
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "SwitchFile", "ConversionDuration", "Category", "Image" ],
          [ "SwitchFile", "ConversionDuration", "Category", "Document" ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "Tiempo de conversión por categoría (ms)",
        "period": 60,
        "stat": "Average"
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "SwitchFile", "ConversionCount", "Status", "success", "Category", "Image" ],
          [ "SwitchFile", "ConversionCount", "Status", "success", "Category", "Document" ],
          [ "SwitchFile", "ConversionCount", "Status", "failed",  "Category", "Image" ],
          [ "SwitchFile", "ConversionCount", "Status", "failed",  "Category", "Document" ]
        ],
        "view": "bar",
        "stacked": true,
        "region": "$AWS_REGION",
        "title": "Completadas vs fallidas",
        "period": 300,
        "stat": "Sum"
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 12, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "SwitchFile", "ConversionCount", "Status", "success", "Category", "Image",    { "label": "Image OK" } ],
          [ "SwitchFile", "ConversionCount", "Status", "success", "Category", "Document", { "label": "Document OK" } ]
        ],
        "view": "singleValue",
        "region": "$AWS_REGION",
        "title": "Conversiones exitosas (últimas 24h)",
        "period": 86400,
        "stat": "Sum"
      }
    },
    {
      "type": "log",
      "x": 12, "y": 12, "width": 12, "height": 6,
      "properties": {
        "query": "SOURCE '$UPLOAD_LAMBDA_LOG_GROUP'\n| filter @message like /\\\\[Upload\\\\] userId=/\n| parse @message \"userId=*\" as userId\n| stats count_distinct(userId) as ActiveUsers",
        "region": "$AWS_REGION",
        "title": "Usuarios activos (rango del dashboard) — desde logs de upload Lambda",
        "view": "table"
      }
    }
  ]
}
EOF

python3 -m json.tool "$TMP_JSON" >/dev/null || {
    echo "✗ JSON inválido"
    cat "$TMP_JSON"
    rm -f "$TMP_JSON"
    exit 1
}
echo "  ✓ JSON válido"

aws cloudwatch put-dashboard \
    --region "$AWS_REGION" \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "file://$TMP_JSON" >/dev/null

echo "  ✓ Dashboard '$DASHBOARD_NAME' creado/actualizado"
rm -f "$TMP_JSON"

echo ""
echo "═══════════════════════════════════════"
echo "  ✓ Dashboard listo"
echo "═══════════════════════════════════════"
echo ""
echo "Verlo en consola:"
echo "  https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
echo ""
echo "Widgets:"
echo "  1. CPU del Worker (línea con referencia 80%)"
echo "  2. Almacenamiento S3 por bucket (línea, diario)"
echo "  3. Tiempo por categoría (línea, Image vs Document)"
echo "  4. Completadas vs fallidas (barras apiladas)"
echo "  5. Conversiones exitosas 24h (número)"
echo "  6. Usuarios activos (Logs Insights sobre /aws/lambda/switchfile-upload)"
echo ""
echo "Nota: las métricas custom (ConversionDuration, ConversionCount) van a"
echo "estar vacías hasta que el worker procese al menos una conversión."
