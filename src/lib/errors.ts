/**
 * Error Types and Utilities
 *
 * Typed errors with context for external service calls.
 * Enables retry logic, structured logging, and graceful degradation.
 */

// Error codes by category
export type ErrorCode =
  // Network errors
  | "NETWORK_TIMEOUT"
  | "NETWORK_ERROR"
  | "DNS_FAILURE"
  // API errors
  | "API_RATE_LIMIT"
  | "API_AUTH_FAILED"
  | "API_BAD_REQUEST"
  | "API_SERVER_ERROR"
  | "API_UNKNOWN_ERROR"
  // Parsing errors
  | "PARSE_JSON_FAILED"
  | "PARSE_HTML_FAILED"
  | "PARSE_XML_FAILED"
  // Redirect errors
  | "REDIRECT_LOOP"
  | "REDIRECT_MAX_EXCEEDED"
  | "REDIRECT_INVALID_URL"
  // Batch processing
  | "BATCH_ITEM_FAILED"
  // Database errors
  | "DB_CONNECTION_FAILED"
  | "DB_CONSTRAINT_VIOLATION"
  | "DB_UNKNOWN_ERROR";

// Codes that should trigger retry with backoff
const RETRYABLE_CODES: ErrorCode[] = [
  "NETWORK_TIMEOUT",
  "NETWORK_ERROR",
  "API_RATE_LIMIT",
  "API_SERVER_ERROR",
  "DB_CONNECTION_FAILED",
];

export interface ErrorContext {
  service: string;
  operation: string;
  linkId?: string;
  url?: string;
  input?: string;
  [key: string]: unknown;
}

/**
 * Base error class for all service errors.
 * Includes error code, context, and retryable flag.
 */
export class ServiceError extends Error {
  public readonly timestamp: Date;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context: ErrorContext,
    public readonly retryable: boolean = RETRYABLE_CODES.includes(code),
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ServiceError";
    this.timestamp = new Date();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * Create a JSON-serializable representation for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Helpers to create specific error types
 */
export const Errors = {
  // Network errors
  timeout: (context: ErrorContext, cause?: Error) =>
    new ServiceError("NETWORK_TIMEOUT", "Request timed out", context, true, cause),

  networkError: (context: ErrorContext, cause?: Error) =>
    new ServiceError("NETWORK_ERROR", cause?.message || "Network request failed", context, true, cause),

  // API errors
  rateLimit: (context: ErrorContext, retryAfterMs?: number) =>
    new ServiceError(
      "API_RATE_LIMIT",
      `Rate limited${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ""}`,
      { ...context, retryAfterMs },
      true
    ),

  authFailed: (context: ErrorContext) =>
    new ServiceError("API_AUTH_FAILED", "Authentication failed", context, false),

  badRequest: (context: ErrorContext, details?: string) =>
    new ServiceError("API_BAD_REQUEST", details || "Bad request", context, false),

  serverError: (context: ErrorContext, cause?: Error) =>
    new ServiceError("API_SERVER_ERROR", cause?.message || "Server error", context, true, cause),

  // Parsing errors
  jsonParseFailed: (context: ErrorContext, cause?: Error) =>
    new ServiceError("PARSE_JSON_FAILED", "Failed to parse JSON", context, false, cause),

  htmlParseFailed: (context: ErrorContext, cause?: Error) =>
    new ServiceError("PARSE_HTML_FAILED", "Failed to parse HTML", context, false, cause),

  xmlParseFailed: (context: ErrorContext, cause?: Error) =>
    new ServiceError("PARSE_XML_FAILED", "Failed to parse XML", context, false, cause),

  // Redirect errors
  redirectLoop: (context: ErrorContext & { url: string }) =>
    new ServiceError("REDIRECT_LOOP", `Redirect loop detected at ${context.url}`, context, false),

  maxRedirects: (context: ErrorContext, count: number) =>
    new ServiceError("REDIRECT_MAX_EXCEEDED", `Exceeded max redirects (${count})`, { ...context, redirectCount: count }, false),

  invalidRedirectUrl: (context: ErrorContext, url: string) =>
    new ServiceError("REDIRECT_INVALID_URL", `Invalid redirect URL: ${url}`, { ...context, invalidUrl: url }, false),

  // Batch processing
  batchItemFailed: (context: ErrorContext, cause?: Error) =>
    new ServiceError("BATCH_ITEM_FAILED", cause?.message || "Batch item failed", context, false, cause),

  // Database errors
  dbConnectionFailed: (context: ErrorContext, cause?: Error) =>
    new ServiceError("DB_CONNECTION_FAILED", "Database connection failed", context, true, cause),

  dbConstraintViolation: (context: ErrorContext, constraint?: string) =>
    new ServiceError("DB_CONSTRAINT_VIOLATION", `Constraint violation: ${constraint}`, { ...context, constraint }, false),
};

/**
 * Type guard to check if an error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (isServiceError(error)) {
    return error.retryable;
  }
  // Treat unknown errors as potentially retryable network issues
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("network")
    );
  }
  return false;
}

/**
 * Wrap an unknown error as a ServiceError
 */
export function wrapError(error: unknown, context: ErrorContext): ServiceError {
  if (isServiceError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Detect timeout errors
    if (message.includes("timeout") || message.includes("aborted")) {
      return Errors.timeout(context, error);
    }

    // Detect network errors
    if (
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("fetch failed")
    ) {
      return Errors.networkError(context, error);
    }

    // Default to unknown API error
    return new ServiceError("API_UNKNOWN_ERROR", error.message, context, false, error);
  }

  // Non-Error thrown
  return new ServiceError(
    "API_UNKNOWN_ERROR",
    String(error),
    context,
    false
  );
}
