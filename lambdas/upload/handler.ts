/**
 * Upload Handler — POST /upload
 *
 * Responsabilidades:
 * 1. Parsear multipart/form-data (file + targetFormat)
 * 2. Extraer userId del JWT (Cognito)
 * 3. Validar que targetFormat sea exactamente uno
 * 4. Detectar si el archivo es ZIP (batch) o simple
 * 5. Validar tamaño (ZIP → límite del ZIP; simple → límite por categoría)
 * 6. Validar extensión, magic bytes, nombre sanitizado y conversión soportada
 *    (ZIP: validar cada archivo; si alguno falla → rechazar todo)
 * 7. Subir archivo(s) a S3
 * 8. Iniciar Step Function con s3Key(s)
 */

import { parse } from 'lambda-multipart-parser';
import JSZip from 'jszip';
import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime-types';
import {
  APIGatewayEvent,
  createErrorResponse,
  createSuccessResponse,
} from '../shared/types/Apigatewayevent';
import { StepFunctionEvent } from '../shared/types/Stepfunctionevent';
import { AWS_RESOURCES, generateS3UploadKey } from '../shared/constants/awsResourceNames';
import { extractUserIdFromEvent } from '../shared/utils/helpers';
import {
  validateFileSize,
  sanitizeFileName,
  validateMagicBytes,
  validateFileExtension,
  validateConversionSupported,
  isZipFile,
} from '../shared/validators/formatValidators';
import { generateNewId } from '../shared/validators/idValidators';
import { ValidatedFile } from '../shared/types/ValidationResult';
import getStepFunctionsClient from '../shared/connections/stepFunctionClient';
import getS3Client from '../shared/connections/s3Client';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Sube un archivo a S3 y devuelve el s3Key resultante.
 * Ruta: uploads/{userId}/{fileId}/original.{ext}
 */
async function uploadToS3(
  userId: string,
  fileId: string,
  fileBuffer: Buffer,
  fileFormat: string,
): Promise<string> {
  const s3Key = generateS3UploadKey(userId, fileId, `original.${fileFormat}`);
  const contentType = mime.lookup(fileFormat) || 'application/octet-stream';

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: AWS_RESOURCES.S3_BUCKET_UPLOADS,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType.toString(),
    }),
  );

  return s3Key;
}

/**
 * Valida un archivo individual (no ZIP).
 * Devuelve el archivo listo para subir a S3 o un error
 */
async function validateSingleFile(
  fileName: string,
  fileBuffer: Buffer,
  targetFormat: string,
): Promise<{ isValid: boolean; error?: string; file?: ValidatedFile }> {
  // 1. Sanitizar nombre
  const sanitization = sanitizeFileName(fileName);
  if (!sanitization.isValid) {
    return { isValid: false, error: `Nombre inválido: ${sanitization.error}` };
  }

  // 2. Validar extensión
  const extensionValidation = validateFileExtension(sanitization.sanitized);
  if (!extensionValidation.isValid) {
    return { isValid: false, error: `Extensión inválida: ${extensionValidation.error}` };
  }

  const sourceFormat = extensionValidation.format!;

  // 3. Validar tamaño según categoría
  const sizeValidation = validateFileSize(fileBuffer.length, sourceFormat);
  if (!sizeValidation.isValid) {
    return { isValid: false, error: `Tamaño inválido: ${sizeValidation.error}` };
  }

  // 4. Validar magic bytes
  const magicValidation = await validateMagicBytes(fileBuffer, sourceFormat);
  if (!magicValidation.isValid) {
    return { isValid: false, error: `Tipo de archivo inválido: ${magicValidation.error}` };
  }

  // 5. Validar que la conversión sourceFormat -> targetFormat está soportada
  const conversionValidation = validateConversionSupported(sourceFormat, targetFormat);
  if (!conversionValidation.isValid) {
    return {
      isValid: false,
      error: `Conversión no soportada (${sourceFormat} → ${targetFormat}): ${conversionValidation.error}`,
    };
  }

  return {
    isValid: true,
    file: {
      fileName: sanitization.sanitized,
      fileFormat: sourceFormat,
      fileBuffer,
      fileSize: fileBuffer.length,
      targetFormat,
      isBatch: false,
    },
  };
}

/**
 * Descomprime y valida todos los archivos de un ZIP.
 * Si alguno falla, se rechaza todo el lote.
 */
async function validateZipContents(
  zipBuffer: Buffer,
  targetFormat: string,
): Promise<{ isValid: boolean; errors?: string[]; files?: ValidatedFile[] }> {
  let zip: JSZip;
  try {
    zip = await new JSZip().loadAsync(zipBuffer);
  } catch (error) {
    return { isValid: false, errors: [`ZIP corrupto o inválido: ${String(error)}`] };
  }

  const files: ValidatedFile[] = [];
  const errors: string[] = [];

  for (const [filePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const fileName = filePath.split('/').pop() || filePath;
    try {
      const fileBuffer = Buffer.from(await zipEntry.async('arraybuffer'));
      const validation = await validateSingleFile(fileName, fileBuffer, targetFormat);

      if (!validation.isValid) {
        errors.push(`'${fileName}': ${validation.error}`);
      } else {
        files.push({ ...validation.file!, isBatch: true });
      }
    } catch (error) {
      errors.push(`'${fileName}': error al procesar — ${String(error)}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  if (files.length === 0) {
    return { isValid: false, errors: ['El ZIP no contiene archivos válidos'] };
  }

  return { isValid: true, files };
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function handler(event: APIGatewayEvent) {
  try {
    // 1. Extraer userId del JWT (Cognito lo inyecta en requestContext)
    const userId = extractUserIdFromEvent(event);
    if (!userId) {
      return createErrorResponse(401, 'AUTH_ERROR', 'Usuario no autenticado');
    }

    console.log(`[Upload] userId=${userId}`);

    // 2. Parsear multipart/form-data
    let parsed: any;
    try {
      const eventToParse = {
        ...event,
        body: event.isBase64Encoded
          ? Buffer.from(event.body!, 'base64').toString('binary')
          : event.body,
      };
      parsed = await parse(eventToParse as any);
    } catch (error) {
      console.error('[Upload] Error al parsear multipart:', error);
      return createErrorResponse(400, 'BAD_REQUEST', 'Error al procesar el formulario multipart');
    }

    // 3. Validar que hay archivo
    if (!parsed.files || parsed.files.length === 0) {
      return createErrorResponse(400, 'BAD_REQUEST', 'No se proporcionó ningún archivo');
    }

    const uploadedFile = parsed.files[0];
    const fileBuffer = uploadedFile.content as Buffer;
    const fileName = uploadedFile.filename as string;

    // 4. Validar targetFormat — solo se permite exactamente uno
    let targetFormat: string;

    if (Array.isArray(parsed.targetFormat)) {
      if (parsed.targetFormat.length !== 1) {
        return createErrorResponse(
          400,
          'BAD_REQUEST',
          'Solo se permite un targetFormat por solicitud',
        );
      }
      targetFormat = String(parsed.targetFormat[0]).trim().toLowerCase();
    } else if (typeof parsed.targetFormat === 'string' && parsed.targetFormat.trim()) {
      targetFormat = parsed.targetFormat.trim().toLowerCase();
    } else {
      return createErrorResponse(400, 'BAD_REQUEST', 'targetFormat es requerido');
    }

    console.log(`[Upload] archivo=${fileName} tamaño=${fileBuffer.length} targetFormat=${targetFormat}`);

    // 5. Detectar ZIP
    let isBatch: boolean;
    try {
      isBatch = await isZipFile(fileBuffer);
    } catch (error) {
      console.error('[Upload] Error al detectar tipo de archivo:', error);
      return createErrorResponse(400, 'BAD_REQUEST', 'No se pudo determinar el tipo de archivo');
    }

    // ------------------------------------------------------------------
    // Flujo ZIP (batch)
    // ------------------------------------------------------------------
    if (isBatch) {
      // Validar tamaño del ZIP completo
      const zipSizeValidation = validateFileSize(fileBuffer.length, 'zip');
      if (!zipSizeValidation.isValid) {
        return createErrorResponse(
          400,
          'FILE_SIZE_ERROR',
          `El archivo ZIP excede el límite permitido: ${zipSizeValidation.error}`,
        );
      }

      console.log('[Upload] ZIP detectado, validando contenidos...');

      // Validar todos los archivos del ZIP (si alguno falla -> rechazar todo)
      const zipValidation = await validateZipContents(fileBuffer, targetFormat);
      if (!zipValidation.isValid) {
        return createErrorResponse(400, 'VALIDATION_ERROR', 'Validación del ZIP fallida', {
          errors: zipValidation.errors,
        });
      }

      const validatedFiles = zipValidation.files!;
      console.log(`[Upload] ZIP válido con ${validatedFiles.length} archivo(s)`);

      // Subir cada archivo a S3 individualmente
      const batchId = generateNewId();
      const uploadedFiles: StepFunctionEvent['files'] = [];

      for (const file of validatedFiles) {
        const fileId = generateNewId();
        const s3Key = await uploadToS3(userId, fileId, file.fileBuffer, file.fileFormat);
        console.log(`[Upload] Subido a S3: ${s3Key}`);

        uploadedFiles!.push({
          fileName: file.fileName,
          fileFormat: file.fileFormat,
          s3Key,
          fileSize: file.fileSize,
          targetFormat,
        });
      }

      // Iniciar Step Function
      const stepFunctionInput: StepFunctionEvent = {
        userId,
        isBatch: true,
        batchId,
        targetFormat,
        files: uploadedFiles,
      };

      const sfnResponse = await getStepFunctionsClient().send(
        new StartExecutionCommand({
          stateMachineArn: AWS_RESOURCES.STEP_FUNCTION_ARN,
          name: `${userId}-batch-${batchId}`,
          input: JSON.stringify(stepFunctionInput),
        }),
      );

      console.log(`[Upload] Step Function iniciado: ${sfnResponse.executionArn}`);

      return createSuccessResponse(202, {
        executionId: sfnResponse.executionArn,
        message: 'Lote de conversión iniciado',
        batchId,
        fileCount: uploadedFiles!.length,
      });
    }

    // ------------------------------------------------------------------
    // Flujo archivo simple
    // ------------------------------------------------------------------
    const fileValidation = await validateSingleFile(fileName, fileBuffer, targetFormat);
    if (!fileValidation.isValid) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        fileValidation.error || 'Validación del archivo fallida',
      );
    }

    const validatedFile = fileValidation.file!;
    console.log(`[Upload] Archivo válido: ${validatedFile.fileName} (${validatedFile.fileFormat})`);

    // Subir a S3
    const fileId = generateNewId();
    const s3Key = await uploadToS3(userId, fileId, validatedFile.fileBuffer, validatedFile.fileFormat);
    console.log(`[Upload] Subido a S3: ${s3Key}`);

    // Iniciar Step Function
    const stepFunctionInput: StepFunctionEvent = {
      userId,
      isBatch: false,
      fileName: validatedFile.fileName,
      fileSize: validatedFile.fileSize,
      s3Key,
      fileFormat: validatedFile.fileFormat,
      targetFormat,
    };

    const sfnResponse = await getStepFunctionsClient().send(
      new StartExecutionCommand({
        stateMachineArn: AWS_RESOURCES.STEP_FUNCTION_ARN,
        input: JSON.stringify(stepFunctionInput),
      }),
    );

    console.log(`[Upload] Step Function iniciado: ${sfnResponse.executionArn}`);

    return createSuccessResponse(202, {
      executionId: sfnResponse.executionArn,
      message: 'Conversión iniciada',
      fileName: validatedFile.fileName,
    });
  } catch (error) {
    console.error('[Upload] Error no capturado:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Error interno del servidor');
  }
}
