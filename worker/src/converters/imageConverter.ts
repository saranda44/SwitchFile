import sharp from 'sharp';

const SHARP_FORMATS: Record<string, keyof sharp.FormatEnum> = {
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  gif: 'gif',
  tiff: 'tiff',
};

export async function convertImage(
  inputPath: string,
  outputPath: string,
  targetFormat: string
): Promise<void> {
  const format = SHARP_FORMATS[targetFormat.toLowerCase()];
  if (!format) {
    throw new Error(`Formato de imagen no soportado: ${targetFormat}`);
  }

  await sharp(inputPath).toFormat(format).toFile(outputPath);
}
