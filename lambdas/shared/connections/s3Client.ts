/**
 * Cliente S3 
 */

import { S3Client } from '@aws-sdk/client-s3';
import { AWS_RESOURCES } from '../constants/awsResourceNames';

let s3ClientInstance: S3Client | null = null;

/**
 * Obtener instancia del cliente S3
 */
export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    try {
      s3ClientInstance = new S3Client({
        region: AWS_RESOURCES.AWS_REGION
      });

      console.log(`[S3] Cliente inicializado en región: ${AWS_RESOURCES.AWS_REGION}`);
    } catch (error) {
      console.error('[S3] Error al inicializar cliente:', error);
      throw new Error('No se pudo inicializar el cliente S3');
    }
  }

  return s3ClientInstance;
}

export default getS3Client;