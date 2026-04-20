import { handler } from '../enqueueSQS/handler';

jest.mock('../shared/connections/sqsClient');
jest.mock('../shared/constants/awsResourceNames', () => ({
  ...jest.requireActual('../shared/constants/awsResourceNames'),
  AWS_RESOURCES: {
    SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue.fifo',
    S3_BUCKET_UPLOADS: 'test-uploads-bucket',
    STEP_FUNCTION_ARN: 'arn:aws:states:us-east-1:123456789:stateMachine:test',
    DYNAMODB_TABLE_FILES: 'test-files-table',
    DYNAMODB_TABLE_CONVERSIONS: 'test-conversions-table',
  },
}));

import { getSQSClient } from '../shared/connections/sqsClient';

const mockGetSQSClient = getSQSClient as jest.Mock;
const mockSQSSend = jest.fn();

const singleEvent = {
  userId: 'user-abc',
  isBatch: false,
  fileName: 'photo.png',
  fileId: 'file-001',
  fileSize: 1024,
  s3Key: 'uploads/user-abc/file-001/photo.png',
  fileFormat: 'png',
  targetFormat: 'jpg',
  registerResult: { fileId: 'file-001', conversionId: 'conv-id-001' },
};

const batchEvent = {
  userId: 'user-abc',
  isBatch: true,
  targetFormat: 'jpg',
  batchId: 'batch-001',
  files: [
    { fileName: 'img1.png', fileId: 'file-001', fileFormat: 'png', s3Key: 'uploads/user-abc/file-001/img1.png', fileSize: 512, targetFormat: 'jpg' },
    { fileName: 'img2.webp', fileId: 'file-002', fileFormat: 'webp', s3Key: 'uploads/user-abc/file-002/img2.webp', fileSize: 256, targetFormat: 'jpg' },
  ],
  registerResult: {
    records: [
      { fileId: 'file-001', conversionId: 'conv-id-001' },
      { fileId: 'file-002', conversionId: 'conv-id-002' },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSQSSend.mockResolvedValue({ Successful: [{ MessageId: 'msg-001' }], Failed: [] });
  mockGetSQSClient.mockReturnValue({ send: mockSQSSend });
});

it('sends the correct SQS message body and returns event with enqueueResult', async () => {
  mockSQSSend.mockResolvedValue({ Successful: [{ MessageId: 'msg-abc' }], Failed: [] });

  const result = await handler(singleEvent as any);

  const entry = mockSQSSend.mock.calls[0][0].input.Entries[0];
  const message = JSON.parse(entry.MessageBody);

  expect(message.userId).toBe('user-abc');
  expect(message.fileId).toBe('file-001');
  expect(message.sourceFormat).toBe('png');
  expect(message.targetFormat).toBe('jpg');
  expect(message.conversionId).toBe('conv-id-001');
  expect(message.isBatch).toBe(false);
  expect(result.enqueueResult?.messageIds).toContain('msg-abc');
});

it('batch: sends one entry per file with correct fileId->conversionId mapping', async () => {
  mockSQSSend.mockResolvedValue({
    Successful: [{ MessageId: 'msg-001' }, { MessageId: 'msg-002' }],
    Failed: [],
  });

  const result = await handler(batchEvent as any);

  const entries = mockSQSSend.mock.calls[0][0].input.Entries;
  const messages = entries.map((e: any) => JSON.parse(e.MessageBody));

  expect(entries).toHaveLength(2);
  expect(messages[0].fileId).toBe('file-001');
  expect(messages[0].conversionId).toBe('conv-id-001');
  expect(messages[0].isBatch).toBe(true);
  expect(messages[1].fileId).toBe('file-002');
  expect(messages[1].conversionId).toBe('conv-id-002');
  expect(result.enqueueResult?.messageIds).toEqual(['msg-001', 'msg-002']);
});

