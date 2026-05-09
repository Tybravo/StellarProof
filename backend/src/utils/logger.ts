 import winston from 'winston';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Configure Winston logger with structured, level-based logging.
 * Supports console transport for development and file transports for production.
 */

// Define custom log format with timestamps and metadata
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json(),
);

// Console format (human-readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(metadata || {}).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

// Configure transports
const transports: winston.transport[] = [];

// Development: Console transport only
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  );
}

// Production: File transports + Console
if (isProduction) {
  transports.push(
    // All logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: customFormat,
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error logs only
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      format: customFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Warn logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'warn.log'),
      format: customFormat,
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Console for production errors
    new winston.transports.Console({
      format: consoleFormat,
      level: 'error',
    }),
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: customFormat,
  defaultMeta: { service: 'stellarproof-backend' },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: customFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: customFormat,
    }),
  ],
});

export default logger;