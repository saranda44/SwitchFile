import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { AWS_CONFIG } from './constants';
import type { ConversionRecord, FileRecord } from './types';
import { v4 as uuidv4 } from 'uuid';

const dynamodbClient = new DynamoDBClient({ region: AWS_CONFIG.region });
const docClient = DynamoDBDocumentClient.from(dynamodbClient);

/**
 * Registra un archivo en la tabla Files (original o convertido)
 */
export async function registerFile(
  userId: string,
  fileName: string,
  format: string,
  fileSize: number,
  s3Key: string,
  type: 'original' | 'converted' = 'original',
  fileId: string = uuidv4(),
  batchId?: string
): Promise<string> {
  const now = new Date().toISOString();

  const fileRecord: FileRecord = {
    PK: `USER#${userId}`,
    SK: `FILE#${fileId}`,
    fileName,
    format,
    fileSize,
    s3Key,
    type,
    batchId,
    createdAt: now,
  };

  const command = new PutCommand({
    TableName: AWS_CONFIG.dynamodb.filesTable,
    Item: fileRecord,
  });

  try {
    await docClient.send(command);
    return fileId;
  } catch (error) {
    throw new Error(`Error registrando archivo en DynamoDB: ${error}`);
  }
}

/**
 * Registra una conversión en la tabla Conversions
 */
export async function registerConversion(
  userId: string,
  sourceFileId: string,
  sourceFormat: string,
  targetFormat: string,
  batchId?: string
): Promise<string> {
  const conversionId = uuidv4();
  const timestamp = Date.now();
  const now = new Date().toISOString();

  const conversionRecord: ConversionRecord = {
    PK: `USER#${userId}`,
    SK: `CONV#${timestamp}#${conversionId}`,
    sourceFileId,
    sourceFormat,
    targetFormat,
    status: 'pending',
    batchId,
    createdAt: now,
  };

  const command = new PutCommand({
    TableName: AWS_CONFIG.dynamodb.conversionsTable,
    Item: conversionRecord,
  });

  try {
    await docClient.send(command);
    return conversionId;
  } catch (error) {
    throw new Error(`Error registrando conversión en DynamoDB: ${error}`);
  }
}