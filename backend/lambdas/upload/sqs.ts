import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AWS_CONFIG } from '../../shared/constants';
import type { SQSConversionMessage } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({ region: AWS_CONFIG.region });

/**
 * Encola un mensaje de conversión en SQS
 */
export async function enqueueConversion(
  userId: string,
  sourceFileId: string,
  sourceFormat: string,
  targetFormat: string,
  s3Key: string,
  batchId?: string
): Promise<string> {
  const conversionId = uuidv4();

  const message: SQSConversionMessage = {
    conversionId,
    userId,
    sourceFileId,
    sourceFormat,
    targetFormat,
    s3Key,
    batchId,
  };

  const command = new SendMessageCommand({
    QueueUrl: AWS_CONFIG.sqs.queueUrl,
    MessageBody: JSON.stringify(message),
    MessageDeduplicationId: conversionId, // Para FIFO queues
    MessageGroupId: userId, // Para FIFO queues
  });

  try {
    const response = await sqsClient.send(command);
    return conversionId;
  } catch (error) {
    throw new Error(`Error encolando conversión en SQS: ${error}`);
  }
}

/**
 * Encola múltiples conversiones (para batch de archivos)
 */
export async function enqueueBatch(
  userId: string,
  files: Array<{
    sourceFileId: string;
    sourceFormat: string;
    targetFormat: string;
    s3Key: string;
  }>,
  batchId: string
): Promise<string[]> {
  const conversionIds: string[] = [];

  for (const file of files) {
    const conversionId = await enqueueConversion(
      userId,
      file.sourceFileId,
      file.sourceFormat,
      file.targetFormat,
      file.s3Key,
      batchId
    );
    conversionIds.push(conversionId);
  }

  return conversionIds;
}