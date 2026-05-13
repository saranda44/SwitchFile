import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

const TABLE_FILES = process.env.DYNAMODB_TABLE_FILES!;
const TABLE_CONVERSIONS = process.env.DYNAMODB_TABLE_CONVERSIONS!;

interface StatusUpdate {
  status: 'processing' | 'completed' | 'failed';
  resultFileId?: string;
  errorMessage?: string;
  completedAt?: string;
}

interface CreateFileInput {
  fileName: string;
  format: string;
  fileSize: number;
  s3Key: string;
  type: 'original' | 'converted';
  isBatch: boolean;
  batchId?: string;
}

export async function updateStatus(
  userId: string,
  conversionId: string,
  update: StatusUpdate
): Promise<void> {
  const conversion = await findConversion(userId, conversionId);
  if (!conversion) throw new Error(`Conversión ${conversionId} no encontrada`);

  const expressions: string[] = ['#status = :status'];
  const values: Record<string, any> = { ':status': update.status };

  if (update.resultFileId) {
    expressions.push('resultFileId = :resultFileId');
    values[':resultFileId'] = update.resultFileId;
  }
  if (update.errorMessage) {
    expressions.push('errorMessage = :errorMessage');
    values[':errorMessage'] = update.errorMessage;
  }
  if (update.completedAt) {
    expressions.push('completedAt = :completedAt');
    values[':completedAt'] = update.completedAt;
  }

  await client.send(new UpdateCommand({
    TableName: TABLE_CONVERSIONS,
    Key: { PK: conversion.PK, SK: conversion.SK },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: values,
  }));
}

export async function createResultFile(
  userId: string,
  fileId: string,
  input: CreateFileInput
): Promise<void> {
  await client.send(new PutCommand({
    TableName: TABLE_FILES,
    Item: {
      PK: `USER#${userId}`,
      SK: `FILE#${fileId}`,
      fileName: input.fileName,
      format: input.format,
      fileSize: input.fileSize,
      s3Key: input.s3Key,
      type: input.type,
      isBatch: input.isBatch,
      createdAt: new Date().toISOString(),
      ...(input.batchId && { batchId: input.batchId }),
    },
  }));
}

async function findConversion(userId: string, conversionId: string) {
  const response = await client.send(new QueryCommand({
    TableName: TABLE_CONVERSIONS,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'CONV#',
    },
  }));

  const items = response.Items || [];
  return items.find(item => {
    const parts = (item.SK as string).split('#');
    return parts[parts.length - 1] === conversionId;
  }) || null;
}
