/**
 * GetVault Handler — GET /vault
 *
 * Lista todos los archivos del usuario (originales y convertidos)
 * con metadata de preview para mostrar en la Bóveda.
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent } from '../shared/utils/helpers';
import { getFilesByUserId } from '../shared/queries/fileQueries';
import { getS3Client } from '../shared/connections/s3Client';
import { AWS_RESOURCES, PRESIGNED_URL_CONFIG } from '../shared/constants/awsResourceNames';
import { extractFileIdFromSK } from '../shared/constants/awsResourceNames';
import { File } from '../shared/types/File';

// Formatos que el navegador puede previsualizar directamente (inline)
const BROWSER_PREVIEW_FORMATS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
  'mp3', 'wav', 'ogg', 'aac',
  'mp4', 'webm',
  'pdf', 'txt', 'csv', 'html',
]);

export async function handler(event: APIGatewayEvent) {
  console.log('[getVault] Evento recibido:', JSON.stringify(event));

  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  if (!AWS_RESOURCES.S3_BUCKET_UPLOADS || !AWS_RESOURCES.S3_BUCKET_CONVERTED) {
    return createErrorResponse(500, 'CONFIG_ERROR', 'Buckets S3 no configurados');
  }

  // Traer todos los archivos del usuario desde DynamoDB
  const files = await getFilesByUserId(userId);

  // Generar presigned URLs de preview para cada archivo
  const filesWithPreview = [];
  for (const file of files) {
    filesWithPreview.push(await buildFileWithPreview(file));
  }

  return createSuccessResponse(200, { files: filesWithPreview });
}

// Función auxiliar para construir la metadata de cada archivo con su URL de preview (si es soportado) o icono fallback
async function buildFileWithPreview(file: File) {
  const fileId = extractFileIdFromSK(file.SK);
  const format = file.format.toLowerCase();
  const isPreviewSupported = BROWSER_PREVIEW_FORMATS.has(format);

  const base = {
    fileId,
    fileName: file.fileName,
    format: file.format,
    fileSize: file.fileSize,
    type: file.type,
    createdAt: file.createdAt,
  };

  if (!isPreviewSupported) {
    // Formatos no soportados por el navegador: retornar icono fallback sin generar URL
    return {
      ...base,
      preview: {
        type: format,
        isSupported: false,
        fallbackIcon: `${format}-icon.svg`,
      },
    };
  }

  // Generar presigned URL de 1 hora para preview inline (no descarga)
  const bucket = file.type === 'converted'
    ? AWS_RESOURCES.S3_BUCKET_CONVERTED!
    : AWS_RESOURCES.S3_BUCKET_UPLOADS!;

  const url = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: bucket, Key: file.s3Key }),
    { expiresIn: PRESIGNED_URL_CONFIG.UPLOAD_EXPIRATION }, // 1 hora
  );

  return {
    ...base,
    preview: {
      url,
      type: format,
      isSupported: true,
    },
  };
}
