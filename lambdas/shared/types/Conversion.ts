/**
 * Interfaz Conversion - Representa una conversión en la tabla Conversions de DynamoDB
 */
export interface Conversion {
  // Primary Key
  PK: string; // USER#{user_id}
  SK: string; // CONV#{timestamp}#{conversion_id}

  // Atributos principales
  sourceFileId: string; // FILE#{file_id} del archivo original
  sourceFileName: string; // Nombre del archivo original (desnormalizado para evitar lookup extra)
  resultFileId?: string; // FILE#{file_id} del archivo convertido (opcional hasta que se complete)
  sourceFormat: string; // Formato original (mp4, pdf, png, etc.)
  targetFormat: string; // Formato destino (mp3, docx, jpg, etc.)
  status: ConversionStatus; // pending | processing | completed | failed
  isBatch: boolean; // Si es parte de un lote
  createdAt: string; // ISO 8601 timestamp
  
  // Atributos opcionales
  errorMessage?: string; // Mensaje de error si status = failed
  batchId?: string; // ID del lote si es isBatch=true
  completedAt?: string; // ISO 8601 timestamp cuando se completó
}

/**
 * Estados posibles de una conversión
 */
export type ConversionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * DTO para crear una nueva Conversion (sin PK, SK, createdAt)
 */
export interface CreateConversionInput {
  sourceFileId: string;
  sourceFileName: string;
  sourceFormat: string;
  targetFormat: string;
  isBatch: boolean;
  batchId?: string;
}

/**
 * DTO para actualizar el status de una Conversion
 */
export interface UpdateConversionStatusInput {
  status: ConversionStatus;
  errorMessage?: string;
  completedAt?: string;
}

/**
 * DTO para respuesta de Conversion
 */
export interface ConversionResponse extends Conversion {
  conversionId: string; // Extraído de SK (CONV#{timestamp}#{conversionId})
  userId: string; // Extraído de PK (USER#{userId})
}