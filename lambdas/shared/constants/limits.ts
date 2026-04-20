/**
 * Límites de tamaño de archivo por tipo
 * Todos los valores en bytes
 */

export const FILE_SIZE_LIMITS = {
  // Imágenes: 50 MB
  IMAGE: 50 * 1024 * 1024, // 50 MB
  
  // Audio: 100 MB
  AUDIO: 100 * 1024 * 1024, // 100 MB
  
  // Video: 500 MB
  VIDEO: 500 * 1024 * 1024, // 500 MB
  
  // Documentos: 50 MB
  DOCUMENT: 50 * 1024 * 1024, // 50 MB
  
  // ZIP (lote): 500 MB
  BATCH_ZIP: 500 * 1024 * 1024, // 500 MB
} as const;

/**
 * Función auxiliar para obtener el límite según el tipo de archivo
 */
export function getFileSizeLimit(format: string): number {
  const lowerFormat = format.toLowerCase();
  
  // Imágenes
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tiff'].includes(lowerFormat)) {
    return FILE_SIZE_LIMITS.IMAGE;
  }
  
  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(lowerFormat)) {
    return FILE_SIZE_LIMITS.AUDIO;
  }
  
  // Video
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(lowerFormat)) {
    return FILE_SIZE_LIMITS.VIDEO;
  }
  
  // Documentos
  if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html'].includes(lowerFormat)) {
    return FILE_SIZE_LIMITS.DOCUMENT;
  }
  
  // ZIP
  if (lowerFormat === 'zip') {
    return FILE_SIZE_LIMITS.BATCH_ZIP;
  }
  
  // Por defecto, usa el límite más pequeño (imagen)
  return FILE_SIZE_LIMITS.IMAGE;
}
