/**
 * Interfaz StepFunctionEvent - Evento base que fluye a través del Step Function
 *
 * El handler /upload sube a S3 antes de iniciar el Step Function,
 * por lo que el evento ya trae s3Key.
 * El Step Function solo ejecuta: Register DB → Enqueue SQS.
 */
export interface StepFunctionEvent {
    // Información del usuario
    userId: string;
    

    // Archivo simple
    fileName?: string;
    fileSize?: number;
    s3Key?: string;      // Ruta en S3 del archivo ya subido
    fileFormat?: string;

    // Formato destino (único)
    targetFormat: string;

    // Batch (ZIP)
    isBatch: boolean;
    batchId?: string;
    files?: Array<{
        fileName: string;
        fileFormat: string;
        s3Key: string;     // Ruta en S3 de cada archivo del lote
        fileSize: number;
        targetFormat: string;
    }>;

    // Resultados que agregan las lambdas del Step Function
    registerResult?: RegisterStepResult;
    enqueueResult?: EnqueueStepResult;

    // ID único para rastrear el flujo
    executionId?: string;
}

/**
 * Resultado del paso: Register DB
 */
export interface RegisterStepResult {
    fileId: string;
    fileIds?: string[]; // Si es batch
    conversionId: string;
    conversionIds?: string[]; // Si es batch
}

/**
 * Resultado del paso 4: Enqueue SQS
 */
export interface EnqueueStepResult {
    messageId: string;
    messageIds?: string[]; // Si es batch
}

/**
 * Payload enviado a SQS por la Lambda Enqueue SQS
 */
export interface SQSConversionMessage {
    userId: string;
    fileId: string;
    s3Key: string;
    sourceFormat: string;
    targetFormat: string;
    conversionId: string;
    isBatch: boolean;
    batchId?: string;
}

/**
 * DTO para la respuesta final del Step Function
 */
export interface StepFunctionResult {
    success: boolean;
    executionId?: string;
    message?: string;
    data?: {
        conversionId: string;
        conversionIds?: string[];
        messageId: string;
        messageIds?: string[];
    };
    error?: {
        code: string;
        message: string;
        step: string; // Nombre del paso que falló
    };
}