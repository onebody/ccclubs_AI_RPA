import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import { ConfigManager } from '../config/ConfigManager';

const configManager = ConfigManager.getInstance();
const logConfig = configManager.getLogConfig();

export class Logger {
  private static instance: Logger;
  private logger: any;

  private constructor() {
    this.logger = createLogger({
      level: logConfig.level,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: 'ccc-browser-automation' },
      transports: [
        new transports.File({
          filename: path.join(logConfig.dir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
        new transports.File({
          filename: path.join(logConfig.dir, 'combined.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return '[' + timestamp + '] ' + level + ': ' + message + ' ' + metaStr;
            })
          ),
        })
      );
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, ...meta: unknown[]): void {
    this.logger.info(message, ...meta);
  }

  public warn(message: string, ...meta: unknown[]): void {
    this.logger.warn(message, ...meta);
  }

  public error(message: string, ...meta: unknown[]): void {
    this.logger.error(message, ...meta);
  }

  public debug(message: string, ...meta: unknown[]): void {
    this.logger.debug(message, ...meta);
  }
}