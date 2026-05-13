import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const QUEUE_URL = process.env.SQS_QUEUE_URL!;

export async function receiveMessage(): Promise<{ body: string; receiptHandle: string } | null> {
  const response = await client.send(new ReceiveMessageCommand({
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 300,
  }));

  if (!response.Messages || response.Messages.length === 0) {
    return null;
  }

  const msg = response.Messages[0];
  return {
    body: msg.Body!,
    receiptHandle: msg.ReceiptHandle!,
  };
}

export async function deleteMessage(receiptHandle: string): Promise<void> {
  await client.send(new DeleteMessageCommand({
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle,
  }));
}
