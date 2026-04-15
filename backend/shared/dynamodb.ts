import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { AWS_CONFIG } from './constants';
import type { ConversionRecord } from './types';
import { v4 as uuidv4 } from 'uuid';

const dynamodbClient = new DynamoDBClient({ region: AWS_CONFIG.region });
const docClient = DynamoDBDocumentClient.from(dynamodbClient);

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