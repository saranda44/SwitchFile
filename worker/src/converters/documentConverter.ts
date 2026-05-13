import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} error: ${stderr || error.message}`));
      } else {
        resolve();
      }
    });
  });
}

export async function convertDocument(
  inputPath: string,
  outputPath: string,
  sourceFormat: string,
  targetFormat: string
): Promise<void> {
  const outDir = path.dirname(outputPath);
  const inputBaseName = path.basename(inputPath, `.${sourceFormat}`);

  const libreofficeFormats = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html']);

  if (libreofficeFormats.has(targetFormat)) {
    await runCommand('soffice', [
      '--headless',
      '--convert-to', targetFormat,
      '--outdir', outDir,
      inputPath,
    ]);

    const generatedFile = path.join(outDir, `${inputBaseName}.${targetFormat}`);
    if (generatedFile !== outputPath && fs.existsSync(generatedFile)) {
      fs.renameSync(generatedFile, outputPath);
    }
  } else {
    throw new Error(`Conversión de documento no soportada: ${sourceFormat} → ${targetFormat}`);
  }
}
