/**
 * Queries para la tabla Files
 * Usa DocumentClient de @aws-sdk/lib-dynamodb
 */

import { GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../connections/dynamoDBClient';
import {
  AWS_RESOURCES,
  generateFilePK,
  generateFileSK,
  extractFileIdFromSK,
  extractUserIdFromPK,
} from '../constants/awsResourceNames';
import { File, CreateFileInput } from '../types/File';


/**
 * Crear un nuevo archivo en la tabla Files
 */
export async function createFile(
  userId: string,
  fileId: string,
  fileInput: CreateFileInput
): Promise<File> {
  try {
    const PK = generateFilePK(userId);
    const SK = generateFileSK(fileId);

    const file: File = {
      PK,
      SK,
      fileName: fileInput.fileName,
      format: fileInput.format,
      fileSize: fileInput.fileSize,
      s3Key: fileInput.s3Key,
      type: fileInput.type,
      isBatch: fileInput.isBatch,
      createdAt: new Date().toISOString(),
      ...(fileInput.batchId && { batchId: fileInput.batchId }),
    };

    const command = new PutCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_FILES,
      Item: file,
    });

    await getDocClient().send(command);
    return file;
  } catch (error) {
    console.error('[createFile] Error:', error);
    throw new Error('Error al crear archivo en la base de datos');
  }
}

/**
 * Obtener un archivo por userId y fileId
 */
export async function getFileById(userId: string, fileId: string): Promise<File | null> {
  try {
    const command = new GetCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_FILES,
      Key: {
        PK: generateFilePK(userId),
        SK: generateFileSK(fileId),
      },
    });

    const response = await getDocClient().send(command);
    return response.Item as File | undefined || null;
  } catch (error) {
    console.error('[getFileById] Error:', error);
    throw new Error('Error al obtener archivo de la base de datos');
  }
}

/**
 * Obtener todos los archivos de un usuario
 * Para el endpoint GET /vault
 */
export async function getFilesByUserId(userId: string): Promise<File[]> {
  try {
    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_FILES,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': generateFilePK(userId),
      },
    });

    const response = await getDocClient().send(command);
    return (response.Items as File[]) || [];
  } catch (error) {
    console.error('[getFilesByUserId] Error:', error);
    throw new Error('Error al obtener archivos de la base de datos');
  }
}

/**
 * Obtener archivos de un lote específico por batchId
 */
export async function getFilesByBatchId(userId: string, batchId: string): Promise<File[]> {
  try {
    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_FILES,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'batchId = :batchId',
      ExpressionAttributeValues: {
        ':pk': generateFilePK(userId),
        ':batchId': batchId,
      },
    });

    const response = await getDocClient().send(command);
    return (response.Items as File[]) || [];
  } catch (error) {
    console.error('[getFilesByBatchId] Error:', error);
    throw new Error('Error al obtener archivos del lote');
  }
}
