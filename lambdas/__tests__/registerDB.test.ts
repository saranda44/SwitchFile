import { handler } from '../registerDB/handler';

jest.mock('../shared/queries/fileQueries');
jest.mock('../shared/queries/conversionQueries');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

import { getFileById, createFile } from '../shared/queries/fileQueries';
import { createConversion } from '../shared/queries/conversionQueries';
import { randomUUID } from 'crypto';

const mockGetFileById = getFileById as jest.Mock;
const mockCreateFile = createFile as jest.Mock;
const mockCreateConversion = createConversion as jest.Mock;
const mockRandomUUID = randomUUID as jest.Mock;

const singleEvent = {
  userId: 'user-abc',
  isBatch: false,
  fileName: 'photo.png',
  fileId: 'file-001',
  fileSize: 1024,
  s3Key: 'uploads/user-abc/file-001/photo.png',
  fileFormat: 'png',
  targetFormat: 'jpg',
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
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFileById.mockResolvedValue(null);
  mockCreateFile.mockResolvedValue({});
  mockCreateConversion.mockResolvedValue({});
  mockRandomUUID.mockReturnValue('conv-id-001');
});

it('registers file and conversion in DB and returns event enriched with registerResult', async () => {
  const result = await handler(singleEvent as any);

  expect(mockCreateFile).toHaveBeenCalledWith(
    'user-abc',
    'file-001',
    expect.objectContaining({ fileName: 'photo.png', format: 'png', s3Key: 'uploads/user-abc/file-001/photo.png', type: 'original', isBatch: false }),
  );
  expect(mockCreateConversion).toHaveBeenCalledWith(
    'user-abc',
    'conv-id-001',
    expect.objectContaining({ sourceFileId: 'file-001', sourceFormat: 'png', targetFormat: 'jpg', isBatch: false }),
  );
  expect(result.registerResult).toEqual({ fileId: 'file-001', conversionId: 'conv-id-001' });
});

it('skips createFile when the file already exists', async () => {
  mockGetFileById.mockResolvedValue({ PK: 'USER#user-abc', SK: 'FILE#file-001' });

  const result = await handler(singleEvent as any);

  expect(mockCreateFile).not.toHaveBeenCalled();
  expect(mockCreateConversion).toHaveBeenCalledTimes(1);
  expect(result.registerResult?.conversionId).toBe('conv-id-001');
});

it('batch: creates file and conversion for each file and returns one record per file', async () => {
  mockRandomUUID.mockReturnValueOnce('conv-id-001').mockReturnValueOnce('conv-id-002');

  const result = await handler(batchEvent as any);

  expect(mockCreateFile).toHaveBeenCalledTimes(2);
  expect(mockCreateConversion).toHaveBeenCalledTimes(2);
  expect(result.registerResult?.records).toEqual([
    { fileId: 'file-001', conversionId: 'conv-id-001' },
    { fileId: 'file-002', conversionId: 'conv-id-002' },
  ]);
});
