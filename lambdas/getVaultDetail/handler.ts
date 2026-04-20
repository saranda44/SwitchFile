/**
 * GetVaultDetail Handler — GET /vault/{fileId}
 *
 * Retorna el detalle de un archivo + todas sus conversiones asociadas.
 * Si el archivo es tipo "converted", incluye también el archivo original (sourceFile).
 * Si es tipo "original", sourceFile es null.
 */

import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent, extractPathParameter } from '../shared/utils/helpers';
import { getFileById } from '../shared/queries/fileQueries';
import { getConversionsByUserId } from '../shared/queries/conversionQueries';
import { extractFileIdFromSK, extractConversionIdFromSK } from '../shared/constants/awsResourceNames';
import { File } from '../shared/types/File';
import { Conversion } from '../shared/types/Conversion';

export async function handler(event: APIGatewayEvent) {
  console.log('[getVaultDetail] Evento recibido:', JSON.stringify(event));

  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  const fileId = extractPathParameter(event, 'fileId');
  if (!fileId) {
    return createErrorResponse(400, 'MISSING_PARAM', 'fileId es requerido');
  }

  // Buscar el archivo + todas las conversiones del usuario en paralelo
  const [file, allConversions] = await Promise.all([
    getFileById(userId, fileId),
    getConversionsByUserId(userId),
  ]);

  if (!file) {
    return createErrorResponse(404, 'FILE_NOT_FOUND', 'Archivo no encontrado');
  }

  // Filtrar conversiones asociadas a este archivo como origen O como resultado
  const relatedConversions = allConversions.filter(
    conv => conv.sourceFileId === fileId || conv.resultFileId === fileId
  );

  // Si es convertido, encontrar el archivo original
  let sourceFile: ReturnType<typeof formatFile> | null = null;

  if (file.type === 'converted') {
    const producingConversion = relatedConversions.find(conv => conv.resultFileId === fileId);
    if (producingConversion) {
      const sourceFileRecord = await getFileById(userId, producingConversion.sourceFileId);
      if (sourceFileRecord) {
        sourceFile = formatFile(sourceFileRecord);
      }
    }
  }

  return createSuccessResponse(200, {
    file: formatFile(file),
    conversions: relatedConversions.map(formatConversion),
    sourceFile,
  });
}

function formatFile(file: File) {
  return {
    fileId: extractFileIdFromSK(file.SK),
    fileName: file.fileName,
    format: file.format,
    fileSize: file.fileSize,
    type: file.type,
    createdAt: file.createdAt,
  };
}

function formatConversion(conv: Conversion) {
  return {
    conversionId: extractConversionIdFromSK(conv.SK),
    sourceFileId: conv.sourceFileId,
    ...(conv.resultFileId && { resultFileId: conv.resultFileId }),
    sourceFormat: conv.sourceFormat,
    targetFormat: conv.targetFormat,
    status: conv.status,
    createdAt: conv.createdAt,
    ...(conv.errorMessage && { errorMessage: conv.errorMessage }),
  };
}
