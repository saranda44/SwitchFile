/**
 * Interfaz StepFunctionEvent - Evento base que fluye a través del Step Function
 */
export interface StepFunctionEvent {
  // Información del usuario
  userId: string;
  
  // Información del archivo
  fileName: string;
  fileSize: number;
  fileFormat: string;
  isBatch: boolean;
  
  // Formato destino
  targetFormat: string;
  
  // Datos que se van agregando en cada paso
  validationResult?: ValidationStepResult;
  uploadResult?: UploadStepResult;
  registerResult?: RegisterStepResult;
  enqueueResult?: EnqueueStepResult;
  
  // ID único para rastrear el flujo
  executionId?: string;
}

/**
 * Resultado del paso 1: Validate
 */
export interface ValidationStepResult {
  isValid: boolean;
  isBatch: boolean;
  fileCount: number;
  errors?: string[];
}

/**
 * Resultado del paso 2: Upload S3
 */
export interface UploadStepResult {
  s3Key: string;
  s3Keys?: string[]; // Si es batch
}

/**
 * Resultado del paso 3: Register DB
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
 * Payload enviado a SQS por la Lambda 4-enqueueSQS
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