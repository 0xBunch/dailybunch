/**
 * Structured Logging
 *
 * JSON-formatted logs with context for debugging and monitoring.
 * Designed for Railway's log aggregation.
 */

import { ServiceError, isServiceError } from "./errors";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str: string | undefined, maxLength: number): string | undefined {
  if (!str) return str;
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Format a log entry as JSON
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Log a debug message (only in development)
 */
function debug(message: string, context: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === "production") return;

  const entry: LogEntry = {
    level: "DEBUG",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.debug(formatLogEntry(entry));
}

/**
 * Log an info message
 */
function info(message: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level: "INFO",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.info(formatLogEntry(entry));
}

/**
 * Log a warning message
 */
function warn(message: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level: "WARN",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.warn(formatLogEntry(entry));
}

/**
 * Log an error
 *
 * Accepts either a ServiceError or a message with context.
 */
function error(errorOrMessage: ServiceError | string, context?: Record<string, unknown>): void {
  let entry: LogEntry;

  if (isServiceError(errorOrMessage)) {
    const err = errorOrMessage;
    entry = {
      level: "ERROR",
      message: err.message,
      timestamp: err.timestamp.toISOString(),
      code: err.code,
      service: err.context.service,
      operation: err.context.operation,
      retryable: err.retryable,
      // Truncate long inputs to prevent log bloat
      input: truncate(String(err.context.input || err.context.url || ""), 200),
      linkId: err.context.linkId,
      cause: err.cause?.message,
      // Include stack in development only
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
      // Spread remaining context
      ...Object.fromEntries(
        Object.entries(err.context).filter(
          ([k]) => !["service", "operation", "input", "url", "linkId"].includes(k)
        )
      ),
    };
  } else {
    entry = {
      level: "ERROR",
      message: errorOrMessage,
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  console.error(formatLogEntry(entry));
}

/**
 * Log the start of an operation (for timing)
 */
function operationStart(
  service: string,
  operation: string,
  context: Record<string, unknown> = {}
): { end: (result?: Record<string, unknown>) => void } {
  const startTime = performance.now();
  const operationId = Math.random().toString(36).slice(2, 10);

  debug(`Starting ${operation}`, {
    service,
    operation,
    operationId,
    ...context,
  });

  return {
    end: (result: Record<string, unknown> = {}) => {
      const durationMs = Math.round(performance.now() - startTime);
      info(`Completed ${operation}`, {
        service,
        operation,
        operationId,
        durationMs,
        ...result,
      });
    },
  };
}

/**
 * Log a batch operation summary
 */
function batchSummary(
  service: string,
  operation: string,
  stats: { total: number; succeeded: number; failed: number },
  context: Record<string, unknown> = {}
): void {
  const level = stats.failed > 0 ? "WARN" : "INFO";
  const entry: LogEntry = {
    level,
    message: `Batch ${operation}: ${stats.succeeded}/${stats.total} succeeded`,
    timestamp: new Date().toISOString(),
    service,
    operation,
    total: stats.total,
    succeeded: stats.succeeded,
    failed: stats.failed,
    successRate: stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 100) : 0,
    ...context,
  };

  if (level === "WARN") {
    console.warn(formatLogEntry(entry));
  } else {
    console.info(formatLogEntry(entry));
  }
}

/**
 * Log an external service call
 */
function externalCall(
  service: string,
  method: string,
  url: string,
  durationMs: number,
  status: number | "error",
  context: Record<string, unknown> = {}
): void {
  const success = typeof status === "number" && status >= 200 && status < 400;

  const entry: LogEntry = {
    level: success ? "INFO" : "WARN",
    message: `${method} ${truncate(url, 100)} -> ${status}`,
    timestamp: new Date().toISOString(),
    service,
    method,
    url: truncate(url, 200),
    status,
    durationMs,
    success,
    ...context,
  };

  if (success) {
    console.info(formatLogEntry(entry));
  } else {
    console.warn(formatLogEntry(entry));
  }
}

export const log = {
  debug,
  info,
  warn,
  error,
  operationStart,
  batchSummary,
  externalCall,
};
