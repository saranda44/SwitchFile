import JSZip from 'jszip';
import { extractFilesFromZip, validateZipNotEmpty } from '../zip';
import type { ExtractedFile } from '../types';

async function buildZipBuffer(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return Buffer.from(arrayBuffer);
}

describe('validateZipNotEmpty', () => {
  it('retorna true cuando hay archivos extraídos', () => {
    const files = [{ fileName: 'a.png' } as ExtractedFile];
    expect(validateZipNotEmpty(files)).toBe(true);
  });

  it('retorna false cuando la lista de archivos está vacía', () => {
    expect(validateZipNotEmpty([])).toBe(false);
  });
});

describe('extractFilesFromZip', () => {
  it('extrae correctamente los archivos contenidos en el ZIP', async () => {
    const buffer = await buildZipBuffer({ 'imagen.png': 'fake-content' });
    const files = await extractFilesFromZip(buffer);

    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('imagen.png');
    expect(files[0].format).toBe('png');
    expect(files[0].fileSize).toBeGreaterThan(0);
  });

  it('ignora directorios y archivos que comienzan con punto', async () => {
    const zip = new JSZip();
    zip.file('visible.txt', 'hola');
    zip.file('.oculto', 'secreto');
    zip.folder('carpeta'); // directorio vacío
    const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const buffer = Buffer.from(arrayBuffer);

    const files = await extractFilesFromZip(buffer);
    expect(files.map((f) => f.fileName)).toEqual(['visible.txt']);
  });
});
