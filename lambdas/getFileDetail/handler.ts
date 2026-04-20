/**
 * GetFileDetail Handler — GET /files/{fileId}
 *
 * Retorna el detalle de una conversión específica.
 * Incluye el archivo fuente (sourceFile) y el archivo resultado (resultFile) si existe.
 */

import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent, extractPathParameter } from '../shared/utils/helpers';
import { getConversionById } from '../shared/queries/conversionQueries';
import { getFileById } from '../shared/queries/fileQueries';
import { extractConversionIdFromSK, extractFileIdFromSK } from '../shared/constants/awsResourceNames';
import { Conversion } from '../shared/types/Conversion';
import { File } from '../shared/types/File';

export async function handler(event: APIGatewayEvent) {
  console.log('[getFileDetail] Evento recibido:', JSON.stringify(event));

  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  const conversionId = extractPathParameter(event, 'fileId');
  if (!conversionId) {
    return createErrorResponse(400, 'MISSING_PARAM', 'fileId es requerido');
  }

  const conversion = await getConversionById(userId, conversionId);
  if (!conversion) {
    return createErrorResponse(404, 'NOT_FOUND', 'Conversión no encontrada');
  }

  const sourceFile = await getFileById(userId, conversion.sourceFileId);

  let resultFile = null;
  if (conversion.resultFileId) {
    resultFile = await getFileById(userId, conversion.resultFileId);
  }

  return createSuccessResponse(200, {
    conversion: formatConversion(conversion),
    sourceFile: sourceFile ? formatFile(sourceFile) : null,
    resultFile: resultFile ? formatFile(resultFile) : null,
  });
}

function formatConversion(conv: Conversion) {
  return {
    conversionId: extractConversionIdFromSK(conv.SK),
    sourceFileId: conv.sourceFileId,
    sourceFileName: conv.sourceFileName,
    ...(conv.resultFileId && { resultFileId: conv.resultFileId }),
    sourceFormat: conv.sourceFormat,
    targetFormat: conv.targetFormat,
    status: conv.status,
    createdAt: conv.createdAt,
    ...(conv.errorMessage && { errorMessage: conv.errorMessage }),
    ...(conv.completedAt && { completedAt: conv.completedAt }),
  };
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
