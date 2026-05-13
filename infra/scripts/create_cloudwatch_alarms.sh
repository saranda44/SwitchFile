#!/bin/bash
# create_cloudwatch_alarms.sh — Crea alarmas operativas para SwitchFile
# que notifican al topic SNS switchfile-alerts.
#
# Alarmas:
#   1. SwitchFile-SlowConversion-Image    — ConversionDuration > 2 min para Category=Image
#   2. SwitchFile-SlowConversion-Document — ConversionDuration > 3 min para Category=Document
#   3. SwitchFile-HighCPU                 — CPUUtilization > 80% sostenido 10 min
#
# Idempotente: aws cloudwatch put-metric-alarm reemplaza si la alarma ya existe.

set -e
export AWS_PAGER=cat

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-us-east-1}"
ALERTS_TOPIC_NAME="${ALERTS_TOPIC_NAME:-switchfile-alerts}"
ALERTS_TOPIC_ARN="arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:${ALERTS_TOPIC_NAME}"
WORKER_INSTANCE_ID="${WORKER_INSTANCE_ID:-i-02652ab4cd8953ac5}"

echo "═══════════════════════════════════════"
echo "  Creando CloudWatch Alarms"
echo "═══════════════════════════════════════"
echo "  Topic SNS:  $ALERTS_TOPIC_ARN"
echo "  EC2 worker: $WORKER_INSTANCE_ID"
echo "═══════════════════════════════════════"
echo ""

# Verifica que el topic exista antes de referenciarlo
aws sns get-topic-attributes --topic-arn "$ALERTS_TOPIC_ARN" >/dev/null 2>&1 || {
    echo "✗ Topic SNS no existe: $ALERTS_TOPIC_ARN"
    echo "  Correr primero: bash infra/scripts/create_sns_alerts.sh"
    exit 1
}

# ---------------------------------------------------------------------------
# Alarma 1: SlowConversion-Image (>2 min en cualquier conversión de imagen)
# ---------------------------------------------------------------------------
echo "Alarma 1/3: SwitchFile-SlowConversion-Image..."
aws cloudwatch put-metric-alarm \
    --region "$AWS_REGION" \
    --alarm-name "SwitchFile-SlowConversion-Image" \
    --alarm-description "Alguna conversión de imagen tardó más de 2 minutos." \
    --metric-name ConversionDuration \
    --namespace SwitchFile \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 120000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Category,Value=Image \
    --alarm-actions "$ALERTS_TOPIC_ARN" \
    --ok-actions "$ALERTS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --unit Milliseconds
echo "  ✓ Creada (threshold: 120000 ms / 2 min)"

# ---------------------------------------------------------------------------
# Alarma 2: SlowConversion-Document (>3 min)
# ---------------------------------------------------------------------------
echo ""
echo "Alarma 2/3: SwitchFile-SlowConversion-Document..."
aws cloudwatch put-metric-alarm \
    --region "$AWS_REGION" \
    --alarm-name "SwitchFile-SlowConversion-Document" \
    --alarm-description "Alguna conversión de documento tardó más de 3 minutos." \
    --metric-name ConversionDuration \
    --namespace SwitchFile \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 180000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Category,Value=Document \
    --alarm-actions "$ALERTS_TOPIC_ARN" \
    --ok-actions "$ALERTS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --unit Milliseconds
echo "  ✓ Creada (threshold: 180000 ms / 3 min)"

# ---------------------------------------------------------------------------
# Alarma 3: HighCPU (>80% sostenido 10 min)
# AWS/EC2 CPUUtilization se publica cada 5 min por basic monitoring.
# 2 períodos × 300s = 10 min sostenidos. 'breaching' si no hay data sería raro.
# ---------------------------------------------------------------------------
echo ""
echo "Alarma 3/3: SwitchFile-HighCPU..."
aws cloudwatch put-metric-alarm \
    --region "$AWS_REGION" \
    --alarm-name "SwitchFile-HighCPU" \
    --alarm-description "CPU del worker EC2 sobre 80% sostenido por 10 minutos." \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value="$WORKER_INSTANCE_ID" \
    --alarm-actions "$ALERTS_TOPIC_ARN" \
    --ok-actions "$ALERTS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --unit Percent
echo "  ✓ Creada (threshold: 80%, 2 períodos × 5 min = 10 min sostenidos)"

echo ""
echo "═══════════════════════════════════════"
echo "  ✓ 3 alarmas configuradas"
echo "═══════════════════════════════════════"
echo ""
echo "Estados esperados (estado inicial):"
echo "  - SlowConversion-*: INSUFFICIENT_DATA o OK hasta que el worker procese una conversión"
echo "  - HighCPU: OK (CPU del worker idle es ~1%)"
echo ""
echo "Verificar:"
echo "  aws cloudwatch describe-alarms --alarm-name-prefix SwitchFile"
echo ""
echo "Probar (forzar disparo manual de SlowConversion-Image):"
echo "  aws cloudwatch set-alarm-state \\"
echo "    --alarm-name SwitchFile-SlowConversion-Image \\"
echo "    --state-value ALARM \\"
echo "    --state-reason 'Test from create_cloudwatch_alarms.sh'"
