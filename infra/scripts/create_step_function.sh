#!/bin/bash
set -e

export AWS_PAGER=cat

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$INFRA_DIR/.." && pwd)"

STATE_MACHINE_NAME="SwitchFileStateMachine"
STATE_MACHINE_FILE="$INFRA_DIR/state_machines/switchfile_state_machine.json"
REGION="${AWS_REGION:-$(aws configure get region)}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "═══════════════════════════════════════"
echo "  Creando Step Function"
echo "═══════════════════════════════════════"
echo ""

# Obtener Role ARN (Learner Lab)
ROLE_ARN=$(aws iam get-role --role-name SwitchFileRole --query 'Role.Arn' --output text)

# Reemplazar $AWS_ACCOUNT en el archivo con la cuenta real
DEFINITION=$(sed "s/\$AWS_ACCOUNT/$ACCOUNT_ID/g" "$STATE_MACHINE_FILE")

echo "Nombre:  $STATE_MACHINE_NAME"
echo "Región:  $REGION"
echo "Role:    $ROLE_ARN"
echo "Account: $ACCOUNT_ID"
echo ""

# Verificar si ya existe para actualizar en vez de crear
EXISTING_ARN=$(aws stepfunctions list-state-machines \
    --region "$REGION" \
    --query "stateMachines[?name=='$STATE_MACHINE_NAME'].stateMachineArn" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_ARN" ] && [ "$EXISTING_ARN" != "None" ]; then
    echo "Ya existe, actualizando definición..."

    aws stepfunctions update-state-machine \
        --state-machine-arn "$EXISTING_ARN" \
        --definition "$DEFINITION" \
        --role-arn "$ROLE_ARN" \
        --region "$REGION" > /dev/null

    STATE_MACHINE_ARN="$EXISTING_ARN"
    echo "✓ Step Function actualizada"
else
    echo "Creando Step Function..."

    STATE_MACHINE_ARN=$(aws stepfunctions create-state-machine \
        --name "$STATE_MACHINE_NAME" \
        --definition "$DEFINITION" \
        --role-arn "$ROLE_ARN" \
        --region "$REGION" \
        --query 'stateMachineArn' \
        --output text)

    echo "✓ Step Function creada"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  Step Function lista"
echo "═══════════════════════════════════════"
echo ""
echo "State Machine ARN: $STATE_MACHINE_ARN"
echo ""
