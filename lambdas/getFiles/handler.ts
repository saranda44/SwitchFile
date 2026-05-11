/**
 * GetFiles Handler — GET /files
 *
 * Lista el historial de conversiones del usuario, ordenadas por más recientes.
 * Incluye sourceFileName para mostrar en el dashboard sin lookup extra.
 */

import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent } from '../shared/utils/helpers';
import { getConversionsByUserId } from '../shared/queries/conversionQueries';
import { extractConversionIdFromSK } from '../shared/constants/awsResourceNames';
import { Conversion } from '../shared/types/Conversion';

export async function handler(event: APIGatewayEvent) {
  console.log('[getFiles] Evento recibido:', JSON.stringify(event));

  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  const conversions = await getConversionsByUserId(userId);

  return createSuccessResponse(200, {
    conversions: conversions.map(formatConversion),
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
