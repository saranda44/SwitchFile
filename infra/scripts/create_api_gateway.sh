#!/bin/bash
set -e

export AWS_PAGER=cat

API_NAME="${API_NAME:-SwitchFileAPI}"
LAMBDA_PREFIX="${LAMBDA_PREFIX:-switchfile}"
COGNITO_POOL_NAME="${COGNITO_POOL_NAME:-SwitchFileUserPool}"
COGNITO_CLIENT_NAME="${COGNITO_CLIENT_NAME:-SwitchFileWebClient}"
AWS_REGION="${AWS_REGION:-us-east-1}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "═══════════════════════════════════════"
echo "  Creando API Gateway HTTP API"
echo "═══════════════════════════════════════"
echo ""

if [ -z "$USER_POOL_ID" ]; then
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 60 \
        --region "$AWS_REGION" \
        --query "UserPools[?Name=='$COGNITO_POOL_NAME'].Id | [0]" \
        --output text 2>/dev/null || true)

    if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "None" ]; then
        echo "  Error: No se encontró el User Pool '$COGNITO_POOL_NAME'"
        echo "  Ejecuta create_cognito.sh primero"
        exit 1
    fi
fi

if [ -z "$CLIENT_ID" ]; then
    CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" \
        --query "UserPoolClients[?ClientName=='$COGNITO_CLIENT_NAME'].ClientId | [0]" \
        --output text 2>/dev/null || true)

    if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "None" ]; then
        echo "  Error: No se encontró el App Client '$COGNITO_CLIENT_NAME'"
        exit 1
    fi
fi

ISSUER="https://cognito-idp.$AWS_REGION.amazonaws.com/$USER_POOL_ID"

echo "  User Pool: $USER_POOL_ID"
echo "  Client:    $CLIENT_ID"
echo "  Issuer:    $ISSUER"
echo ""

EXISTING_API_ID=$(aws apigatewayv2 get-apis \
    --region "$AWS_REGION" \
    --query "Items[?Name=='$API_NAME'].ApiId | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_API_ID" ] && [ "$EXISTING_API_ID" != "None" ]; then
    API_ID="$EXISTING_API_ID"
    echo "  API ya existe: $API_ID"
else
    API_ID=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --cors-configuration '{"AllowOrigins":["*"],"AllowMethods":["GET","POST","OPTIONS"],"AllowHeaders":["Content-Type","Authorization"],"MaxAge":3600}' \
        --region "$AWS_REGION" \
        --query 'ApiId' \
        --output text)

    echo "  ✓ API creada: $API_ID"
fi

EXISTING_STAGE=$(aws apigatewayv2 get-stages \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query "Items[?StageName=='\$default'].StageName | [0]" \
    --output text 2>/dev/null || true)

if [ -z "$EXISTING_STAGE" ] || [ "$EXISTING_STAGE" = "None" ]; then
    aws apigatewayv2 create-stage \
        --api-id "$API_ID" \
        --stage-name '$default' \
        --auto-deploy \
        --region "$AWS_REGION" > /dev/null 2>&1
    echo "  ✓ Stage \$default creado"
else
    echo "  Stage \$default ya existe"
fi

EXISTING_AUTH_ID=$(aws apigatewayv2 get-authorizers \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query "Items[?Name=='CognitoAuth'].AuthorizerId | [0]" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_AUTH_ID" ] && [ "$EXISTING_AUTH_ID" != "None" ]; then
    AUTHORIZER_ID="$EXISTING_AUTH_ID"
    echo "  Authorizer ya existe: $AUTHORIZER_ID"
else
    AUTHORIZER_ID=$(aws apigatewayv2 create-authorizer \
        --api-id "$API_ID" \
        --authorizer-type JWT \
        --identity-source '$request.header.Authorization' \
        --name CognitoAuth \
        --jwt-configuration "Issuer=$ISSUER,Audience=$CLIENT_ID" \
        --region "$AWS_REGION" \
        --query 'AuthorizerId' \
        --output text)

    echo "  ✓ Authorizer creado: $AUTHORIZER_ID"
fi

echo ""
echo "Configurando rutas..."
echo ""

ROUTES="POST /upload:upload
GET /files:getFiles
GET /files/{fileId}:getFileDetail
GET /download/{fileId}:download
GET /vault:getVault
GET /vault/{fileId}:getVaultDetail
POST /vault/{fileId}/reconvert:reconvert"

EXISTING_ROUTES=$(aws apigatewayv2 get-routes \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query 'Items[].RouteKey' \
    --output text 2>/dev/null || true)

CREATED=0
SKIPPED=0

echo "$ROUTES" | while IFS=: read -r ROUTE_KEY FUNC_NAME; do
    FULL_NAME="${LAMBDA_PREFIX}-${FUNC_NAME}"
    echo -n "  $ROUTE_KEY → $FULL_NAME... "

    if echo "$EXISTING_ROUTES" | grep -qF "$ROUTE_KEY"; then
        echo "ya existe"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    LAMBDA_ARN=$(aws lambda get-function \
        --function-name "$FULL_NAME" \
        --region "$AWS_REGION" \
        --query 'Configuration.FunctionArn' \
        --output text 2>/dev/null || true)

    if [ -z "$LAMBDA_ARN" ] || [ "$LAMBDA_ARN" = "None" ]; then
        echo "Lambda no encontrada"
        continue
    fi

    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id "$API_ID" \
        --integration-type AWS_PROXY \
        --integration-uri "$LAMBDA_ARN" \
        --payload-format-version 2.0 \
        --region "$AWS_REGION" \
        --query 'IntegrationId' \
        --output text)

    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "$ROUTE_KEY" \
        --target "integrations/$INTEGRATION_ID" \
        --authorization-type JWT \
        --authorizer-id "$AUTHORIZER_ID" \
        --region "$AWS_REGION" > /dev/null 2>&1

    STMT_ID="apigw-$(echo "$FUNC_NAME" | tr '/' '-')"

    aws lambda remove-permission \
        --function-name "$FULL_NAME" \
        --statement-id "$STMT_ID" \
        --region "$AWS_REGION" 2>/dev/null || true

    aws lambda add-permission \
        --function-name "$FULL_NAME" \
        --statement-id "$STMT_ID" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" \
        --region "$AWS_REGION" > /dev/null 2>&1

    echo "✓"
    CREATED=$((CREATED + 1))
done

API_ENDPOINT=$(aws apigatewayv2 get-api \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query 'ApiEndpoint' \
    --output text)

echo ""
echo "═══════════════════════════════════════"
echo "  API Gateway listo"
echo "═══════════════════════════════════════"
echo ""
echo "  API ID:   $API_ID"
echo "  Endpoint: $API_ENDPOINT"
echo ""
echo "  Rutas:"
aws apigatewayv2 get-routes \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query 'Items[].RouteKey' \
    --output text | tr '\t' '\n' | sed 's/^/    /'
