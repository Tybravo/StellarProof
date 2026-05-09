export interface VerificationCompletedWebhookPayload {
  jobId: string;
  certificateId: string;
}

export class WebhookService {
  private readonly timeoutMs = 10_000;
  private readonly maxRetries = 3;

  private isValidWebhookUrl(webhookUrl: string): boolean {
    try {
      const parsed = new URL(webhookUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getRetryDelayMs(attempt: number): number {
    switch (attempt) {
      case 0:
        return 5_000;
      case 1:
        return 15_000;
      case 2:
        return 45_000;
      default:
        return 5_000;
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

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
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

        if (response.ok) {
          return true;
        }

        console.warn(
          `[Webhook Service] Attempt ${attempt + 1} failed with status ${response.status} for ${webhookUrl}`
        );
      } catch (error) {
        console.warn(
          `[Webhook Service] Attempt ${attempt + 1} failed for ${webhookUrl}:`,
          error
        );
      } finally {
        clearTimeout(timeout);
      }

      if (attempt < this.maxRetries) {
        const delayMs = this.getRetryDelayMs(attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.error(
      `[Webhook Service] Webhook delivery failed after ${this.maxRetries + 1} attempts for ${webhookUrl}`
    );
    return false;
  }
}

export const webhookService = new WebhookService();
