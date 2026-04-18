/**
 * Mensajes de error estandarizados
 */

export const ERROR_MESSAGES = {
    //Sanitización
    INVALID_FILE_NAME: 'El nombre del archivo contiene caracteres no permitidos.',
    INVALID_FILE_TYPE: 'El tipo de archivo no coincide con el formato declarado.',
    // Validación de formato
    INVALID_FORMAT: 'El formato del archivo no es soportado.',
    UNSUPPORTED_CONVERSION: 'Conversión no soportada.',
    INVALID_TARGET_FORMAT: 'El formato destino no es válido o no es soportado.',
    
    // Validación de tamaño
    FILE_TOO_LARGE: 'El archivo excede el tamaño máximo permitido.',
    BATCH_TOO_LARGE: 'El archivo ZIP excede el tamaño máximo permitido.',
    
    // Validación de ZIP
    INVALID_ZIP: 'El archivo ZIP está corrupto o no es un archivo ZIP válido.',
    EMPTY_ZIP: 'El archivo ZIP está vacío. Debe contener al menos un archivo.',
    ZIP_CONTAINS_INVALID_FILES: 'El archivo ZIP contiene archivos no soportados.',
    
    // Validación general
    NO_FILES: 'No se proporcionó ningún archivo para procesar.',
    MISSING_TARGET_FORMAT: 'Debe especificar el formato destino para la conversión.',
    
    // Autenticación y autorización
    UNAUTHORIZED: 'No estás autenticado. Por favor, inicia sesión.',
    FORBIDDEN: 'No tienes permisos para acceder a este recurso.',
    INVALID_USER_ID: 'El ID de usuario no es válido.',
    
    // Base de datos
    FILE_NOT_FOUND: 'El archivo solicitado no fue encontrado.',
    CONVERSION_NOT_FOUND: 'La conversión solicitada no fue encontrada.',
    DATABASE_ERROR: 'Error al acceder a la base de datos. Por favor, intenta más tarde.',
    
    // S3
    UPLOAD_FAILED: 'Error al subir el archivo. Por favor, intenta nuevamente.',
    DOWNLOAD_FAILED: 'Error al descargar el archivo. Por favor, intenta más tarde.',
    S3_ERROR: 'Error al acceder al almacenamiento. Por favor, intenta más tarde.',
    
    // SQS
    ENQUEUE_FAILED: 'Error al encolar la conversión. Por favor, intenta nuevamente.',
    
    // Step Function
    STEP_FUNCTION_FAILED: 'Error en el procesamiento de la solicitud. Por favor, intenta más tarde.',
    VALIDATION_FAILED: 'La validación del archivo falló. Por favor, verifica los detalles.',
    
    // General
    INTERNAL_ERROR: 'Error interno del servidor. Por favor, intenta más tarde.',
    BAD_REQUEST: 'Solicitud inválida. Por favor, verifica los parámetros.',
    
    // HTTP Status Messages
    OK_200: 'Solicitud exitosa.',
    CREATED_201: 'Recurso creado exitosamente.',
    BAD_REQUEST_400: 'Solicitud inválida.',
    UNAUTHORIZED_401: 'No autenticado.',
    FORBIDDEN_403: 'No autorizado.',
    NOT_FOUND_404: 'Recurso no encontrado.',
    INTERNAL_SERVER_ERROR_500: 'Error interno del servidor.',
} as const;

/**
 * Códigos de error HTTP
 */
export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Códigos de error personalizados de negocio
 */
export const ERROR_CODES = {
    // Validación
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_FORMAT_ERROR: 'INVALID_FORMAT_ERROR',
    FILE_SIZE_ERROR: 'FILE_SIZE_ERROR',
    UNSUPPORTED_CONVERSION_ERROR: 'UNSUPPORTED_CONVERSION_ERROR',
    
    // Autenticación
    AUTH_ERROR: 'AUTH_ERROR',
    UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
    
    // Datos
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    
    // AWS Services
    S3_ERROR: 'S3_ERROR',
    SQS_ERROR: 'SQS_ERROR',
    DYNAMODB_ERROR: 'DYNAMODB_ERROR',
    
    // General
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;