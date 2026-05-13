import { convertImage } from './imageConverter';
import { convertDocument } from './documentConverter';

const IMAGE_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff']);
const DOCUMENT_FORMATS = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html']);

export type Category = 'Image' | 'Document';

export function getCategory(format: string): Category {
  const f = format.toLowerCase();
  if (IMAGE_FORMATS.has(f)) return 'Image';
  if (DOCUMENT_FORMATS.has(f)) return 'Document';
  throw new Error(`Formato no soportado: ${format}`);
}

export async function convert(
  inputPath: string,
  outputPath: string,
  sourceFormat: string,
  targetFormat: string
): Promise<void> {
  const category = getCategory(sourceFormat);

  if (category === 'Image') {
    return convertImage(inputPath, outputPath, targetFormat);
  }

  return convertDocument(inputPath, outputPath, sourceFormat, targetFormat);
}
