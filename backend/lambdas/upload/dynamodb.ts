import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { AWS_CONFIG } from '../../shared/constants';
import type { FileRecord, ConversionRecord } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const dynamodbClient = new DynamoDBClient({ region: AWS_CONFIG.region });
const docClient = DynamoDBDocumentClient.from(dynamodbClient);

/**
 * Registra un archivo en la tabla Files
 */
export async function registerFile(
  userId: string,
  fileName: string,
  format: string,
  fileSize: number,
  s3Key: string,
  type: 'original' | 'converted' = 'original',
  fileId: string = uuidv4()
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
