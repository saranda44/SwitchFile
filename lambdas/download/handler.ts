/**
 * Download Handler — GET /download/{fileId}
 *
 * Genera una presigned URL de S3 válida por 24h para que el cliente
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent, extractPathParameter } from '../shared/utils/helpers';
import { getFileById } from '../shared/queries/fileQueries';
import { getS3Client } from '../shared/connections/s3Client';
import { AWS_RESOURCES, PRESIGNED_URL_CONFIG } from '../shared/constants/awsResourceNames';

export async function handler(event: APIGatewayEvent) {
  console.log('[download] Evento recibido:', JSON.stringify(event));

  // Extraer userId del JWT
  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  // Extraer fileId del path /download/{fileId}
  const fileId = extractPathParameter(event, 'fileId');
  if (!fileId) {
    return createErrorResponse(400, 'MISSING_PARAM', 'fileId es requerido');
  }

  // Buscar el archivo en DynamoDB para verificar que pertenece al usuario y obtener su s3Key
  const file = await getFileById(userId, fileId);
  if (!file) {
    return createErrorResponse(404, 'FILE_NOT_FOUND', 'Archivo no encontrado');
  }

  // Determinar el bucket según el tipo de archivo
  const bucket = file.type === 'converted'
    ? AWS_RESOURCES.S3_BUCKET_CONVERTED
    : AWS_RESOURCES.S3_BUCKET_UPLOADS;

  if (!bucket) {
    return createErrorResponse(500, 'CONFIG_ERROR', 'Bucket S3 no configurado');
  }

  // Generar presigned URL con expiración de 24h
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: file.s3Key,
    ResponseContentDisposition: `attachment; filename="${file.fileName}"`,
  });

  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_URL_CONFIG.DOWNLOAD_EXPIRATION,
  });

  return createSuccessResponse(200, {
    url,
    fileName: file.fileName,
    format: file.format,
    fileSize: file.fileSize,
    expiresIn: PRESIGNED_URL_CONFIG.DOWNLOAD_EXPIRATION,
  });
}
