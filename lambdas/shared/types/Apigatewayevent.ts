/**
 * Interfaz APIGatewayEvent - Evento de API Gateway con autenticación de Cognito
 */
export interface APIGatewayEvent {
  // Información de la solicitud
  httpMethod: string; // GET, POST, PUT, DELETE, etc.
  path: string; // Ruta del endpoint (/upload, /vault/{id}, etc.)
  headers: Record<string, string>; // Headers HTTP
  
  // Autenticación Cognito
  requestContext: {
    authorizer: {
      claims: {
        sub: string; // userId (REQUERIDO)
        email?: string;
        [key: string]: any;
      };
    };
  };
  
  // Parámetros
  pathParameters?: Record<string, string> | null; // {id, fileId, etc.}
  queryStringParameters?: Record<string, string> | null; // Query params
  
  // Body de la solicitud
  body?: string | null; // JSON stringificado
  isBase64Encoded?: boolean;
  
  // Información adicional
  requestId?: string;
  stage?: string;
  sourceIp?: string;
}

/**
 * DTO para extraer userId del evento
 */
export interface AuthenticatedUser {
  userId: string; // sub del JWT
  email?: string;
}

/**
 * DTO para parsear body JSON de forma segura
 */
export interface ParsedBody<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Respuesta estandarizada de Lambda (API Gateway)
 */
export interface LambdaResponse<T = any> {
  statusCode: number;
  headers?: Record<string, string>;
  body: string; // JSON stringificado
}

/**
 * Cuerpo de respuesta exitosa
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Cuerpo de respuesta con error
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Helpers para crear respuestas
 */
export function createSuccessResponse<T>(
  statusCode: number,
  data: T,
  message?: string
): LambdaResponse<SuccessResponse<T>> {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      data,
      message,
    }),
  };
}

export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): LambdaResponse<ErrorResponse> {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
        details,
      },
    }),
  };
}