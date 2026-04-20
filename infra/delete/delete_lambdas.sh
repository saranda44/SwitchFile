#!/bin/bash
# Elimina las lambdas de SwitchFile en AWS Lambda

set -e
export AWS_PAGER=cat

LAMBDA_PREFIX="switchfile"
AWS_REGION="${AWS_REGION:-us-east-1}"

LAMBDA_NAMES="registerDB enqueueSQS getFiles getFileDetail getVault getVaultDetail download upload reconvert"

echo "═══════════════════════════════════════"
echo "  Eliminar Lambdas de AWS"
echo "═══════════════════════════════════════"
echo ""

DELETED=0
SKIPPED=0

for FUNC_NAME in $LAMBDA_NAMES; do
    FULL_NAME="$LAMBDA_PREFIX-$FUNC_NAME"

    if aws lambda get-function --function-name "$FULL_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo -n " Eliminando $FULL_NAME... "
        aws lambda delete-function \
            --function-name "$FULL_NAME" \
            --region "$AWS_REGION"
        echo "✓"
        DELETED=$((DELETED + 1))
    else
        echo "  Saltando $FULL_NAME: no existe"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo ""
echo "═══════════════════════════════════════"
echo "  Resumen"
echo "═══════════════════════════════════════"
echo "  Eliminadas: $DELETED"
echo "  Saltadas:   $SKIPPED"
echo "  Total:      $((DELETED + SKIPPED))"
echo "═══════════════════════════════════════"
echo ""
echo "✓ Eliminación completada"
