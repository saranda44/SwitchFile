#!/bin/bash
# create_sns_alerts.sh — Topic SNS para alarmas operativas + suscripción por email.
# El topic 'switchfile-notifications' (creado por create_sns.sh) es para usuarios.
# Éste es para el equipo: recibe avisos de CloudWatch Alarms.

set -e

export AWS_PAGER=cat

TOPIC_NAME="${ALERTS_TOPIC_NAME:-switchfile-alerts}"
AWS_REGION="${AWS_REGION:-us-east-1}"
# Email subscriber (puede ser overrideado con env var; multi-email separar por coma)
SUBSCRIBE_EMAILS="${SWITCHFILE_ALERT_EMAILS:-luis.gonzaleze@iteso.mx}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EXPECTED_ARN="arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:${TOPIC_NAME}"

echo "═══════════════════════════════════════"
echo "  Creando topic SNS de alertas"
echo "═══════════════════════════════════════"
echo ""

# ---------------------------------------------------------------------------
# Paso 1: Topic
# ---------------------------------------------------------------------------
EXISTING_ARN=$(aws sns list-topics \
    --region "$AWS_REGION" \
    --query "Topics[?TopicArn=='$EXPECTED_ARN'].TopicArn | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_ARN" ] && [ "$EXISTING_ARN" != "None" ]; then
    TOPIC_ARN="$EXISTING_ARN"
    echo "  ✓ Topic ya existe"
else
    TOPIC_ARN=$(aws sns create-topic \
        --name "$TOPIC_NAME" \
        --region "$AWS_REGION" \
        --query 'TopicArn' \
        --output text)
    echo "  ✓ Topic creado"
fi

# ---------------------------------------------------------------------------
# Paso 2: Subscripciones por email (idempotente)
# ---------------------------------------------------------------------------
echo ""
echo "Suscripciones por email..."

# Lista de subscripciones existentes
EXISTING_SUBS=$(aws sns list-subscriptions-by-topic \
    --topic-arn "$TOPIC_ARN" \
    --query 'Subscriptions[?Protocol==`email`].Endpoint' \
    --output text 2>/dev/null || true)

IFS=',' read -ra EMAIL_ARRAY <<< "$SUBSCRIBE_EMAILS"
for EMAIL in "${EMAIL_ARRAY[@]}"; do
    EMAIL_TRIMMED=$(echo "$EMAIL" | xargs)  # trim whitespace

    if echo "$EXISTING_SUBS" | tr ' ' '\n' | grep -qFx "$EMAIL_TRIMMED"; then
        echo "  ✓ $EMAIL_TRIMMED ya está suscrito"
    else
        aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol email \
            --notification-endpoint "$EMAIL_TRIMMED" \
            --region "$AWS_REGION" >/dev/null
        echo "  ✓ $EMAIL_TRIMMED suscrito (estado: PendingConfirmation)"
        echo "    ⚠ Revisar bandeja de entrada y clickar el link de AWS Notifications"
    fi
done

echo ""
echo "═══════════════════════════════════════"
echo "  SNS Alerts listo"
echo "═══════════════════════════════════════"
echo "  Topic ARN: $TOPIC_ARN"
echo ""
echo "Una vez confirmados los emails, este topic es el destino de:"
echo "  - Alarmas CloudWatch (SlowConversion-*, HighCPU)"
echo "  - Cualquier alerta operativa del equipo"
