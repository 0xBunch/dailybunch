/**
 * Retry Utilities
 *
 * Exponential backoff with jitter for transient failures.
 * Only retries errors marked as retryable.
 */

import { ServiceError, isRetryable, wrapError, type ErrorContext } from "./errors";
import { log } from "./logger";

export interface RetryOptions {
  /** Maximum number of attempts (including first try). Default: 3 */
  maxAttempts: number;
  /** Base delay in milliseconds. Default: 1000 */
  baseDelayMs: number;
  /** Maximum delay in milliseconds. Default: 30000 */
  maxDelayMs: number;
  /** Multiplier for exponential backoff. Default: 2 */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd. Default: true */
  jitter: boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate delay for a given attempt number
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  // Exponential backoff: baseDelay * multiplier^attempt
  const exponentialDelay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  if (options.jitter) {
    // Add random jitter: 0.5x to 1.5x the delay
    const jitterFactor = 0.5 + Math.random();
    return Math.floor(cappedDelay * jitterFactor);
  }

  return cappedDelay;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic.
 *
 * Only retries if the error is marked as retryable.
 * Uses exponential backoff with optional jitter.
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetchData(url),
 *   { service: 'api', operation: 'fetchData', url },
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: ServiceError | undefined;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = wrapError(error, context);

      // Check if we should retry
      const shouldRetry = isRetryable(lastError) && attempt < opts.maxAttempts - 1;

      if (shouldRetry) {
        const delayMs = calculateDelay(attempt, opts);

        log.warn(`Retrying after error`, {
          ...context,
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
          delayMs,
          errorCode: lastError.code,
          errorMessage: lastError.message,
        });

        await sleep(delayMs);
      } else {
        // Log final failure
        log.error(lastError);
        throw lastError;
      }
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Execute a function with retry, returning a result object instead of throwing.
 *
 * Useful for batch operations where you want to continue on failure.
 *
 * @example
 * ```ts
 * const result = await withRetryResult(
 *   () => processLink(url),
 *   { service: 'ingest', operation: 'processLink', url }
 * );
 *
 * if (result.success) {
 *   console.log('Processed:', result.data);
 * } else {
 *   console.log('Failed:', result.error);
 * }
 * ```
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: Partial<RetryOptions> = {}
): Promise<{ success: true; data: T } | { success: false; error: ServiceError }> {
  try {
    const data = await withRetry(fn, context, options);
    return { success: true, data };
  } catch (error) {
    const serviceError = wrapError(error, context);
    return { success: false, error: serviceError };
  }
}

/**
 * Preset retry configurations for different services
 */
export const RetryPresets = {
  /** For Claude API: 3 attempts, 2s base delay (rate limit friendly) */
  claude: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /** For URL redirect following: 2 attempts, 1s base delay */
  redirect: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /** For RSS feeds: 2 attempts, 5s base delay (slow feeds) */
  rss: {
    maxAttempts: 2,
    baseDelayMs: 5000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /** For metadata fetch: no retry (acceptable degradation) */
  metadata: {
    maxAttempts: 1,
    baseDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
    jitter: false,
  } as RetryOptions,
};
