/**
 * Evento de HTTP API Gateway v2 con JWT authorizer (Cognito)
 */
export interface APIGatewayEvent {
  routeKey: string;
  rawPath: string;
  headers: Record<string, string>;
  requestContext: {
    http: {
      method: string;
      path: string;
      sourceIp: string;
    };
    authorizer: {
      jwt: {
        claims: {
          sub: string;
          email?: string;
          [key: string]: any;
        };
      };
    };
    requestId: string;
    stage: string;
  };
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
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