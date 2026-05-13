import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import type { Category } from '../converters/router';

const client = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const NAMESPACE = 'SwitchFile';

export type ConversionStatus = 'success' | 'failed';

export interface ConversionMetricInput {
  durationMs: number;
  category: Category;
  sourceFormat: string;
  targetFormat: string;
  status: ConversionStatus;
}

export async function emitConversionMetrics(input: ConversionMetricInput): Promise<void> {
  try {
    await client.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: 'ConversionDuration',
            Dimensions: [{ Name: 'Category', Value: input.category }],
            Value: input.durationMs,
            Unit: 'Milliseconds',
          },
          {
            MetricName: 'ConversionDurationDetailed',
            Dimensions: [
              { Name: 'SourceFormat', Value: input.sourceFormat.toLowerCase() },
              { Name: 'TargetFormat', Value: input.targetFormat.toLowerCase() },
            ],
            Value: input.durationMs,
            Unit: 'Milliseconds',
          },
          {
            MetricName: 'ConversionCount',
            Dimensions: [
              { Name: 'Status', Value: input.status },
              { Name: 'Category', Value: input.category },
            ],
            Value: 1,
            Unit: 'Count',
          },
        ],
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[metrics] Failed to publish CloudWatch metrics: ${msg}`);
  }
}
