import { handler } from '../upload/handler';

jest.mock('../shared/utils/helpers');
jest.mock('../shared/validators/formatValidators');
jest.mock('../shared/validators/idValidators');
jest.mock('../shared/connections/s3Client');
jest.mock('../shared/connections/stepFunctionClient');
jest.mock('jszip', () => jest.fn());
jest.mock('../shared/constants/awsResourceNames', () => ({
  ...jest.requireActual('../shared/constants/awsResourceNames'),
  AWS_RESOURCES: {
    S3_BUCKET_UPLOADS: 'test-uploads-bucket',
    STEP_FUNCTION_ARN: 'arn:aws:states:us-east-1:123456789:stateMachine:test',
    SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue.fifo',
    DYNAMODB_TABLE_FILES: 'test-files-table',
    DYNAMODB_TABLE_CONVERSIONS: 'test-conversions-table',
  },
}));

import { extractUserIdFromEvent, parseMultipart } from '../shared/utils/helpers';
import {
  isZipFile,
  validateFileSize,
  sanitizeFileName,
  validateFileExtension,
  validateConversionSupported,
} from '../shared/validators/formatValidators';
import { generateNewId } from '../shared/validators/idValidators';
import getS3Client from '../shared/connections/s3Client';
import getStepFunctionsClient from '../shared/connections/stepFunctionClient';
import JSZip from 'jszip';

const mockExtractUserId = extractUserIdFromEvent as jest.Mock;
const mockParseMultipart = parseMultipart as jest.Mock;
const mockIsZipFile = isZipFile as jest.Mock;
const mockValidateFileSize = validateFileSize as jest.Mock;
const mockSanitizeFileName = sanitizeFileName as jest.Mock;
const mockValidateFileExtension = validateFileExtension as jest.Mock;
const mockValidateConversionSupported = validateConversionSupported as jest.Mock;
const mockGenerateNewId = generateNewId as jest.Mock;
const mockGetS3Client = getS3Client as jest.Mock;
const mockGetSFNClient = getStepFunctionsClient as jest.Mock;
const MockJSZip = (JSZip as unknown) as jest.Mock;

const mockS3Send = jest.fn();
const mockSFNSend = jest.fn();

const makeEvent = () => ({
  headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' },
  body: '',
  isBase64Encoded: false,
  requestContext: { authorizer: { jwt: { claims: { sub: 'user-abc' } } } },
});

const makeMultipart = (overrides: Record<string, unknown> = {}) => ({
  files: [
    {
      fieldname: 'file',
      filename: 'photo.png',
      content: Buffer.from('fake-image-content'),
      contentType: 'image/png',
      encoding: '7bit',
    },
  ],
  targetFormat: 'jpg',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();

  mockExtractUserId.mockReturnValue('user-abc');
  mockParseMultipart.mockResolvedValue(makeMultipart());
  mockIsZipFile.mockResolvedValue(false);
  mockSanitizeFileName.mockReturnValue({ isValid: true, sanitized: 'photo.png' });
  mockValidateFileExtension.mockReturnValue({ isValid: true, format: 'png' });
  mockValidateFileSize.mockReturnValue({ isValid: true });
  mockValidateConversionSupported.mockReturnValue({ isValid: true });
  mockGenerateNewId.mockReturnValue('generated-id-001');
  mockS3Send.mockResolvedValue({});
  mockSFNSend.mockResolvedValue({ executionArn: 'arn:aws:states:::execution:test:abc123' });
  mockGetS3Client.mockReturnValue({ send: mockS3Send });
  mockGetSFNClient.mockReturnValue({ send: mockSFNSend });
});

it('returns 401 when userId is missing from JWT', async () => {
  mockExtractUserId.mockReturnValue(null);

  const response = await handler(makeEvent() as any);

  expect(response.statusCode).toBe(401);
  expect(JSON.parse(response.body).error.code).toBe('AUTH_ERROR');
});

it('returns 400 when the conversion is not supported', async () => {
  mockValidateConversionSupported.mockReturnValue({ isValid: false, error: 'conversión no soportada' });

  const response = await handler(makeEvent() as any);

  expect(response.statusCode).toBe(400);
  expect(JSON.parse(response.body).error.code).toBe('VALIDATION_ERROR');
});

it('returns 400 when the file exceeds the allowed size', async () => {
  mockValidateFileSize.mockReturnValue({ isValid: false, error: 'el archivo supera el límite permitido' });

  const response = await handler(makeEvent() as any);

  expect(response.statusCode).toBe(400);
  expect(JSON.parse(response.body).error.code).toBe('VALIDATION_ERROR');
  expect(JSON.parse(response.body).error.message).toContain('Tamaño inválido');
});

it('returns 400 when the file extension is not supported', async () => {
  mockValidateFileExtension.mockReturnValue({ isValid: false, error: 'extensión no soportada' });

  const response = await handler(makeEvent() as any);

  expect(response.statusCode).toBe(400);
  expect(JSON.parse(response.body).error.code).toBe('VALIDATION_ERROR');
  expect(JSON.parse(response.body).error.message).toContain('Extensión inválida');
});

it('uploads file to S3 and starts Step Function on single-file success', async () => {
  const response = await handler(makeEvent() as any);
  const body = JSON.parse(response.body);

  expect(response.statusCode).toBe(202);

  const putCommand = mockS3Send.mock.calls[0][0];
  expect(putCommand.input.Bucket).toBe('test-uploads-bucket');
  expect(putCommand.input.Key).toContain('uploads/user-abc/generated-id-001');

  const sfnInput = JSON.parse(mockSFNSend.mock.calls[0][0].input.input);
  expect(sfnInput.userId).toBe('user-abc');
  expect(sfnInput.isBatch).toBe(false);
  expect(sfnInput.fileFormat).toBe('png');
  expect(sfnInput.targetFormat).toBe('jpg');
  expect(body.data.executionId).toBe('arn:aws:states:::execution:test:abc123');
});

it('uploads each ZIP file to S3 and starts Step Function with isBatch=true', async () => {
  mockIsZipFile.mockResolvedValue(true);
  mockParseMultipart.mockResolvedValue(
    makeMultipart({
      files: [{ fieldname: 'file', filename: 'batch.zip', content: Buffer.from('PK\x03\x04'), contentType: 'application/zip', encoding: '7bit' }],
    }),
  );
  MockJSZip.mockImplementation(() => ({
    loadAsync: jest.fn().mockResolvedValue({
      files: {
        'image.png': { dir: false, async: jest.fn().mockResolvedValue(Buffer.from('fake-png').buffer) },
      },
    }),
  }));
  mockGenerateNewId.mockReturnValueOnce('batch-id-001').mockReturnValueOnce('file-id-001');

  const response = await handler(makeEvent() as any);
  const body = JSON.parse(response.body);

  expect(response.statusCode).toBe(202);
  expect(mockS3Send).toHaveBeenCalledTimes(1);
  expect(body.data.batchId).toBe('batch-id-001');
  expect(body.data.fileCount).toBe(1);

  const sfnInput = JSON.parse(mockSFNSend.mock.calls[0][0].input.input);
  expect(sfnInput.isBatch).toBe(true);
  expect(sfnInput.files[0].fileId).toBe('file-id-001');
});
