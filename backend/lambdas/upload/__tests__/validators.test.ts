// file-type es ESM puro; se mockea para no romper el entorno Jest (CommonJS)
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

import {
  validateFile,
  sanitizeFileName,
  isSupportedConversion,
  isZipFile,
  validateZipFile,
} from '../validators';

describe('validateFile', () => {
  it('retorna isValid:true para una imagen PNG válida dentro del límite', () => {
    const result = validateFile('foto.png', 1024, 'image/png');
    expect(result.isValid).toBe(true);
    expect(result.format).toBe('png');
    expect(result.category).toBe('images');
  });

  it('retorna isValid:false para un MIME type no soportado', () => {
    const result = validateFile('archivo.exe', 1024, 'application/x-msdownload');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/MIME type no soportado/);
  });

  it('retorna isValid:false cuando el archivo excede el límite de tamaño', () => {
    const exceedLimit = 51 * 1024 * 1024; // 51 MB, límite de imágenes es 50 MB
    const result = validateFile('foto.png', exceedLimit, 'image/png');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/demasiado grande/);
  });
});

describe('sanitizeFileName', () => {
  it('elimina caracteres de path traversal y slashes', () => {
    expect(sanitizeFileName('../secret/../../etc/passwd')).toBe('secretetcpasswd');
  });

  it('elimina null bytes y caracteres inválidos de Windows', () => {
    expect(sanitizeFileName('archivo\0<>|?.txt')).toBe('archivo.txt');
  });
});

describe('isSupportedConversion', () => {
  it('retorna true para una conversión válida (png → jpg)', () => {
    expect(isSupportedConversion('png', 'jpg')).toBe(true);
  });

  it('retorna false cuando el formato de origen y destino son iguales', () => {
    expect(isSupportedConversion('mp3', 'mp3')).toBe(false);
  });

  it('retorna false para una conversión no soportada (mp3 → pdf)', () => {
    expect(isSupportedConversion('mp3', 'pdf')).toBe(false);
  });
});

describe('isZipFile', () => {
  it('detecta application/zip como ZIP', () => {
    expect(isZipFile('application/zip')).toBe(true);
  });

  it('no considera image/png como ZIP', () => {
    expect(isZipFile('image/png')).toBe(false);
  });
});

describe('validateZipFile', () => {
  it('retorna isValid:true para un ZIP dentro del límite', () => {
    const result = validateZipFile(10 * 1024 * 1024); // 10 MB
    expect(result.isValid).toBe(true);
  });

  it('retorna isValid:false cuando el ZIP excede 500 MB', () => {
    const result = validateZipFile(501 * 1024 * 1024);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/ZIP demasiado grande/);
  });
});
