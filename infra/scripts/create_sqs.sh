#!/bin/bash
set -e

export AWS_PAGER=cat

QUEUE_NAME="${SQS_QUEUE_NAME:-switchfile-conversions-queue.fifo}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Retención de mensajes: 7 días (segundos)
MESSAGE_RETENTION=604800
# Tiempo de visibilidad: 5 minutos (segundos) — tiempo máximo para procesar una conversión
VISIBILITY_TIMEOUT=300
# Tiempo de espera para long polling
RECEIVE_WAIT_TIME=20

echo "═══════════════════════════════════════"
echo "  Creando cola SQS"
echo "═══════════════════════════════════════"
echo ""
echo "Nombre:   $QUEUE_NAME"
echo "Región:   $AWS_REGION"
echo ""

# Verificar si la cola ya existe
EXISTING_URL=$(aws sqs get-queue-url \
    --queue-name "$QUEUE_NAME" \
    --region "$AWS_REGION" \
    --query 'QueueUrl' \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_URL" ] && [ "$EXISTING_URL" != "None" ]; then
    echo "La cola ya existe, actualizando atributos..."

    aws sqs set-queue-attributes \
        --queue-url "$EXISTING_URL" \
        --attributes "MessageRetentionPeriod=$MESSAGE_RETENTION,VisibilityTimeout=$VISIBILITY_TIMEOUT,ReceiveMessageWaitTimeSeconds=$RECEIVE_WAIT_TIME" \
        --region "$AWS_REGION"

    QUEUE_URL="$EXISTING_URL"
    echo "✓ Atributos actualizados"
else
    echo "Creando cola SQS..."

    QUEUE_URL=$(aws sqs create-queue \
        --queue-name "$QUEUE_NAME" \
        --attributes "FifoQueue=true,MessageRetentionPeriod=$MESSAGE_RETENTION,VisibilityTimeout=$VISIBILITY_TIMEOUT,ReceiveMessageWaitTimeSeconds=$RECEIVE_WAIT_TIME" \
        --region "$AWS_REGION" \
        --query 'QueueUrl' \
        --output text)

    echo "✓ Cola creada"
fi

# Obtener el ARN de la cola
QUEUE_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text \
    --region "$AWS_REGION")

echo ""
echo "═══════════════════════════════════════"
echo "  Cola SQS lista"
echo "═══════════════════════════════════════"
echo ""
echo "Queue URL: $QUEUE_URL"
echo "Queue ARN: $QUEUE_ARN"

