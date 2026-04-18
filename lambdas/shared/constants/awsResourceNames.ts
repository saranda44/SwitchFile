/**
 * Configuración de recursos AWS desde variables de ambiente
 */

/**
 * Configuración segura de variables de ambiente
 */
export const AWS_RESOURCES = {
  // DynamoDB Tablas
  DYNAMODB_TABLE_FILES: process.env.DYNAMODB_TABLE_FILES,
  DYNAMODB_TABLE_CONVERSIONS: process.env.DYNAMODB_TABLE_CONVERSIONS,
  
  // S3 Buckets
  S3_BUCKET_UPLOADS: process.env.S3_BUCKET_UPLOADS,
  S3_BUCKET_CONVERTED: process.env.S3_BUCKET_CONVERTED,
  
  // SQS
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,
  
  // Step Function
  STEP_FUNCTION_ARN: process.env.STEP_FUNCTION_ARN,
  
  // AWS Region
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
} as const;

/**
 * S3 - Rutas de prefijo para organizar archivos
 */
export const S3_PATHS = {
  UPLOADS: 'uploads',
  CONVERTED: 'converted',
} as const;

/**
 * S3 - Generar clave para archivo original
 */
export function generateS3UploadKey(userId: string, fileId: string, fileName: string): string {
  return `${S3_PATHS.UPLOADS}/${userId}/${fileId}/${fileName}`;
}

/**
 * S3 - Generar clave para archivo convertido
 */
export function generateS3ConvertedKey(
  userId: string,
  fileId: string,
  fileName: string
): string {
  return `${S3_PATHS.CONVERTED}/${userId}/${fileId}/${fileName}`;
}

/**
 * DynamoDB - Generar Primary Key para Files
 */
export function generateFilePK(userId: string): string {
  return `USER#${userId}`;
}

/**
 * DynamoDB - Generar Sort Key para Files
 */
export function generateFileSK(fileId: string): string {
  return `FILE#${fileId}`;
}

/**
 * DynamoDB - Generar Primary Key para Conversions
 */
export function generateConversionPK(userId: string): string {
  return `USER#${userId}`;
}

/**
 * DynamoDB - Generar Sort Key para Conversions
 */
export function generateConversionSK(timestamp: number, conversionId: string): string {
  return `CONV#${timestamp}#${conversionId}`;
}

/**
 * Extraer userId de PK
 */
export function extractUserIdFromPK(pk: string): string {
  return pk.replace('USER#', '');
}

/**
 * Extraer fileId de SK (Files)
 */
export function extractFileIdFromSK(sk: string): string {
  return sk.replace('FILE#', '');
}

/**
 * Extraer conversionId de SK (Conversions)
 */
export function extractConversionIdFromSK(sk: string): string {
  const parts = sk.split('#');
  return parts[parts.length - 1]; // El último elemento después de CONV#{timestamp}#
}

/**
 * Configuración de presigned URLs para S3
 */
export const PRESIGNED_URL_CONFIG = {
  DOWNLOAD_EXPIRATION: 24 * 60 * 60, // 24 horas en segundos
  UPLOAD_EXPIRATION: 1 * 60 * 60, // 1 hora en segundos
} as const;

/**
 * Configuración de timeouts
 */
export const TIMEOUTS = {
  // Lambda timeouts en milisegundos
  LAMBDA_DEFAULT: 30 * 1000, // 30 segundos
  LAMBDA_LONG: 120 * 1000, // 2 minutos
  
  // AWS SDK timeouts
  AWS_SDK_TIMEOUT: 30 * 1000, // 30 segundos
} as const;