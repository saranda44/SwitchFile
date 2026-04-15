import type { FileCategory } from '../../shared/types';

// Estructura de un archivo extraído de un ZIP
export interface ExtractedFile {
  fileName: string;
  fileBuffer: Buffer;
  fileSize: number;
  mimeType: string;
  format: string;
  category: FileCategory;
}

// Resultado de la validación de un archivo
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  format?: string;
  category?: FileCategory;
  mimeType?: string;
}

// Resultado del procesamiento de un archivo (simple o ZIP)
export interface ProcessingResult {
  success: boolean;
  conversionId?: string;
  batchId?: string;
  message: string;
  error?: string;
  filesProcessed?: number;
}

// Respuesta de Lambda hacia el frontend
export interface UploadResponse {
  success: boolean;
  conversionId?: string;
  batchId?: string;
  message: string;
  error?: string;
}