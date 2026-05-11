#!/bin/bash
set -e

export AWS_PAGER=cat

TABLE_FILES="${DYNAMODB_TABLE_FILES:-switchfile-files}"
TABLE_CONVERSIONS="${DYNAMODB_TABLE_CONVERSIONS:-switchfile-conversions}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "═══════════════════════════════════════"
echo "  Creando tablas DynamoDB"
echo "═══════════════════════════════════════"
echo ""

for TABLE_NAME in "$TABLE_FILES" "$TABLE_CONVERSIONS"; do
    echo -n "  $TABLE_NAME... "

    EXISTING_STATUS=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --query 'Table.TableStatus' \
        --output text 2>/dev/null || true)

    if [ -n "$EXISTING_STATUS" ] && [ "$EXISTING_STATUS" != "None" ]; then
        echo "ya existe ($EXISTING_STATUS)"
    else
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions \
                AttributeName=PK,AttributeType=S \
                AttributeName=SK,AttributeType=S \
            --key-schema \
                AttributeName=PK,KeyType=HASH \
                AttributeName=SK,KeyType=RANGE \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" > /dev/null 2>&1

        echo "✓ creada"
    fi
done

echo ""
echo "Esperando a que las tablas estén activas..."

for TABLE_NAME in "$TABLE_FILES" "$TABLE_CONVERSIONS"; do
    aws dynamodb wait table-exists \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" 2>/dev/null || true
    echo "  ✓ $TABLE_NAME ACTIVE"
done

echo ""
echo "═══════════════════════════════════════"
echo "  Tablas DynamoDB listas"
echo "═══════════════════════════════════════"
echo ""
echo "  Files:       $TABLE_FILES"
echo "  Conversions: $TABLE_CONVERSIONS"
