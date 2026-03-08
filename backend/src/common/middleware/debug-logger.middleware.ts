import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DebugLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const logFile = path.join(process.cwd(), 'request-debug.log');
    const log = (msg: string) => {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] [PID:${process.pid}] ${msg}\n`);
    };

    log(`[REQUEST START] ${req.method} ${req.url}`);

    res.on('finish', () => {
      log(`[REQUEST END] ${req.method} ${req.url} ${res.statusCode}`);
    });

    next();
  }
}
