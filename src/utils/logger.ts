/**
 * Simple logger utility for premium module
 */

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVEL: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private level: number = LOG_LEVEL.INFO;

  setLevel(level: keyof LogLevel): void {
    this.level = LOG_LEVEL[level];
  }

  debug(message: string, data?: any): void {
    if (this.level <= LOG_LEVEL.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string, data?: any): void {
    if (this.level <= LOG_LEVEL.INFO) {
      console.info(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.level <= LOG_LEVEL.WARN) {
      console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  error(message: string, data?: any): void {
    if (this.level <= LOG_LEVEL.ERROR) {
      console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

export const logger = new Logger();