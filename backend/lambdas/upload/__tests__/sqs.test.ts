jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { enqueueConversion, enqueueBatch } from '../sqs';

jest.mock('@aws-sdk/client-sqs', () => {
  const mockSend = jest.fn();
  return {
    SQSClient: jest.fn(() => ({ send: mockSend })),
    SendMessageCommand: jest.fn((input) => input),
    __mockSend: mockSend,
  };
});

function getMockSend() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (require('@aws-sdk/client-sqs') as any).__mockSend as jest.Mock;
}

describe('enqueueConversion', () => {
  beforeEach(() => {
    getMockSend().mockReset();
  });

  it('encola el mensaje y retorna un conversionId (UUID)', async () => {
    getMockSend().mockResolvedValue({ MessageId: 'msg-1' });

    const conversionId = await enqueueConversion(
      'user-1',
      'file-1',
      'png',
      'jpg',
      'uploads/user-1/file-1/original.png'
    );

    expect(typeof conversionId).toBe('string');
    expect(conversionId).toBe('mock-uuid');
    expect(getMockSend()).toHaveBeenCalledTimes(1);
  });
});

describe('enqueueBatch', () => {
  beforeEach(() => {
    getMockSend().mockReset();
  });

  it('encola múltiples archivos y retorna un conversionId por cada uno', async () => {
    getMockSend().mockResolvedValue({ MessageId: 'msg-x' });

    const files = [
      { sourceFileId: 'f1', sourceFormat: 'png', targetFormat: 'jpg', s3Key: 'key1' },
      { sourceFileId: 'f2', sourceFormat: 'png', targetFormat: 'jpg', s3Key: 'key2' },
    ];

    const ids = await enqueueBatch('user-1', files, 'batch-abc');

    expect(ids).toHaveLength(2);
    expect(getMockSend()).toHaveBeenCalledTimes(2);
  });
});
