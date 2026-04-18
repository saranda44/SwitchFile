/**
 * Validadores de Formato y Archivo
 * Incluye:
 * - Validación temprana de tamaño (antes de cargar en memoria)
 * - Sanitización de nombre de archivo (prevención de path traversal)
 * - Validación de magic bytes + extensión (usando file-type)
 * - Validación de conversión y formato soportado
 */

import { fromBuffer } from 'file-type';
import mime from 'mime-types';
import {
  isFormatSupported,
  isSupportedConversion,
  getFileExtension,
  normalizeFormat,
} from '../constants/formats';
import {
  getFileSizeLimit
} from '../constants/limits';

/**
 * Validar tamaño de archivo o ZIP ANTES de cargar en memoria
 */
export function validateFileSize(
  fileSizeBytes: number,
  format: string
): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = getFileSizeLimit(format);

  if (fileSizeBytes > maxSize) {
    return {
      isValid: false,
      error: 'Archivo demasiado grande',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizar nombre de archivo
 */
export function sanitizeFileName(fileName: string): {
  sanitized: string;
  isValid: boolean;
  error?: string;
} {
  if (!fileName || fileName.trim().length === 0) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Nombre de archivo vacío',
    };
  }

  // Detectar intentos de path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Nombre de archivo contiene caracteres no permitidos (../, \\)',
    };
  }

  // Remover caracteres especiales peligrosos, mantener solo alfanuméricos + . - _
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._\-]/g, '_') // Reemplazar caracteres especiales
    .replace(/^\.+/, '') // Remover puntos al inicio
    .slice(0, 255); // Limitar longitud

  // Validar que no quedó vacío después de sanitizar
  if (sanitized.length === 0) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Nombre de archivo inválido después de sanitizar',
    };
  }

  return {
    sanitized,
    isValid: true,
  };
}

/**
 * Validar magic bytes usando file-type
 * Detecta el tipo real del archivo independientemente de la extensión
 */
export async function validateMagicBytes(
  fileBuffer: Buffer,
  expectedFormat: string
): Promise<{
  isValid: boolean;
  detectedFormat?: string;
  mimeType?: string;
  error?: string;
}> {
  const format = normalizeFormat(expectedFormat);

  try {
    // file-type detecta automáticamente el tipo basado en magic bytes
    const fileTypeResult = await fromBuffer(fileBuffer);

    if (!fileTypeResult) {
      return {
        isValid: false,
        error: `No se pudo detectar el tipo de archivo.`,
      };
    }

    const detectedFormat = fileTypeResult.ext?.toLowerCase();
    const mimeType = fileTypeResult.mime;

    // Validar que el formato detectado coincide con la extensión
    if (detectedFormat !== format) {
      // Algunos formatos tienen aliases, permitimos si el mime coincide
      const expectedMimeType = mime.lookup(expectedFormat);
      if (mimeType !== expectedMimeType) {
        return {
          isValid: false,
          detectedFormat,
          error: `Tipo de archivo detectado (${detectedFormat}) no coincide con la extensión (${format})`,
        };
      }
    }

    return {
      isValid: true,
      detectedFormat: detectedFormat || format,
      mimeType,
    };
  } catch (error) {
    console.error('[Magic Bytes] Error al validar:', error);
    return {
      isValid: false,
      error: 'Error al validar el tipo de archivo',
    };
  }
}

/**
 * Validar extensión de archivo
 */
export function validateFileExtension(fileName: string): {
  isValid: boolean;
  format?: string;
  mimeType?: string;
  error?: string;
} {
  const format = getFileExtension(fileName);

  if (!format) {
    return {
      isValid: false,
      error: 'Archivo sin extensión válida',
    };
  }

  if (!isFormatSupported(format)) {
    return {
      isValid: false,
      error: 'Formato de archivo no válido',
    };
  }

  // Obtener MIME type de la extensión
  const mimeType = mime.lookup(format) || `application/${format}`;

  return {
    isValid: true,
    format,
    mimeType: mimeType.toString(),
  };
}

/**
 * Validar que la conversión es soportada
 */
export function validateConversionSupported(
  sourceFormat: string,
  targetFormat: string
): {
  isValid: boolean;
  error?: string;
} {
  const source = normalizeFormat(sourceFormat);
  const target = normalizeFormat(targetFormat);

  // No permitir convertir al mismo formato
  if (source === target) {
    return {
      isValid: false,
      error: `No se puede convertir al mismo formato: ${target}`,
    };
  }

  if (!isSupportedConversion(source, target)) {
    return {
      isValid: false,
      error: 'Conversión no soportada',
    };
  }

  return { isValid: true };
}

/**
 * Validación completa de archivo
 * Combina: tamaño, extensión, magic bytes, conversión
 */
export async function validateFileComplete(
  fileName: string,
  fileSizeBytes: number,
  fileBuffer: Buffer,
  targetFormat: string
): Promise<{
  isValid: boolean;
  format?: string;
  mimeType?: string;
  sanitizedFileName?: string;
  errors: string[];
}> {
  const errors: string[] = [];

  // 1. Sanitizar nombre
  const sanitization = sanitizeFileName(fileName);
  if (!sanitization.isValid) {
    errors.push(sanitization.error || 'Nombre de archivo no válido');
  }

  // 2. Validar extensión
  const extensionValidation = validateFileExtension(fileName);
  if (!extensionValidation.isValid) {
    errors.push(extensionValidation.error || 'Formato de archivo no válido');
  }
  const format = extensionValidation.format;
  const mimeType = extensionValidation.mimeType;

  // 3. Validar tamaño temprano
  if (format) {
    const sizeValidation = validateFileSize(fileSizeBytes, format);
    if (!sizeValidation.isValid) {
      errors.push(sizeValidation.error || 'Archivo demasiado grande');
    }
  }

  // 4. Validar magic bytes usando file-type
  if (format && fileBuffer && fileBuffer.length > 0) {
    const magicValidation = await validateMagicBytes(fileBuffer, format);
    if (!magicValidation.isValid) {
      errors.push(magicValidation.error || 'Tipo de archivo no válido');
    }
  }

  // 5. Validar conversión
  if (format && targetFormat) {
    const conversionValidation = validateConversionSupported(format, targetFormat);
    if (!conversionValidation.isValid) {
      errors.push(conversionValidation.error || 'Conversión no soportada');
    }
  }

  return {
    isValid: errors.length === 0,
    format,
    mimeType,
    sanitizedFileName: sanitization.sanitized,
    errors,
  };
}

/**
 * Validar si es archivo ZIP
 */
export async function isZipFile(fileBuffer: Buffer): Promise<boolean> {
  try {
    const fileTypeResult = await fromBuffer(fileBuffer);
    return fileTypeResult?.ext?.toLowerCase() === 'zip';
  } catch {
    return false;
  }
}