import { APIGatewayEvent, LambdaResponse } from "../shared/types";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
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

    const command = new QueryCommand({
      TableName: AWS_RESOURCES.DYNAMODB_TABLE_CONVERSIONS,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "CONV#",
      },
    });

    const { Items } = await getDocClient().send(command);
    const Item = Items?.find((item) => item.SK.endsWith(`#${id}`));

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
