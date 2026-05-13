#!/bin/bash
set -e

export AWS_PAGER=cat

TOPIC_NAME="${SNS_TOPIC_NAME:-switchfile-notifications}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "═══════════════════════════════════════"
echo "  Creando topic SNS"
echo "═══════════════════════════════════════"
echo ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EXPECTED_ARN="arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:${TOPIC_NAME}"

EXISTING_ARN=$(aws sns list-topics \
    --region "$AWS_REGION" \
    --query "Topics[?TopicArn=='$EXPECTED_ARN'].TopicArn | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_ARN" ] && [ "$EXISTING_ARN" != "None" ]; then
    TOPIC_ARN="$EXISTING_ARN"
    echo "  Topic ya existe"
else
    TOPIC_ARN=$(aws sns create-topic \
        --name "$TOPIC_NAME" \
        --region "$AWS_REGION" \
        --query 'TopicArn' \
        --output text)

    echo "  ✓ Topic creado"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  SNS listo"
echo "═══════════════════════════════════════"
echo ""
echo "  Topic ARN: $TOPIC_ARN"
