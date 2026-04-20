/**
 * Validadores de IDs
 * Valida el formato y estructura de IDs del sistema
 */

import { randomUUID } from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidValidate = (id: string) => UUID_REGEX.test(id);

/**
 * Validar userId desde Cognito
 * userId viene como 'sub' en el JWT
 */
export function validateUserId(userId: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!userId) {
    return {
      isValid: false,
      error: 'ID de usuario no proporcionado',
    };
  }

  // Validar que no está vacío y tiene longitud razonable
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return {
      isValid: false,
      error: 'ID de usuario no proporcionado',
    };
  }

  return { isValid: true };
}

/**
 * Validar fileId (debe ser UUID v4)
 */
export function validateFileId(fileId: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!fileId) {
    return {
      isValid: false,
      error: 'ID de archivo no proporcionado',
    };
  }

  if (!uuidValidate(fileId)) {
    return {
      isValid: false,
      error: 'ID de archivo inválido. Debe ser un UUID válido.',
    };
  }

  return { isValid: true };
}

/**
 * Validar batchId (debe ser UUID v4)
 */
export function validateBatchId(batchId: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!batchId) {
    return {
      isValid: false,
      error: 'ID de lote no proporcionado',
    };
  }

  if (!uuidValidate(batchId)) {
    return {
      isValid: false,
      error: 'ID de lote inválido. Debe ser un UUID válido.',
    };
  }

  return { isValid: true };
}

/**
 * Generar nuevo UUID v4 para fileId, conversionId, batchId
 */
export function generateNewId(): string {
  return randomUUID();
}
