#!/bin/bash

# Buckets a eliminar
BUCKETS=(
  "switchfile-frontend"
  "switchfile-uploads"
  "switchfile-converted"
)

# Primero se vacían (requisito de S3)
for bucket in "${BUCKETS[@]}"; do
  echo "Vaciando $bucket..."

  # Elimina todos los objetos dentro del bucket
  aws s3 rm "s3://$bucket" --recursive

  echo "Eliminando $bucket..."

  # Elimina el bucket una vez vacío
  aws s3api delete-bucket --bucket "$bucket"
done

echo "Los Buckets han sido eliminados"