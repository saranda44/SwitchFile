import 'dotenv/config';
import { receiveMessage, deleteMessage } from './services/sqsConsumer';
import { downloadFile, uploadFile } from './services/s3Service';
import { updateStatus, createResultFile } from './services/dynamoService';
import { convert, getCategory } from './converters/router';
import type { Category } from './converters/router';
import { emitConversionMetrics } from './services/metrics';
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

  const startedAt = Date.now();

  let category: Category;
  try {
    category = getCategory(message.sourceFormat);
  } catch {
    const errorMsg = `Formato no soportado: ${message.sourceFormat}`;
    console.error(`[worker] ✗ ${message.fileName}: ${errorMsg}`);
    await updateStatus(message.userId, message.conversionId, {
      status: 'failed',
      errorMessage: errorMsg,
    }).catch(() => {});
    fs.rmSync(workDir, { recursive: true, force: true });
    return;
  }

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

    const durationMs = Date.now() - startedAt;
    console.log(
      `[worker] ✓ ${message.fileName} → ${message.targetFormat} (${resultFileId}) ${durationMs}ms`
    );

    await emitConversionMetrics({
      durationMs,
      category,
      sourceFormat: message.sourceFormat,
      targetFormat: message.targetFormat,
      status: 'success',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startedAt;
    console.error(`[worker] ✗ ${message.fileName}: ${errorMsg} (${durationMs}ms)`);

    await updateStatus(message.userId, message.conversionId, {
      status: 'failed',
      errorMessage: errorMsg,
    }).catch(() => {});

    await emitConversionMetrics({
      durationMs,
      category,
      sourceFormat: message.sourceFormat,
      targetFormat: message.targetFormat,
      status: 'failed',
    });
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
