/**
 * Interfaz ValidationResult - Resultado de la validación de archivo(s)
 */
export interface ValidationResult {
    isValid: boolean; // ¿Pasó todas las validaciones?
    isBatch: boolean; // ¿Es un ZIP o archivo individual?
    fileCount: number; // Cantidad de archivos validados
    errors: ValidationError[]; // Array de errores (vacío si isValid=true)
    files?: ValidatedFile[]; // Información de los archivos validados
}

/**
 * Error de validación individual
 */
export interface ValidationError {
  code: string; // Código del error (INVALID_FORMAT, FILE_TOO_LARGE, etc.)
  message: string; // Mensaje legible del error
  fileName?: string; // Nombre del archivo que falló (si aplica)
  details?: Record<string, any>; // Detalles adicionales del error
}

/**
 * Información de un archivo validado exitosamente
 */
export interface ValidatedFile {
  fileName: string; // Nombre original del archivo
  fileFormat: string; // Extensión/formato (mp4, pdf, png, etc.)
  fileBuffer: Buffer; // Contenido del archivo en memoria (para subir a S3)
  fileSize: number; // Tamaño en bytes
  targetFormat: string; // Solo se permite un formato destino
  isBatch: boolean; // Si es parte de un lote
}

/**
 * Códigos de error de validación
 */
export enum ValidationErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  BATCH_TOO_LARGE = 'BATCH_TOO_LARGE',
  INVALID_TARGET_FORMAT = 'INVALID_TARGET_FORMAT',
  UNSUPPORTED_CONVERSION = 'UNSUPPORTED_CONVERSION',
  INVALID_ZIP = 'INVALID_ZIP',
  EMPTY_ZIP = 'EMPTY_ZIP',
  NO_FILES = 'NO_FILES',
}