#!/bin/bash
set -e

export AWS_PAGER=cat

POOL_NAME="${COGNITO_POOL_NAME:-SwitchFileUserPool}"
CLIENT_NAME="${COGNITO_CLIENT_NAME:-SwitchFileWebClient}"
AWS_REGION="${AWS_REGION:-us-east-1}"

PASSWORD_POLICY='{
  "MinimumLength": 8,
  "RequireUppercase": true,
  "RequireLowercase": true,
  "RequireNumbers": true,
  "RequireSymbols": false
}'

echo "═══════════════════════════════════════"
echo "  Creando Cognito User Pool"
echo "═══════════════════════════════════════"
echo ""

EXISTING_POOL_ID=$(aws cognito-idp list-user-pools \
    --max-results 60 \
    --region "$AWS_REGION" \
    --query "UserPools[?Name=='$POOL_NAME'].Id | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_POOL_ID" ] && [ "$EXISTING_POOL_ID" != "None" ]; then
    USER_POOL_ID="$EXISTING_POOL_ID"
    echo "  User Pool ya existe: $USER_POOL_ID"
else
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name "$POOL_NAME" \
        --auto-verified-attributes email \
        --username-attributes email \
        --policies "{\"PasswordPolicy\": $PASSWORD_POLICY}" \
        --schema '[{"Name":"email","Required":true,"Mutable":true}]' \
        --region "$AWS_REGION" \
        --query 'UserPool.Id' \
        --output text)

    echo "  ✓ User Pool creado: $USER_POOL_ID"
fi

echo ""
echo "Verificando App Client..."

EXISTING_CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION" \
    --query "UserPoolClients[?ClientName=='$CLIENT_NAME'].ClientId | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_CLIENT_ID" ] && [ "$EXISTING_CLIENT_ID" != "None" ]; then
    CLIENT_ID="$EXISTING_CLIENT_ID"
    echo "  App Client ya existe: $CLIENT_ID"
else
    CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --user-pool-id "$USER_POOL_ID" \
        --client-name "$CLIENT_NAME" \
        --no-generate-secret \
        --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH \
        --region "$AWS_REGION" \
        --query 'UserPoolClient.ClientId' \
        --output text)

    echo "  ✓ App Client creado: $CLIENT_ID"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  Cognito listo"
echo "═══════════════════════════════════════"
echo ""
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID:    $CLIENT_ID"
echo "  Región:       $AWS_REGION"
echo ""
echo "  Issuer URL: https://cognito-idp.$AWS_REGION.amazonaws.com/$USER_POOL_ID"
