/**
 * General Helpers
 * Funciones auxiliares generales del proyecto
 */


import Busboy from 'busboy';
import { APIGatewayEvent, ParsedBody } from '../types/Apigatewayevent';

export interface ParsedFile {
  fieldname: string;
  filename: string;
  content: Buffer;
  contentType: string;
  encoding: string;
}

export interface ParsedMultipart {
  files: ParsedFile[];
  [key: string]: unknown;
}

export function parseMultipart(event: APIGatewayEvent): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const result: ParsedMultipart = { files: [] };

    const bb = Busboy({
      headers: {
        'content-type': (event.headers['content-type'] ?? event.headers['Content-Type']) as string,
      },
    });

    bb.on('file', (fieldname, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('close', () => {
        (result.files as ParsedFile[]).push({
          fieldname,
          filename: info.filename,
          content: Buffer.concat(chunks),
          contentType: info.mimeType,
          encoding: info.encoding,
        });
      });
    });

    bb.on('field', (name, value) => {
      result[name] = value;
    });

    bb.on('close', () => resolve(result));
    bb.on('error', reject);

    // Escribir el body como Buffer para evitar corrupción de bytes binarios > 0x7F
    const body = event.isBase64Encoded
      ? Buffer.from(event.body!, 'base64')
      : Buffer.from(event.body!, 'binary');

    bb.write(body);
    bb.end();
  });
}

/**
 * Extraer userId del evento de API Gateway autenticado con Cognito
 * El userId viene en event.requestContext.authorizer.claims.sub
 */
export function extractUserIdFromEvent(event: APIGatewayEvent): string | null {
  try {
    const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

    if (!userId || typeof userId !== 'string') {
      console.error('[extractUserIdFromEvent] userId no encontrado en evento');
      return null;
    }

    return userId;
  } catch (error) {
    console.error('[extractUserIdFromEvent] Error al extraer userId:', error);
    return null;
  }
}

/**
 * Parsear body JSON de forma segura
 * ApiGateway da el body como string, se tiene que parsear a JSON para usarlo
 */
export function parseRequestBody(bodyString: string | null | undefined): ParsedBody<any> {
  try {
    // Validar que hay body
    if (!bodyString) {
      return {
        success: false,
        error: 'Body no proporcionado',
      };
    }

    // Parsear JSON
    const parsed = JSON.parse(bodyString);

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error('[parseRequestBody] Error al parsear JSON:', error);
    return {
      success: false,
      error: 'JSON inválido en el body de la solicitud',
    };
  }
}


/**
 * Extraer parámetro de path (ej: id de /vault/{id})
 */
export function extractPathParameter(
  event: APIGatewayEvent,
  paramName: string
): string | null {
  try {
    const value = event?.pathParameters?.[paramName];

    if (!value || typeof value !== 'string') {
      console.error(`[extractPathParameter] Parámetro ${paramName} no encontrado`);
      return null;
    }

    return value;
  } catch (error) {
    console.error(`[extractPathParameter] Error al extraer ${paramName}:`, error);
    return null;
  }
}



/**
 * Obtener fecha y hora actual en formato ISO
 * Formato: YYYY-MM-DDThh:mm:ss (sin milisegundos)
 */
export function getCurrentISOString(): string {
  return new Date().toISOString().split('.')[0];
}