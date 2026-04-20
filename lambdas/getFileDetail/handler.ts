import { APIGatewayEvent, LambdaResponse } from "../shared/types";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { AWS_RESOURCES } from '../shared/constants/awsResourceNames';
import { getDocClient } from '../shared/connections/dynamoDBClient';

/**
 * Handler para GET /files/{id}
 * 
 * Obtiene el detalle de una conversión específica.
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    /**
     * Obtiene userId desde JWT validado.
     */
    const userId = event.requestContext.authorizer.jwt.claims.sub;

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
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      Key: {
        PK: `USER#${userId}`,
        SK: SK,
      },
    });

    const { Item } = await getDocClient().send(command);

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
