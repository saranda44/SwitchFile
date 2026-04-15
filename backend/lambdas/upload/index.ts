import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  validateFile,
  validateZipFile,
  sanitizeFileName,
  validateMimeTypeByMagicBytes,
  isZipFile,
  validateExtractedFile,
  isSupportedConversion
} from './validators';
import { extractFilesFromZip, validateZipNotEmpty } from './zip';
import { uploadOriginalFile } from './s3';
import { registerFile, registerConversion } from '../../shared/dynamodb';
import { enqueueConversion, enqueueBatch } from './sqs';
import type { UploadResponse, ProcessingResult } from './types';
import type { ExtractedFile } from './types';

/**
 * Procesa un archivo simple (no ZIP)
 */
async function processSimpleFile(
  userId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  fileBuffer: Buffer,
  targetFormat: string
): Promise<ProcessingResult> {
  // Validar MIME type por magic bytes
  const magicBytesValidation = await validateMimeTypeByMagicBytes(fileBuffer, mimeType);
  if (!magicBytesValidation.isValid) {
    return {
      success: false,
      message: 'Validación de archivo fallida',
      error: magicBytesValidation.error,
    };
  }

  // Usar MIME type detectado si es diferente
  const actualMimeType = magicBytesValidation.actualMimeType || mimeType;

  // Validar archivo (formato y tamaño)
  const validation = validateFile(fileName, fileSize, actualMimeType);
  if (!validation.isValid) {
    return {
      success: false,
      message: 'Validación de archivo fallida',
      error: validation.error,
    };
  }

  // Validar que la conversión sea soportada
  if (!isSupportedConversion(validation.format!, targetFormat)) {
    return {
      success: false,
      message: 'Conversión no soportada',
      error: `No se puede convertir de ${validation.format} a ${targetFormat}`,
    };
  }

  // Sanitizar nombre
  const sanitizedFileName = sanitizeFileName(fileName);

  try {
    const fileId = uuidv4();

    // Registrar archivo original en DynamoDB (tabla Files)
    await registerFile(
      userId,
      sanitizedFileName,
      validation.format!,
      fileSize,
      '', // s3Key temporal, se actualiza después de subir
      'original',
      fileId
    );

    // Subir archivo original a S3
    const s3Key = await uploadOriginalFile(
      userId,
      fileId,
      sanitizedFileName,
      fileBuffer,
      validation.format!
    );

    // Registrar conversión en DynamoDB (tabla Conversions) con estado "pending"
    const conversionId = await registerConversion(
      userId,
      fileId,
      validation.format!,
      targetFormat
    );

    // Encolar en SQS
    await enqueueConversion(
      userId,
      fileId,
      validation.format!,
      targetFormat,
      s3Key
    );

    return {
      success: true,
      conversionId,
      message: 'Archivo cargado y encolado para conversión',
      filesProcessed: 1,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error procesando archivo',
      error: String(error),
    };
  }
}

/**
 * Procesa un archivo ZIP
 */
async function processZipFile(
  userId: string,
  fileSize: number,
  fileBuffer: Buffer,
  targetFormat: string
): Promise<ProcessingResult> {
  // Validar tamaño del ZIP
  const zipValidation = validateZipFile(fileSize);
  if (!zipValidation.isValid) {
    return {
      success: false,
      message: 'Validación de ZIP fallida',
      error: zipValidation.error,
    };
  }

  try {
    // Descomprimir ZIP
    const extractedFiles = await extractFilesFromZip(fileBuffer);

    // Validar que no esté vacío
    if (!validateZipNotEmpty(extractedFiles)) {
      return {
        success: false,
        message: 'El ZIP está vacío',
        error: 'No hay archivos dentro del ZIP',
      };
    }

    // Validar cada archivo extraído
    const validFiles: ExtractedFile[] = [];
    const batchId = uuidv4();

    for (const file of extractedFiles) {
      // Validar MIME type por magic bytes
      const magicBytesValidation = await validateMimeTypeByMagicBytes(
        file.fileBuffer,
        file.mimeType
      );
      if (!magicBytesValidation.isValid) {
        console.warn(
          `Archivo ${file.fileName} rechazado: ${magicBytesValidation.error}`
        );
        continue;
      }

      // Usar MIME type detectado
      file.mimeType = magicBytesValidation.actualMimeType || file.mimeType;

      // Validar archivo (formato y tamaño)
      const validation = validateExtractedFile(file);
      if (!validation.isValid) {
        console.warn(`Archivo ${file.fileName} rechazado: ${validation.error}`);
        continue;
      }

      file.category = validation.category!;
      file.format = validation.format!;
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return {
        success: false,
        message: 'Ningún archivo en el ZIP es válido',
        error: 'Todos los archivos fueron rechazados',
      };
    }

    // Procesar archivos válidos
    const filesToEnqueue: Array<{
      sourceFileId: string;
      sourceFormat: string;
      targetFormat: string;
      s3Key: string;
    }> = [];

    for (const file of validFiles) {
      // Validar que la conversión sea soportada
      if (!isSupportedConversion(file.format, targetFormat)) {
        console.warn(
          `Archivo ${file.fileName} rechazado: conversión ${file.format} → ${targetFormat} no soportada`
        );
        continue;
      }

      const sanitizedFileName = sanitizeFileName(file.fileName);
      const fileId = uuidv4();

      // Registrar archivo original en DynamoDB con batchId
      await registerFile(
        userId,
        sanitizedFileName,
        file.format,
        file.fileSize,
        '', // s3Key temporal
        'original',
        fileId,
        batchId
      );

      // Subir archivo original a S3
      const s3Key = await uploadOriginalFile(
        userId,
        fileId,
        sanitizedFileName,
        file.fileBuffer,
        file.format
      );

      // Registrar conversión en DynamoDB con batchId y estado "pending"
      await registerConversion(
        userId,
        fileId,
        file.format,
        targetFormat,
        batchId
      );

      // Agregar a lista para encolar
      filesToEnqueue.push({
        sourceFileId: fileId,
        sourceFormat: file.format,
        targetFormat,
        s3Key,
      });
    }

    if (filesToEnqueue.length === 0) {
      return {
        success: false,
        message: 'Ningún archivo del ZIP soporta la conversión solicitada',
        error: `No se puede convertir ningún archivo a ${targetFormat}`,
      };
    }

    // Encolar todos los mensajes en SQS
    await enqueueBatch(userId, filesToEnqueue, batchId);

    return {
      success: true,
      batchId,
      message: `${filesToEnqueue.length} archivos cargados y encolados`,
      filesProcessed: filesToEnqueue.length,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error procesando ZIP',
      error: String(error),
    };
  }
}

/**
 * Handler principal de Lambda
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extraer userId del token (authorizer de API Gateway)
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: 'No autorizado',
          error: 'User ID no encontrado',
        } as UploadResponse),
      };
    }

    // Parsear body
    const body = JSON.parse(event.body || '{}');
    const fileName = body.fileName as string;
    const fileSize = body.fileSize as number;
    const mimeType = body.mimeType as string;
    const fileBase64 = body.fileBase64 as string;
    const targetFormat = body.targetFormat as string;

    // Validar campos requeridos
    if (!fileName || !fileSize || !mimeType || !fileBase64 || !targetFormat) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Campos requeridos faltantes',
        } as UploadResponse),
      };
    }

    // Decodificar archivo de Base64 a Buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Detectar si es ZIP o archivo simple y procesar
    let result: ProcessingResult;

    if (isZipFile(mimeType)) {
      result = await processZipFile(userId, fileSize, fileBuffer, targetFormat);
    } else {
      result = await processSimpleFile(userId, fileName, fileSize, mimeType, fileBuffer, targetFormat);
    }

    return {
      statusCode: result.success ? 200 : 400,
      body: JSON.stringify({
        success: result.success,
        conversionId: result.conversionId,
        batchId: result.batchId,
        message: result.message,
        error: result.error,
      } as UploadResponse),
    };
  } catch (error) {
    console.error('Error en handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error interno del servidor',
        error: String(error),
      } as UploadResponse),
    };
  }
};
