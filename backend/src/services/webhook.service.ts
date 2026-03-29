export const sendWebhook = async (url: string, payload: any): Promise<boolean> => {
  const maxRetries = 3;
  // 5s, 15s, 45s (delays in milliseconds)
  const calculateDelay = (retryCount: number) => {
    switch (retryCount) {
      case 0: return 5000;
      case 1: return 15000;
      case 2: return 45000;
      default: return 5000;
    }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return true;
      }
      
      console.warn(`[Webhook Service] Attempt ${attempt + 1} failed with status: ${response.status}`);
    } catch (error) {
      console.warn(`[Webhook Service] Attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);
    }

    if (attempt < maxRetries) {
      const delay = calculateDelay(attempt);
      console.log(`[Webhook Service] Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`[Webhook Service] Webhook delivery failed after ${maxRetries + 1} attempts for ${url}`);
  return false;
};
