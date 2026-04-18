/**
 * RegisterDB Handler — Step Function Step 1
 *
 * Responsabilidades:
 * 1. Recibir evento de Step Function (simple o batch)
 * 2. Por cada archivo: registrar en Files si no existe ya (idempotente por fileId)
 * 3. Crear entrada en Conversions con status 'pending'
 * 4. Retornar el evento enriquecido con registerResult
 */

import { randomUUID } from 'crypto';
import { StepFunctionEvent, RegisterStepResult, FileConversionRecord } from '../shared/types/Stepfunctionevent';
import { getFileById, createFile } from '../shared/queries/fileQueries';
import { createConversion } from '../shared/queries/conversionQueries';

// Punto de entrada del Step Function — decide si el flujo es simple o batch
export async function handler(event: StepFunctionEvent): Promise<StepFunctionEvent> {
  console.log('[registerDB] Evento recibido:', JSON.stringify(event));

  const { userId, isBatch } = event;

  if (!userId) {
    throw new Error('userId es requerido');
  }

  if (isBatch) {
    return handleBatch(event);
  }
  return handleSingle(event);
}

// Maneja el registro de un único archivo y su conversión
async function handleSingle(event: StepFunctionEvent): Promise<StepFunctionEvent> {
  const { userId, fileName, fileId, fileSize, s3Key, fileFormat, targetFormat } = event;

  if (!fileName || !fileId || !fileSize || !s3Key || !fileFormat || !targetFormat) {
    throw new Error('Faltan campos requeridos para archivo simple');
  }

  // Registra el archivo original en la tabla Files (omite si ya existe)
  await verifyFileExists(userId, fileId, {
    fileName,
    format: fileFormat,
    fileSize,
    s3Key,
    type: 'original',
    isBatch: false,
  });

  // Genera un ID único para esta conversión y la registra en estado pending
  const conversionId = randomUUID();
  await createConversion(userId, conversionId, {
    sourceFileId: fileId,
    sourceFormat: fileFormat,
    targetFormat,
    isBatch: false,
  });

  const registerResult: RegisterStepResult = {
    fileId,
    conversionId,
  };

  console.log('[registerDB] Registro simple completado:', registerResult);

  // Devuelve el evento original enriquecido con los IDs generados
  return { ...event, registerResult };
}

// Maneja el registro de múltiples archivos (ZIP descomprimido) y sus conversiones
async function handleBatch(event: StepFunctionEvent): Promise<StepFunctionEvent> {
  const { userId, files, batchId, targetFormat } = event;

  if (!files || files.length === 0) {
    throw new Error('Faltan archivos en el evento batch');
  }
  if (!batchId) {
    throw new Error('batchId es requerido para batch');
  }

  const records: FileConversionRecord[] = [];

  // Procesa cada archivo del lote de forma secuencial para evitar condiciones de carrera en DynamoDB
  for (const file of files) {
    const { fileName, fileId, fileFormat, s3Key, fileSize, targetFormat: fileTargetFormat } = file;

    // Cada archivo del ZIP puede tener su propio targetFormat; si no, se usa el del batch
    const resolvedTarget = fileTargetFormat || targetFormat;

    // Registra el archivo original en la tabla Files (omite si ya existe)
    await verifyFileExists(userId, fileId, {
      fileName,
      format: fileFormat,
      fileSize,
      s3Key,
      type: 'original',
      isBatch: true,
      batchId,
    });

    // Genera un ID único para esta conversión y la registra en estado pending
    const conversionId = randomUUID();
    await createConversion(userId, conversionId, {
      sourceFileId: fileId,
      sourceFormat: fileFormat,
      targetFormat: resolvedTarget,
      isBatch: true,
      batchId,
    });

    // Guarda la asociación fileId <-> conversionId para que EnqueueSQS pueda encolar cada archivo correctamente
    records.push({ fileId, conversionId });
  }

  const registerResult: RegisterStepResult = { records };

  console.log('[registerDB] Registro batch completado:', registerResult);

  // Devuelve el evento original enriquecido con los IDs generados
  return { ...event, registerResult };
}

// Verifica si el archivo ya existe en DynamoDB antes de crearlo
// Evita duplicados cuando el Step Function se reintenta por un fallo posterior
async function verifyFileExists(
  userId: string,
  fileId: string,
  fileInput: Parameters<typeof createFile>[2]
): Promise<void> {
  const existing = await getFileById(userId, fileId);
  if (existing) {
    console.log(`[registerDB] Archivo ${fileId} ya existe, saltando registro`);
    return;
  }
  await createFile(userId, fileId, fileInput);
}
