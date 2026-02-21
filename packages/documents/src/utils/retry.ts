import { logger } from "@midpoker/logger";

/**
 * Retry wrapper for calls with exponential backoff
 * Only retries on timeout/network errors, not on other errors
 */
export async function retryCall<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Only retry on timeout/network errors, not on other AI errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRetryableError =
        errorMessage.includes("timeout") ||
        errorMessage.includes("TimeoutError") ||
        errorMessage.includes("aborted") ||
        errorMessage.includes("network");

      if (!isRetryableError) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * 2 ** attempt + Math.random() * 1000;
      logger.info(
        {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          delayMs: Math.round(delay),
          error: errorMessage,
        },
        "AI call failed, retrying",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("All retry attempts failed");
}
