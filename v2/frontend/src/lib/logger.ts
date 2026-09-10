/**
 * Client-Side Production Logger
 * Provides structured logging with log level filtering and automatic redaction of sensitive credentials.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Patterns matching sensitive field names
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /auth/i,
  /cookie/i,
  /credential/i,
  /cvv/i,
  /credit[-_]?card/i,
  /api[-_]?key/i,
];

// Sanitize object or value to prevent logging sensitive secrets
function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    // Redact Bearer tokens in strings
    return data.replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "$1[REDACTED]");
  }
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitize(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class ClientLogger {
  private minLevel: LogLevel;

  constructor() {
    // Default to 'warn' in production, 'debug' in development
    const isDev = import.meta.env?.DEV ?? true;
    this.minLevel = isDev ? "debug" : "warn";
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  public debug(message: string, context?: unknown): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, context ? sanitize(context) : "");
    }
  }

  public info(message: string, context?: unknown): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`, context ? sanitize(context) : "");
    }
  }

  public warn(message: string, context?: unknown): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, context ? sanitize(context) : "");
    }
  }

  public error(message: string, error?: unknown, context?: unknown): void {
    if (this.shouldLog("error")) {
      console.error(
        `[ERROR] ${message}`,
        error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : sanitize(error),
        context ? sanitize(context) : ""
      );
    }
  }
}

export const logger = new ClientLogger();
