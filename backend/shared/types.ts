// Tipos de archivo
export type FileCategory = 'images' | 'audio' | 'video' | 'documents';

// Evento que llega a Lambda desde API Gateway
export interface UploadEvent {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  targetFormat: string;
}

// Metadata de archivo en DynamoDB (tabla Files)
export interface FileRecord {
  PK: string; // USER#{user_id}
  SK: string; // FILE#{file_id}
  fileName: string;
  format: string;
  fileSize: number;
  s3Key: string;
  type: 'original' | 'converted';
  batchId?: string; // para agrupar conversiones en lote
  createdAt: string;
}

// Registro de conversión en DynamoDB (tabla Conversions)
export interface ConversionRecord {
  PK: string; // USER#{user_id}
  SK: string; // CONV#{timestamp}#{conversion_id}
  sourceFileId: string;
  resultFileId?: string;
  sourceFormat: string;
  targetFormat: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  batchId?: string; // para agrupar conversiones en lote
  createdAt: string;
}

// Mensaje que se encola en SQS
export interface SQSConversionMessage {
  conversionId: string;
  userId: string;
  sourceFileId: string;
  sourceFormat: string;
  targetFormat: string;
  s3Key: string;
  batchId?: string; // Para conversiones en lote (ZIP)
}



// Metadata de archivo en ZIP
export interface ZipFileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  format: string;
}