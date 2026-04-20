#!/bin/bash
# Elimina la Step Function de SwitchFile en AWS

set -e
export AWS_PAGER=cat

STATE_MACHINE_NAME="SwitchFileStateMachine"
REGION="${AWS_REGION:-us-east-1}"

echo "═══════════════════════════════════════"
echo "  Eliminar Step Function"
echo "═══════════════════════════════════════"
echo ""
echo "Nombre: $STATE_MACHINE_NAME"
echo "Región: $REGION"
echo ""

STATE_MACHINE_ARN=$(aws stepfunctions list-state-machines \
    --region "$REGION" \
    --query "stateMachines[?name=='$STATE_MACHINE_NAME'].stateMachineArn" \
    --output text 2>/dev/null || true)

if [ -z "$STATE_MACHINE_ARN" ] || [ "$STATE_MACHINE_ARN" = "None" ]; then
    echo "La Step Function '$STATE_MACHINE_NAME' no existe. Nada que eliminar."
    exit 0
fi

echo "ARN: $STATE_MACHINE_ARN"
echo ""
echo -n "Eliminando Step Function... "

aws stepfunctions delete-state-machine \
    --state-machine-arn "$STATE_MACHINE_ARN" \
    --region "$REGION"

echo "✓"
echo ""
echo "═══════════════════════════════════════"
echo "✓ Step Function eliminada correctamente"
echo "═══════════════════════════════════════"
