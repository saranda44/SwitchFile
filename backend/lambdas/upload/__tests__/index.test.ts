import type { APIGatewayProxyEvent } from 'aws-lambda';

// --- Mocks ---
jest.mock('../validators', () => ({
  validateFile: jest.fn(),
  validateZipFile: jest.fn(),
  sanitizeFileName: jest.fn((n: string) => n),
  validateMimeTypeByMagicBytes: jest.fn(),
  isZipFile: jest.fn(),
  validateExtractedFile: jest.fn(),
  isSupportedConversion: jest.fn(),
}));
jest.mock('../zip', () => ({
  extractFilesFromZip: jest.fn(),
  validateZipNotEmpty: jest.fn(),
}));
jest.mock('../s3', () => ({ uploadOriginalFile: jest.fn() }));
jest.mock('../../../shared/dynamodb', () => ({
  registerFile: jest.fn(),
  registerConversion: jest.fn(),
}));
jest.mock('../sqs', () => ({
  enqueueConversion: jest.fn(),
  enqueueBatch: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));
jest.mock('dotenv', () => ({ config: jest.fn() }));

import {
  validateFile,
  validateMimeTypeByMagicBytes,
  isZipFile,
  isSupportedConversion,
  sanitizeFileName,
} from '../validators';
import { uploadOriginalFile } from '../s3';
import { registerFile, registerConversion } from '../../../shared/dynamodb';
import { enqueueConversion } from '../sqs';
import { handler } from '../index';

// Helper para construir un evento mínimo de API Gateway
function buildEvent(body: object, userId?: string): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    requestContext: {
      authorizer: userId ? { claims: { sub: userId } } : {},
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 401 cuando el userId no está presente en el token', async () => {
    const event = buildEvent({});
    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).message).toBe('No autorizado');
  });

  it('retorna 400 cuando faltan campos requeridos en el body', async () => {
    // Falta targetFormat
    const event = buildEvent(
      { fileName: 'img.png', fileSize: 1024, mimeType: 'image/png', fileBase64: 'abc' },
      'user-123'
    );
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Campos requeridos faltantes');
  });

  it('retorna 200 y conversionId para un archivo simple válido', async () => {
    (isZipFile as jest.Mock).mockReturnValue(false);
    (validateMimeTypeByMagicBytes as jest.Mock).mockResolvedValue({
      isValid: true,
      actualMimeType: 'image/png',
    });
    (validateFile as jest.Mock).mockReturnValue({
      isValid: true,
      format: 'png',
      category: 'images',
    });
    (isSupportedConversion as jest.Mock).mockReturnValue(true);
    (sanitizeFileName as jest.Mock).mockReturnValue('imagen.png');
    (registerFile as jest.Mock).mockResolvedValue(undefined);
    (uploadOriginalFile as jest.Mock).mockResolvedValue('uploads/user-123/mock-uuid/original.png');
    (registerConversion as jest.Mock).mockResolvedValue('conv-id-1');
    (enqueueConversion as jest.Mock).mockResolvedValue('conv-id-1');

    const fileBase64 = Buffer.from('fake-png-data').toString('base64');
    const event = buildEvent(
      {
        fileName: 'imagen.png',
        fileSize: 1024,
        mimeType: 'image/png',
        fileBase64,
        targetFormat: 'jpg',
      },
      'user-123'
    );

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.conversionId).toBe('conv-id-1');
  });

  it('retorna 400 cuando la validación del archivo falla', async () => {
    (isZipFile as jest.Mock).mockReturnValue(false);
    (validateMimeTypeByMagicBytes as jest.Mock).mockResolvedValue({
      isValid: false,
      error: 'Tipo no soportado',
    });

    const fileBase64 = Buffer.from('bad-data').toString('base64');
    const event = buildEvent(
      {
        fileName: 'mal.exe',
        fileSize: 100,
        mimeType: 'application/x-msdownload',
        fileBase64,
        targetFormat: 'pdf',
      },
      'user-123'
    );

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });
});
