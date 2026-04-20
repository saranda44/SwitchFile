/**
 * Interfaz File - Representa un archivo en la tabla Files de DynamoDB
 */
export interface File {
  // Primary Key
  PK: string; // USER#{user_id}
  SK: string; // FILE#{file_id}

  // Atributos principales
  fileName: string; // Nombre original del archivo
  format: string; // Formato del archivo (mp4, pdf, png, etc.)
  fileSize: number; // Tamaño en bytes
  s3Key: string; // Ruta completa en S3
  type: FileType; // "original" o "converted"
  isBatch: boolean; // Si es parte de un lote (ZIP)
  createdAt: string; // ISO 8601 timestamp

  // Atributos opcionales
  batchId?: string; // ID del lote si es isBatch=true
}

/**
 * Tipos posibles para el campo type
 */
export type FileType = 'original' | 'converted';

/**
 * DTO para crear un nuevo File (sin PK, SK, createdAt)
 */
export interface CreateFileInput {
  fileName: string;
  format: string;
  fileSize: number;
  s3Key: string;
  type: FileType;
  isBatch: boolean;
  batchId?: string;
}

/**
 * DTO para respuesta de File
 */
export interface FileResponse extends File {
  fileId: string; // Extraído de SK (FILE#{fileId})
  userId: string; // Extraído de PK (USER#{userId})
}