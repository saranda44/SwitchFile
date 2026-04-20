import { APIGatewayEvent, LambdaResponse } from "../shared/types";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AWS_RESOURCES } from '../shared/constants/awsResourceNames';
import { getDocClient } from '../shared/connections/dynamoDBClient';

/**
 * Nombre de la tabla obtenido desde variables de entorno.
 * Se asume definido en configuración (SAM / Serverless / consola).
 */
const TABLE_NAME = AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS;

/**
 * Handler para GET /files
 * 
 * Obtiene todos los archivos del usuario autenticado.
 * - Usa PK = USER#{user_id}
 * - Ordena por SK descendente (archivos más recientes primero)
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    /**
     * Extrae el userId desde el JWT validado por API Gateway.
     * No validamos token aquí porque ya lo hizo el authorizer.
     */
    const userId = event.requestContext.authorizer.jwt.claims.sub;

    /**
     * Query a DynamoDB usando la PK del usuario.
     * ScanIndexForward = false → orden descendente (más recientes primero).
     */
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
      },
      ScanIndexForward: false,
    });

    const { Items } = await getDocClient().send(command);

    /**
     * Respuesta exitosa.
     * Se asegura que siempre regrese un array.
     */
    return {
      statusCode: 200,
      body: JSON.stringify({
        files: Items ?? [],
      }),
    };
  } catch (error) {
    /**
     * Log estructurado para debugging en CloudWatch.
     */
    console.error("getFiles error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error obteniendo archivos",
      }),
    };
  }
};
