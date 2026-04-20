#!/bin/bash

# Región AWS donde se crearán los buckets
REGION="us-east-1"

# Lista de buckets definidos en la arquitectura
BUCKETS=(
  "switchfile-frontend"
  "switchfile-uploads"
  "switchfile-converted"
)

# Itera sobre cada bucket y lo crea
for bucket in "${BUCKETS[@]}"; do
  echo "Creando $bucket..."

  # create-bucket requiere configuración explícita de región
  aws s3api create-bucket \
    --bucket "$bucket" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"

done

echo "Todos los buckets han sido creados"