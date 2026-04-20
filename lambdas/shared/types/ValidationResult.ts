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
  fileId?: string;   // ID del archivo en la DB se crea al subir a S3, se agrega en el paso Register DB
  fileFormat: string; // Extensión/formato (mp4, pdf, png, etc.)
  fileBuffer: Buffer; // Contenido del archivo en memoria (para subir a S3)
  fileSize: number; // Tamaño en bytes
  targetFormat: string; // Solo se permite un formato destino
  isBatch: boolean; // Si es parte de un lote
}
