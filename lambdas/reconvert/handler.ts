/**
 * Reconvert Handler — POST /vault/{fileId}/reconvert
 *
 * Encola una nueva conversión reutilizando un archivo que ya está en S3, sin volver a subirlo. 
 * Inicia la Step Function (RegisterDB -> EnqueueSQS)
 * con los datos del archivo existente y el nuevo targetFormat.
 */

import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { APIGatewayEvent, createSuccessResponse, createErrorResponse } from '../shared/types/Apigatewayevent';
import { extractUserIdFromEvent, extractPathParameter, parseMultipart } from '../shared/utils/helpers';
import { getFileById } from '../shared/queries/fileQueries';
import { isSupportedConversion } from '../shared/constants/formats';
import { AWS_RESOURCES } from '../shared/constants/awsResourceNames';
import { StepFunctionEvent } from '../shared/types/Stepfunctionevent';
import getStepFunctionsClient from '../shared/connections/stepFunctionClient';

export async function handler(event: APIGatewayEvent) {
  console.log('[reconvert] Evento recibido:', JSON.stringify(event));

  const userId = extractUserIdFromEvent(event);
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Token inválido o no proporcionado');
  }

  const fileId = extractPathParameter(event, 'fileId');
  if (!fileId) {
    return createErrorResponse(400, 'MISSING_PARAM', 'fileId es requerido');
  }

  // Parsear body para obtener targetFormat 
  const targetFormat = await extractTargetFormat(event);
  if (!targetFormat) {
    return createErrorResponse(400, 'INVALID_BODY', 'targetFormat es requerido en el body');
  }

  // Obtener el archivo existente desde DynamoDB
  const file = await getFileById(userId, fileId);
  if (!file) {
    return createErrorResponse(404, 'FILE_NOT_FOUND', 'Archivo no encontrado');
  }

  // Validar que la conversión sourceFormat -> targetFormat sea compatible
  if (!isSupportedConversion(file.format, targetFormat)) {
    return createErrorResponse(
      400,
      'UNSUPPORTED_CONVERSION',
      `Conversión no soportada: ${file.format} -> ${targetFormat}`,
    );
  }

  if (!AWS_RESOURCES.STEP_FUNCTION_ARN) {
    return createErrorResponse(500, 'CONFIG_ERROR', 'STEP_FUNCTION_ARN no configurado');
  }

  // Armar input para la Step Function usando los datos del archivo existente en S3
  // RegisterDB detectará que el fileId ya existe y saltará el registro en Files,
  // solo creará un nuevo registro en Conversions con status 'pending'
  const stepFunctionInput: StepFunctionEvent = {
    userId,
    isBatch: false,
    fileName: file.fileName,
    fileId,
    fileSize: file.fileSize,
    s3Key: file.s3Key,
    fileFormat: file.format,
    targetFormat,
  };

  const sfnResponse = await getStepFunctionsClient().send(
    new StartExecutionCommand({
      stateMachineArn: AWS_RESOURCES.STEP_FUNCTION_ARN,
      input: JSON.stringify(stepFunctionInput),
    }),
  );

  console.log(`[reconvert] Step Function iniciado: ${sfnResponse.executionArn}`);

  return createSuccessResponse(202, {
    status: 'success',
    executionArn: sfnResponse.executionArn,
  });
}

// Extrae targetFormat del body
async function extractTargetFormat(event: APIGatewayEvent): Promise<string | null> {
  const contentType = event.headers['content-type'] ?? event.headers['Content-Type'] ?? '';

  if (contentType.includes('multipart/form-data')) {
    const parsed = await parseMultipart(event);
    const value = parsed['targetFormat'];
    return typeof value === 'string' ? value.toLowerCase().trim() : null;
  }

  // JSON
  try {
    const data = JSON.parse(event.body ?? '');
    return typeof data?.targetFormat === 'string' ? data.targetFormat.toLowerCase().trim() : null;
  } catch {
    return null;
  }
}
