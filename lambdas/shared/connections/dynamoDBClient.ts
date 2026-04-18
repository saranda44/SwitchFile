/**
 * Cliente DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { AWS_RESOURCES } from '../constants/awsResourceNames';

let dynamoDBClientInstance: DynamoDBClient | null = null;

/**
 * Obtener instancia del cliente DynamoDB
 */
export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamoDBClientInstance) {
    try {
      dynamoDBClientInstance = new DynamoDBClient({
        region: AWS_RESOURCES.AWS_REGION
      });

      console.log(
        `[DynamoDB] Cliente inicializado en región: ${AWS_RESOURCES.AWS_REGION}`
      );
    } catch (error) {
      console.error('[DynamoDB] Error al inicializar cliente:', error);
      throw new Error('No se pudo inicializar el cliente DynamoDB');
    }
  }

  return dynamoDBClientInstance;
}


let docClientInstance: DynamoDBDocumentClient | null = null;

/**
 * Obtener instancia de DocumentClient (lazy initialization)
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClientInstance) {
    docClientInstance = DynamoDBDocumentClient.from(getDynamoDBClient());
  }
  return docClientInstance;
}

export default getDynamoDBClient;