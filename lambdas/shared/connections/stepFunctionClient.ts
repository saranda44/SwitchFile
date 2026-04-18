/**
 * Cliente Step Functions
 */

import { SFNClient } from '@aws-sdk/client-sfn';
import { AWS_RESOURCES } from '../constants/awsResourceNames';

let stepFunctionsClient: SFNClient | null = null;

/**
 * Obtener instancia del cliente Step Functions
 */
function getStepFunctionsClient(): SFNClient {
  if (!stepFunctionsClient) {
    stepFunctionsClient = new SFNClient({
      region: AWS_RESOURCES.AWS_REGION,
    });
  }
  return stepFunctionsClient;
}

export default getStepFunctionsClient;