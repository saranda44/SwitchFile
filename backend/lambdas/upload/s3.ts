import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AWS_CONFIG } from '../../shared/constants';

const s3Client = new S3Client({ region: AWS_CONFIG.region });

/**
 * Sube un archivo original a S3
 */
export async function uploadOriginalFile(
  userId: string,
  fileId: string,
  fileName: string,
  fileBuffer: Buffer,
  format: string
): Promise<string> {
  const s3Key = `${AWS_CONFIG.s3.uploadPrefix}/${userId}/${fileId}/original.${format}`;

  const command = new PutObjectCommand({
    Bucket: AWS_CONFIG.s3.uploadsBucket,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: `application/${format}`,
    Metadata: {
      userId,
      fileId,
      originalFileName: fileName,
    },
  });

  try {
    await s3Client.send(command);
    return s3Key;
  } catch (error) {
    throw new Error(`Error subiendo archivo a S3: ${error}`);
  }
}