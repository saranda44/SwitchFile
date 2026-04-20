import { APIGatewayProxyEventV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaResponse, JwtAuthorizer } from "../../types/api";

/**
 * Cliente de DynamoDB reutilizable.
 * Se declara fuera del handler para aprovechar el container reuse de Lambda.
 */
const client = new DynamoDBClient({});

/**
 * Nombre de la tabla obtenido desde variables de entorno.
 * Se asume definido en configuración (SAM / Serverless / consola).
 */
const TABLE_NAME = process.env.FILES_TABLE as string;

/**
 * Handler para GET /files
 * 
 * Obtiene todos los archivos del usuario autenticado.
 * - Usa PK = USER#{user_id}
 * - Ordena por SK descendente (archivos más recientes primero)
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<LambdaResponse> => {
  try {
    /**
     * Extrae el userId desde el JWT validado por API Gateway.
     * No validamos token aquí porque ya lo hizo el authorizer.
     */
    const authorizer = event.requestContext.authorizer as JwtAuthorizer;
    const userId = authorizer.jwt.claims.sub;

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

    const { Items } = await client.send(command);

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
