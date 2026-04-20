import { APIGatewayProxyEventV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaResponse, JwtAuthorizer } from "../../types/api";

/**
 * Cliente reutilizable de DynamoDB.
 */
const client = new DynamoDBClient({});

/**
 * Tabla de conversiones (metadata del proceso).
 */
const TABLE_NAME = process.env.CONVERSIONS_TABLE as string;

/**
 * Handler para GET /files/{id}
 * 
 * Obtiene el detalle de una conversión específica.
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<LambdaResponse> => {
  try {
    /**
     * Obtiene userId desde JWT validado.
     */
    const authorizer = event.requestContext.authorizer as JwtAuthorizer;
    const userId = authorizer.jwt.claims.sub;

    /**
     * Obtiene el parámetro path {id}.
     */
    const id = event.pathParameters?.id;

    /**
     * Validación básica del parámetro.
     */
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "ID requerido",
        }),
      };
    }

    /**
     * Normalización del SK:
     * - Si ya viene con prefijo → usarlo
     * - Si no → construirlo
     * */
    const SK = id.startsWith("CONV#") ? id : `CONV#${id}`;

    /**
     * Consulta directa por PK + SK (GetItem).
     */
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: SK,
      },
    });

    const { Item } = await client.send(command);

    /**
     * Manejo de recurso no encontrado.
     */
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Conversión no encontrada",
        }),
      };
    }

    /**
     * Respuesta exitosa.
     */
    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    /**
     * Logging para observabilidad.
     */
    console.error("getFileById error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error obteniendo archivo",
      }),
    };
  }
};
