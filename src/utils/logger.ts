import {
  pino,
  Logger,
  TransportSingleOptions,
  TransportMultiOptions,
  TransportPipelineOptions,
} from 'pino';
import path from 'path';
import fs from 'fs';
import os from 'os';

const logDir = path.resolve(os.tmpdir(), 'interactive-mcp-logs');
const logFile = path.join(logDir, 'dev.log');

// Ensure log directory exists early (remove the development check)
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    // Silently fail - logger will use silent mode if file access fails
  }
}

const isDevelopment = process.env.NODE_ENV === 'development';

const loggerOptions: pino.LoggerOptions = {
  level: isDevelopment ? 'trace' : 'silent', // Default level
};

// Configure file-only logging for both development and production
let transportConfig:
  | TransportSingleOptions
  | TransportMultiOptions
  | TransportPipelineOptions;

try {
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Attempt to open the file in append mode to check writability
  const fd = fs.openSync(logFile, 'a');
  fs.closeSync(fd);
  
  // Only log to file, not to console/stdio
  transportConfig = {
    target: 'pino/file',
    options: { destination: logFile, mkdir: true },
    level: isDevelopment ? 'trace' : 'info',
  };
  
  loggerOptions.transport = transportConfig;
} catch (error) {
  // If file logging fails, use silent mode to avoid any stdio output
  loggerOptions.level = 'silent';
}

const logger: Logger = pino(loggerOptions);

export default logger;
