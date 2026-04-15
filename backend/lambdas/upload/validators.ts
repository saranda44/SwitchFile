import type { ValidationResult, ExtractedFile } from './types';
import type { FileCategory } from '../../shared/types';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS, ZIP_SIZE_LIMIT } from '../../shared/constants';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Valida que el MIME type sea soportado
 */
export function isValidMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES;
}

/**
 * Obtiene la extensión de un MIME type
 */
export function getFormatFromMimeType(mimeType: string): string | null {
  if (!isValidMimeType(mimeType)) return null;
  const extensions = ALLOWED_MIME_TYPES[mimeType].extensions;
  return extensions[0]; // Devuelve la primera extensión
}

/**
 * Obtiene la categoría de un MIME type
 */
export function getCategoryFromMimeType(mimeType: string): FileCategory | null {
  if (!isValidMimeType(mimeType)) return null;
  return ALLOWED_MIME_TYPES[mimeType].category;
}

/**
 * Valida un archivo individual (tamaño + formato)
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string
): ValidationResult {
  // Validar MIME type
  if (!isValidMimeType(mimeType)) {
    return {
      isValid: false,
      error: `MIME type no soportado: ${mimeType}`,
    };
  }

  const format = getFormatFromMimeType(mimeType);
  const category = getCategoryFromMimeType(mimeType);

  if (!format || !category) {
    return {
      isValid: false,
      error: 'No se pudo determinar el formato o categoría del archivo',
    };
  }

  // Validar tamaño
  const limit = FILE_SIZE_LIMITS[category];
  if (fileSize > limit) {
    return {
      isValid: false,
      error: `Archivo demasiado grande. Límite para ${category}: ${limit / (1024 * 1024)}MB`,
    };
  }

  return {
    isValid: true,
    fileSize,
    format,
    category,
    mimeType,
  };
}

/**
 * Valida un archivo ZIP (solo el tamaño total)
 */
export function validateZipFile(fileSize: number): ValidationResult {
  if (fileSize > ZIP_SIZE_LIMIT) {
    return {
      isValid: false,
      error: `ZIP demasiado grande. Límite: ${ZIP_SIZE_LIMIT / (1024 * 1024)}MB`,
    };
  }

  return {
    isValid: true,
    fileSize,
  };
}

/**
 * Detecta si un archivo es ZIP basándose en su MIME type
 */
export function isZipFile(mimeType: string): boolean {
  return (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-zip-compressed' ||
    mimeType === 'application/octet-stream' // Algunos navegadores envían esto para ZIP
  );
}

/**
 * Valida un archivo extraído de un ZIP
 */
export function validateExtractedFile(file: ExtractedFile): ValidationResult {
  return validateFile(file.fileName, file.fileSize, file.mimeType);
}

/**
 * Sanitiza el nombre del archivo (previene path traversal)
 */
export function sanitizeFileName(fileName: string): string {
  // Elimina caracteres peligrosos
  return fileName
    .replace(/\0/g, '') // Null bytes
    .replace(/\.\./g, '') // Path traversal
    .replace(/[\/\\]/g, '') // Slashes
    .replace(/[<>:"|?*]/g, '') // Caracteres inválidos en Windows
    .trim();
}

/**
 * Valida el MIME type por magic bytes (no confía en Content-Type del header)
 */
export async function validateMimeTypeByMagicBytes(
  fileBuffer: Buffer,
  declaredMimeType: string
): Promise<{ isValid: boolean; actualMimeType?: string; error?: string }> {
  try {
    const detectedType = await fileTypeFromBuffer(fileBuffer);

    if (!detectedType) {
      return {
        isValid: false,
        error: 'No se pudo determinar el tipo de archivo por magic bytes',
      };
    }

    // Verifica que el MIME type detectado sea soportado
    if (!isValidMimeType(detectedType.mime)) {
      return {
        isValid: false,
        error: `Tipo de archivo detectado no soportado: ${detectedType.mime}`,
        actualMimeType: detectedType.mime,
      };
    }

    return {
      isValid: true,
      actualMimeType: detectedType.mime,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Error al validar magic bytes: ${error}`,
    };
  }
}