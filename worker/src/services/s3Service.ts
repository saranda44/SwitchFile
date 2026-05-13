import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { Readable } from 'stream';
import * as path from 'path';
import { lookup } from './mimeTypes';

const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_UPLOADS = process.env.S3_BUCKET_UPLOADS!;
const BUCKET_CONVERTED = process.env.S3_BUCKET_CONVERTED!;

export async function downloadFile(s3Key: string, destPath: string): Promise<void> {
  const response = await client.send(new GetObjectCommand({
    Bucket: BUCKET_UPLOADS,
    Key: s3Key,
  }));

  const stream = response.Body as Readable;
  const writeStream = fs.createWriteStream(destPath);

  await new Promise<void>((resolve, reject) => {
    stream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

export async function uploadFile(filePath: string, s3Key: string, format: string): Promise<void> {
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = lookup(format);

  await client.send(new PutObjectCommand({
    Bucket: BUCKET_CONVERTED,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  }));
}
