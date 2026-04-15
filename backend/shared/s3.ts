import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_CONFIG } from './constants';

const s3Client = new S3Client({ region: AWS_CONFIG.region });

/**
 * Genera una URL prefirmada para descargar un archivo
 */
export async function generatePresignedUrl(
  s3Key: string,
  bucket: string = AWS_CONFIG.s3.convertedBucket,
  expirationSeconds: number = 3600 // 1 hora por defecto
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expirationSeconds,
    });
    return url;
  } catch (error) {
    throw new Error(`Error generando presigned URL: ${error}`);
  }
}