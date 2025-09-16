/**
 * Service Logger
 * 
 * Provides structured logging for service modules with context and metadata.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private readonly serviceName: string;
  private readonly logLevel: LogLevel;

  constructor(serviceName: string, logLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.logLevel = logLevel;
  }

  debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, context);
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...(context && { context })
    };

    // Use console methods based on log level for proper Firebase Function logging
    switch (level) {
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.log(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }
}