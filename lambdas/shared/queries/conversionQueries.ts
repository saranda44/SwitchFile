/**
 * Queries para la tabla Conversions
 * Usa DocumentClient de @aws-sdk/lib-dynamodb
 */

import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../connections/dynamoDBClient';
import {
  AWS_RESOURCES,
  generateConversionPK,
  generateConversionSK,
  extractConversionIdFromSK,
} from '../constants/awsResourceNames';
import { Conversion, CreateConversionInput, UpdateConversionStatusInput } from '../types/Conversion';


/**
 * Crear una nueva conversión en la tabla Conversions
 */
export async function createConversion(
  userId: string,
  conversionId: string,
  conversionInput: CreateConversionInput
): Promise<Conversion> {
  try {
    const timestamp = Date.now();
    const PK = generateConversionPK(userId);
    const SK = generateConversionSK(timestamp, conversionId);

    const conversion: Conversion = {
      PK,
      SK,
      sourceFileId: conversionInput.sourceFileId,
      sourceFileName: conversionInput.sourceFileName,
      sourceFormat: conversionInput.sourceFormat,
      targetFormat: conversionInput.targetFormat,
      status: 'pending',
      isBatch: conversionInput.isBatch,
      createdAt: new Date().toISOString(),
      ...(conversionInput.batchId && { batchId: conversionInput.batchId }),
    };

    const command = new PutCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      Item: conversion,
    });

    await getDocClient().send(command);
    return conversion;
  } catch (error) {
    console.error('[createConversion] Error:', error);
    throw new Error('Error al crear conversión en la base de datos');
  }
}

/**
 * Obtener una conversión por userId y conversionId
 */
export async function getConversionById(
  userId: string,
  conversionId: string
): Promise<Conversion | null> {
  try {
    // Para obtener por conversionId, necesitamos hacer un Query
    // porque SK = CONV#{timestamp}#{conversionId}
    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': generateConversionPK(userId),
        ':sk': `CONV#`,
      },
    });

    const response = await getDocClient().send(command);
    const conversions = (response.Items as Conversion[]) || [];

    // Filtrar por conversionId exacto
    const conversion = conversions.find(
      conv => extractConversionIdFromSK(conv.SK) === conversionId
    );

    return conversion || null;
  } catch (error) {
    console.error('[getConversionById] Error:', error);
    throw new Error('Error al obtener conversión de la base de datos');
  }
}

/**
 * Obtener todas las conversiones de un usuario
 * Para el endpoint GET /files
 */
export async function getConversionsByUserId(userId: string): Promise<Conversion[]> {
  try {
    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': generateConversionPK(userId),
      },
      ScanIndexForward: false, // Ordenar descendente (más recientes primero)
    });

    const response = await getDocClient().send(command);
    return (response.Items as Conversion[]) || [];
  } catch (error) {
    console.error('[getConversionsByUserId] Error:', error);
    throw new Error('Error al obtener conversiones de la base de datos');
  }
}

/**
 * Obtener conversiones relacionadas a un archivo específico
 * Para el endpoint GET /vault/{id}
 */
export async function getConversionsByFileId(
  userId: string,
  sourceFileId: string
): Promise<Conversion[]> {
  try {
    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'sourceFileId = :sourceFileId',
      ExpressionAttributeValues: {
        ':pk': generateConversionPK(userId),
        ':sourceFileId': sourceFileId,
      },
    });

    const response = await getDocClient().send(command);
    return (response.Items as Conversion[]) || [];
  } catch (error) {
    console.error('[getConversionsByFileId] Error:', error);
    throw new Error('Error al obtener conversiones del archivo');
  }
}