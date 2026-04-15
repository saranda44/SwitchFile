import type { FileCategory } from './types';

// MIME types soportados (fuente única de verdad)
export const ALLOWED_MIME_TYPES: Record<string, { extensions: string[]; category: FileCategory }> = {
  'image/png': { extensions: ['png'], category: 'images' },
  'image/jpeg': { extensions: ['jpg', 'jpeg'], category: 'images' },
  'image/webp': { extensions: ['webp'], category: 'images' },
  'image/gif': { extensions: ['gif'], category: 'images' },
  'image/svg+xml': { extensions: ['svg'], category: 'images' },
  'image/tiff': { extensions: ['tiff'], category: 'images' },
  'audio/mpeg': { extensions: ['mp3'], category: 'audio' },
  'audio/wav': { extensions: ['wav'], category: 'audio' },
  'audio/flac': { extensions: ['flac'], category: 'audio' },
  'audio/aac': { extensions: ['aac'], category: 'audio' },
  'audio/ogg': { extensions: ['ogg'], category: 'audio' },
  'video/mp4': { extensions: ['mp4'], category: 'video' },
  'video/quicktime': { extensions: ['mov'], category: 'video' },
  'video/x-msvideo': { extensions: ['avi'], category: 'video' },
  'video/webm': { extensions: ['webm'], category: 'video' },
  'video/x-matroska': { extensions: ['mkv'], category: 'video' },
  'application/pdf': { extensions: ['pdf'], category: 'documents' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extensions: ['docx'], category: 'documents' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extensions: ['xlsx'], category: 'documents' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extensions: ['pptx'], category: 'documents' },
  'text/plain': { extensions: ['txt'], category: 'documents' },
  'text/csv': { extensions: ['csv'], category: 'documents' },
  'text/html': { extensions: ['html'], category: 'documents' },
};

// Límites de tamaño en bytes (derivados de las categorías)
export const FILE_SIZE_LIMITS: Record<FileCategory, number> = {
  images: 50 * 1024 * 1024, // 50 MB
  audio: 100 * 1024 * 1024, // 100 MB
  video: 500 * 1024 * 1024, // 500 MB
  documents: 50 * 1024 * 1024, // 50 MB
};

export const ZIP_SIZE_LIMIT = 500 * 1024 * 1024; // 500 MB

// AWS Configuration
export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  s3: {
    uploadsBucket: process.env.S3_UPLOADS_BUCKET || 'switchfile-uploads',
    convertedBucket: process.env.S3_CONVERTED_BUCKET || 'switchfile-converted',
    uploadPrefix: 'uploads',
    convertedPrefix: 'converted',
  },
  dynamodb: {
    filesTable: process.env.DYNAMODB_FILES_TABLE || 'Files',
    conversionsTable: process.env.DYNAMODB_CONVERSIONS_TABLE || 'Conversions',
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || '',
  },
};