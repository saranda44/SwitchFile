#!/bin/bash
# Elimina la cola SQS de SwitchFile en AWS

set -e
export AWS_PAGER=cat

QUEUE_NAME="${SQS_QUEUE_NAME:-switchfile-conversions-queue.fifo}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "═══════════════════════════════════════"
echo "  Eliminar Cola SQS"
echo "═══════════════════════════════════════"
echo ""
echo "Nombre: $QUEUE_NAME"
echo "Región: $AWS_REGION"
echo ""

QUEUE_URL=$(aws sqs get-queue-url \
    --queue-name "$QUEUE_NAME" \
    --region "$AWS_REGION" \
    --query 'QueueUrl' \
    --output text 2>/dev/null || true)

if [ -z "$QUEUE_URL" ] || [ "$QUEUE_URL" = "None" ]; then
    echo "La cola '$QUEUE_NAME' no existe. Nada que eliminar."
    exit 0
fi

echo "Queue URL: $QUEUE_URL"
echo ""
echo -n "Eliminando cola... "

aws sqs delete-queue \
    --queue-url "$QUEUE_URL" \
    --region "$AWS_REGION"

echo "✓"
echo ""
echo "═══════════════════════════════════════"
echo "✓ Cola SQS eliminada correctamente"
echo "═══════════════════════════════════════"
