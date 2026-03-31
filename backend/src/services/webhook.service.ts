export interface VerificationCompletedWebhookPayload {
  jobId: string;
  certificateId: string;
}

export class WebhookService {
  private readonly timeoutMs = 10_000;

  private isValidWebhookUrl(webhookUrl: string): boolean {
    try {
      const parsed = new URL(webhookUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async dispatchVerificationCompleted(
    webhookUrl: string,
    payload: VerificationCompletedWebhookPayload
  ): Promise<boolean> {
    if (!this.isValidWebhookUrl(webhookUrl)) {
      console.error(`Invalid webhook URL provided: ${webhookUrl}`);
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(`Webhook dispatch failed with status ${response.status} for ${webhookUrl}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Webhook dispatch error for ${webhookUrl}:`, error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const webhookService = new WebhookService();
