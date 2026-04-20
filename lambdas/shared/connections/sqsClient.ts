/**
 * Cliente SQS
 */

import { SQSClient } from '@aws-sdk/client-sqs';
import { AWS_RESOURCES } from '../constants/awsResourceNames';

let sqsClientInstance: SQSClient | null = null;

/**
 * Obtener instancia del cliente SQS
 */
export function getSQSClient(): SQSClient {
  if (!sqsClientInstance) {
    try {
      sqsClientInstance = new SQSClient({
        region: AWS_RESOURCES.AWS_REGION
      });

      console.log(`[SQS] Cliente inicializado en región: ${AWS_RESOURCES.AWS_REGION}`);
    } catch (error) {
      console.error('[SQS] Error al inicializar cliente:', error);
      throw new Error('No se pudo inicializar el cliente SQS');
    }
  }

  return sqsClientInstance;
}

export default getSQSClient;