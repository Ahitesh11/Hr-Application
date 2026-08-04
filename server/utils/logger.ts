/**
 * Minimal console-based logger. Kept deliberately dependency-free —
 * if this needs to become a real logging library later, this is the
 * only file that should have to change.
 */

type LogMeta = Record<string, unknown> | undefined;

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: string, message: string, meta?: LogMeta): void {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console.log(line, meta);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("INFO", message, meta),
  warn: (message: string, meta?: LogMeta) => write("WARN", message, meta),
  error: (message: string, meta?: LogMeta) => write("ERROR", message, meta),
  debug: (message: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV !== "production") {
      write("DEBUG", message, meta);
    }
  },
};
