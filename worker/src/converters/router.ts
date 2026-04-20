import { convertImage } from './imageConverter';
import { convertDocument } from './documentConverter';

const IMAGE_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tiff']);
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg']);
const VIDEO_FORMATS = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv']);
const DOCUMENT_FORMATS = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html']);

export async function convert(
  inputPath: string,
  outputPath: string,
  sourceFormat: string,
  targetFormat: string
): Promise<void> {
  const src = sourceFormat.toLowerCase();

  if (IMAGE_FORMATS.has(src)) {
    return convertImage(inputPath, outputPath, targetFormat);
  }

  if (DOCUMENT_FORMATS.has(src)) {
    return convertDocument(inputPath, outputPath, sourceFormat, targetFormat);
  }

  if (AUDIO_FORMATS.has(src) || VIDEO_FORMATS.has(src)) {
    throw new Error(`Conversión de audio/video no implementada en esta versión`);
  }

  throw new Error(`Formato no soportado: ${sourceFormat}`);
}
