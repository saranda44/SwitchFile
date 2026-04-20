export interface Conversion {
  conversionId: string; // derived from SK: CONV#timestamp#uuid
  sourceFileId: string;
  sourceFileName?: string;
  sourceFormat: string;
  targetFormat: string;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  isBatch: boolean;
  batchId?: string;
  createdAt: string;
  PK?: string;
  SK?: string;
}

export interface FilePreview {
  url: string;
  type: string;
  isSupported: boolean;
}

export interface VaultFile {
  fileId: string;
  fileName: string;
  format: string;
  fileSize: number;
  type: "original" | "converted";
  isBatch: boolean;
  batchId?: string;
  createdAt: string;
  preview?: FilePreview;
}

export interface VaultFileDetail {
  file: VaultFile;
  conversions: Conversion[];
  sourceFile: VaultFile | null;
}

export interface DownloadResponse {
  url: string;
  fileName: string;
  format: string;
  fileSize: number;
  expiresIn: number;
}

export interface ReconvertResponse {
  sqsMessageId: string;
  status: "queued";
  conversionId: string;
}
