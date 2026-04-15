import JSZip from 'jszip';
import mime from 'mime-types';
import type { ExtractedFile } from './types';

/**
 * Descomprime un archivo ZIP y extrae todos los archivos dentro
 */
export async function extractFilesFromZip(zipBuffer: Buffer): Promise<ExtractedFile[]> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    const extractedFiles: ExtractedFile[] = [];

    // Itera sobre cada archivo en el ZIP
    for (const [filePath, zipEntry] of Object.entries(zip.files)) {
      // Ignora directorios y archivos ocultos
      if (zipEntry.dir || filePath.startsWith('.')) {
        continue;
      }

      const fileBuffer = await zipEntry.async('nodebuffer');
      const fileName = filePath.split('/').pop() || filePath; // Obtiene solo el nombre del archivo

      // Obtiene el MIME type (fallback a octet-stream)
      const mimeType = mime.lookup(fileName) || 'application/octet-stream';

      // Extrae la extensión del nombre del archivo
      const format = fileName.split('.').pop()?.toLowerCase() || '';

      extractedFiles.push({
        fileName,
        fileBuffer,
        fileSize: fileBuffer.length,
        mimeType: mimeType as string,
        format,
        category: 'images', // Placeholder, se validará después
      });
    }

    return extractedFiles;
  } catch (error) {
    throw new Error(`Error descomprimiendo ZIP: ${error}`);
  }
}

/**
 * Valida que el ZIP no esté vacío
 */
export function validateZipNotEmpty(files: ExtractedFile[]): boolean {
  return files.length > 0;
}