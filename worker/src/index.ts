import 'dotenv/config';
import { receiveMessage, deleteMessage } from './services/sqsConsumer';
import { downloadFile, uploadFile } from './services/s3Service';
import { updateStatus, createResultFile } from './services/dynamoService';
import { convert } from './converters/router';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const TEMP_DIR = '/tmp/switchfile';

interface ConversionMessage {
  userId: string;
  fileId: string;
  fileName: string;
  s3Key: string;
  sourceFormat: string;
  targetFormat: string;
  conversionId: string;
  isBatch: boolean;
  batchId?: string;
}

async function processMessage(message: ConversionMessage): Promise<void> {
  const workDir = path.join(TEMP_DIR, message.conversionId);
  fs.mkdirSync(workDir, { recursive: true });

  const inputPath = path.join(workDir, `input.${message.sourceFormat}`);
  const outputPath = path.join(workDir, `output.${message.targetFormat}`);

  try {
    await updateStatus(message.userId, message.conversionId, { status: 'processing' });

    await downloadFile(message.s3Key, inputPath);

    await convert(inputPath, outputPath, message.sourceFormat, message.targetFormat);

    const resultFileId = randomUUID();
    const resultFileName = message.fileName.replace(
      `.${message.sourceFormat}`,
      `.${message.targetFormat}`
    );
    const resultS3Key = `converted/${message.userId}/${resultFileId}/${resultFileName}`;

    await uploadFile(outputPath, resultS3Key, message.targetFormat);

    await createResultFile(message.userId, resultFileId, {
      fileName: resultFileName,
      format: message.targetFormat,
      fileSize: fs.statSync(outputPath).size,
      s3Key: resultS3Key,
      type: 'converted',
      isBatch: message.isBatch,
      ...(message.batchId && { batchId: message.batchId }),
    });

    await updateStatus(message.userId, message.conversionId, {
      status: 'completed',
      resultFileId,
      completedAt: new Date().toISOString(),
    });

    console.log(`[worker] ✓ ${message.fileName} → ${message.targetFormat} (${resultFileId})`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[worker] ✗ ${message.fileName}: ${errorMsg}`);

    await updateStatus(message.userId, message.conversionId, {
      status: 'failed',
      errorMessage: errorMsg,
    }).catch(() => {});
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  console.log('[worker] SwitchFile Worker iniciado');
  console.log(`[worker] SQS: ${process.env.SQS_QUEUE_URL}`);
  console.log(`[worker] Región: ${process.env.AWS_REGION || 'us-east-1'}`);

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  while (true) {
    const result = await receiveMessage();

    if (!result) continue;

    const { body, receiptHandle } = result;

    try {
      const message: ConversionMessage = JSON.parse(body);
      await processMessage(message);
      await deleteMessage(receiptHandle);
    } catch (error) {
      console.error('[worker] Error procesando mensaje:', error);
    }
  }
}

main().catch((error) => {
  console.error('[worker] Error fatal:', error);
  process.exit(1);
});
