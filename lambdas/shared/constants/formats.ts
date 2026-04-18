/**
 * Formatos soportados por categoría
 */

export const SUPPORTED_FORMATS = {
  IMAGE: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tiff'],
  AUDIO: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
  VIDEO: ['mp4', 'mov', 'avi', 'webm', 'mkv'],
  DOCUMENT: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html'],
} as const;

/**
 * Todos los formatos soportados (lista plana)
 */
export const ALL_SUPPORTED_FORMATS = [
  ...SUPPORTED_FORMATS.IMAGE,
  ...SUPPORTED_FORMATS.AUDIO,
  ...SUPPORTED_FORMATS.VIDEO,
  ...SUPPORTED_FORMATS.DOCUMENT,
] as const;

/**
 * Tipos de archivo
 */
export type FileCategory = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

/**
 * Obtener categoría por formato
 */
export function getFormatCategory(format: string): FileCategory | null {
  const lowerFormat = format.toLowerCase();
  
  if (SUPPORTED_FORMATS.IMAGE.includes(lowerFormat as any)) return 'IMAGE';
  if (SUPPORTED_FORMATS.AUDIO.includes(lowerFormat as any)) return 'AUDIO';
  if (SUPPORTED_FORMATS.VIDEO.includes(lowerFormat as any)) return 'VIDEO';
  if (SUPPORTED_FORMATS.DOCUMENT.includes(lowerFormat as any)) return 'DOCUMENT';
  
  return null;
}

/**
 * Matriz de conversiones soportadas
 * Indica qué formatos pueden convertirse a cuáles
 */
export const SUPPORTED_CONVERSIONS: Record<string, string[]> = {
  // Imágenes
  png: ['jpg', 'jpeg', 'webp', 'gif', 'svg', 'tiff'],
  jpg: ['png', 'webp', 'gif', 'svg', 'tiff'],
  jpeg: ['png', 'webp', 'gif', 'svg', 'tiff'],
  webp: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'tiff'],
  gif: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'tiff'],
  svg: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff'],
  tiff: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
  
  // Audio
  mp3: ['wav', 'flac', 'aac', 'ogg'],
  wav: ['mp3', 'flac', 'aac', 'ogg'],
  flac: ['mp3', 'wav', 'aac', 'ogg'],
  aac: ['mp3', 'wav', 'flac', 'ogg'],
  ogg: ['mp3', 'wav', 'flac', 'aac'],
  
  // Video
  mp4: ['mov', 'avi', 'webm', 'mkv'],
  mov: ['mp4', 'avi', 'webm', 'mkv'],
  avi: ['mp4', 'mov', 'webm', 'mkv'],
  webm: ['mp4', 'mov', 'avi', 'mkv'],
  mkv: ['mp4', 'mov', 'avi', 'webm'],
  
  // Documentos
  pdf: ['txt', 'html'],
  docx: ['pdf', 'txt', 'html'],
  xlsx: ['pdf', 'csv', 'html'],
  pptx: ['pdf'],
  txt: ['pdf', 'docx', 'html'],
  csv: ['pdf', 'xlsx', 'html'],
  html: ['pdf', 'docx', 'txt'],
};

/**
 * Verificar si una conversión es soportada
 */
export function isSupportedConversion(sourceFormat: string, targetFormat: string): boolean {
  const source = sourceFormat.toLowerCase();
  const target = targetFormat.toLowerCase();
  
  if (source === target) return false; // No convertir al mismo formato
  
  const supportedTargets = SUPPORTED_CONVERSIONS[source];
  return supportedTargets ? supportedTargets.includes(target) : false;
}

/**
 * Normalizar formato (quitar puntos, convertir a minúsculas)
 * ejemplo: ".JPG" => "jpg"
 */
export function normalizeFormat(format: string): string {
  return format.toLowerCase().replace(/^\./, '');
}

/**
 * Extraer extensión de nombre de archivo
 * ejemplo: "foto.jpg" => "jpg"
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? normalizeFormat(parts[parts.length - 1]) : '';
}

/**
 * Validar si un formato es soportado
 */
export function isFormatSupported(format: string): boolean {
  const normalized = normalizeFormat(format);
  return ALL_SUPPORTED_FORMATS.includes(normalized as any);
}