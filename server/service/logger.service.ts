import winston from 'winston';
import { logPath } from '../config.local.js';

export const LOG_SUCCESS = 'API_REQUEST_SUCCESS';
export const LOG_INVALID_TOKEN = 'API_REQUEST_INVALID_TOKEN';

let currentDate;
let logger;

export class LoggerService {

  private static getLogger(): winston.Logger {
    const now = new Date();
    const today = now.toISOString().substring(0, 10) + '.log';
    if (currentDate !== today) {
      currentDate = today;
      logger = winston.loggers.add('file', {
        transports: [
          new (winston.transports.File)({ filename: logPath + currentDate})
        ]
      } as winston.LoggerOptions);
    }
    return logger;
  }

  static info(data: any) {
    LoggerService.getLogger().info({
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
