/**
 * EnqueueSQS Handler — Step Function Step 2
 *
 * Encola en SQS los mensajes que el worker de EC2 consumirá 
 */

import { SendMessageBatchCommand, SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs';
import { StepFunctionEvent, SQSConversionMessage } from '../shared/types/Stepfunctionevent';
import { getSQSClient } from '../shared/connections/sqsClient';
import { AWS_RESOURCES } from '../shared/constants/awsResourceNames';

export async function handler(event: StepFunctionEvent): Promise<StepFunctionEvent> {
  console.log('[enqueueSQS] Evento recibido:', JSON.stringify(event));

  const { userId, isBatch, registerResult } = event;

  if (!userId) throw new Error('userId es requerido');
  if (!registerResult) throw new Error('registerResult es requerido');
  if (!AWS_RESOURCES.SQS_QUEUE_URL) throw new Error('SQS_QUEUE_URL no configurada');

  // Construye los mensajes según el tipo de flujo
  const messages = isBatch ? buildBatchMessages(event) : buildSingleMessage(event);

  // Envía en chunks de 10 (límite de SendMessageBatch)
  const messageIds: string[] = [];

  for (let i = 0; i < messages.length; i += 10) {
    const chunk = messages.slice(i, i + 10);

    const entries: SendMessageBatchRequestEntry[] = chunk.map(msg => ({
      Id: msg.fileId,                         // ID único dentro del chunk (requerido por SQS)
      MessageBody: JSON.stringify(msg),
      MessageGroupId: userId,
      MessageDeduplicationId: msg.conversionId, // Evita duplicados en cola FIFO; usa conversionId para idempotencia en reintentos del Step Function
    }));

    const response = await getSQSClient().send(new SendMessageBatchCommand({
      QueueUrl: AWS_RESOURCES.SQS_QUEUE_URL,
      Entries: entries,
    }));

    // Si algún mensaje falló dentro del chunk, abortar todo el flujo
    if (response.Failed?.length) {
      const failedIds = response.Failed.map(f => f.Id).join(', ');
      throw new Error(`Falló el envío de mensajes SQS para fileIds: ${failedIds}`);
    }

    messageIds.push(...(response.Successful ?? []).map(s => s.MessageId!));
  }

  const enqueueResult: { messageIds: string[] } = {
    messageIds,
  };

  console.log('[enqueueSQS] Mensajes encolados:', enqueueResult);
  return { ...event, enqueueResult };
}

function buildSingleMessage(event: StepFunctionEvent): SQSConversionMessage[] {
  const { userId, fileName, fileId, s3Key, fileFormat, targetFormat, batchId, registerResult } = event;

  if (!fileName || !fileId || !s3Key || !fileFormat || !targetFormat) {
    throw new Error('Faltan campos requeridos para encolar archivo simple');
  }
  if (!registerResult?.conversionId) {
    throw new Error('registerResult.conversionId es requerido');
  }

  return [{
    userId,
    fileId,
    fileName,
    s3Key,
    sourceFormat: fileFormat,
    targetFormat,
    conversionId: registerResult.conversionId,
    isBatch: false,
    ...(batchId && { batchId }),
  }];
}

function buildBatchMessages(event: StepFunctionEvent): SQSConversionMessage[] {
  const { userId, files, batchId, registerResult } = event;

  if (!files?.length) throw new Error('Faltan archivos en el evento batch');
  if (!batchId) throw new Error('batchId es requerido para batch');
  if (!registerResult?.records?.length) throw new Error('registerResult.records es requerido para batch');

  // Mapa fileId -> conversionId para asignar correctamente cada mensaje
  const conversionMap = new Map(registerResult.records.map(r => [r.fileId, r.conversionId]));

  return files.map(file => {
    const conversionId = conversionMap.get(file.fileId);
    if (!conversionId) throw new Error(`No se encontró conversionId para fileId ${file.fileId}`);

    return {
      userId,
      fileId: file.fileId,
      fileName: file.fileName,
      s3Key: file.s3Key,
      sourceFormat: file.fileFormat,
      targetFormat: file.targetFormat,
      conversionId,
      isBatch: true,
      batchId,
    };
  });
}
