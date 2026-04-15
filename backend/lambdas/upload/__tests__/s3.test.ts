import { uploadOriginalFile } from '../s3';

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn((input) => input),
    __mockSend: mockSend,
  };
});

function getMockSend() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (require('@aws-sdk/client-s3') as any).__mockSend as jest.Mock;
}

describe('uploadOriginalFile', () => {
  beforeEach(() => {
    getMockSend().mockReset();
  });

  it('sube el archivo y retorna el s3Key correcto', async () => {
    getMockSend().mockResolvedValue({});

    const key = await uploadOriginalFile(
      'user-123',
      'file-abc',
      'foto.png',
      Buffer.from('data'),
      'png'
    );

    expect(key).toBe('uploads/user-123/file-abc/original.png');
    expect(getMockSend()).toHaveBeenCalledTimes(1);
  });
});
