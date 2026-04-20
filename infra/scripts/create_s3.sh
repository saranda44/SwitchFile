#!/bin/bash
set -e

export AWS_PAGER=cat

AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

BUCKET_UPLOADS="${S3_BUCKET_UPLOADS:-switchfile-uploads-${ACCOUNT_ID}}"
BUCKET_CONVERTED="${S3_BUCKET_CONVERTED:-switchfile-converted-${ACCOUNT_ID}}"

CORS_UPLOADS='{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'

CORS_CONVERTED='{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'

echo "═══════════════════════════════════════"
echo "  Creando buckets S3"
echo "═══════════════════════════════════════"
echo ""

CREATED=0

EXISTING_BUCKETS=$(aws s3api list-buckets --query 'Buckets[].Name' --output text --region "$AWS_REGION")

for BUCKET in "$BUCKET_UPLOADS" "$BUCKET_CONVERTED"; do
    echo -n "  $BUCKET... "

    if echo "$EXISTING_BUCKETS" | grep -qw "$BUCKET"; then
        echo "ya existe"
    else
        aws s3 mb "s3://$BUCKET" --region "$AWS_REGION" > /dev/null 2>&1
        echo "✓ creado"
        CREATED=$((CREATED + 1))
    fi
done

echo ""
echo "Configurando CORS..."

aws s3api put-bucket-cors \
    --bucket "$BUCKET_UPLOADS" \
    --cors-configuration "$CORS_UPLOADS" \
    --region "$AWS_REGION"
echo "  ✓ CORS configurado en $BUCKET_UPLOADS"

aws s3api put-bucket-cors \
    --bucket "$BUCKET_CONVERTED" \
    --cors-configuration "$CORS_CONVERTED" \
    --region "$AWS_REGION"
echo "  ✓ CORS configurado en $BUCKET_CONVERTED"

echo ""
echo "═══════════════════════════════════════"
echo "  Buckets S3 listos"
echo "═══════════════════════════════════════"
echo ""
echo "  Uploads:   s3://$BUCKET_UPLOADS"
echo "  Converted: s3://$BUCKET_CONVERTED"
