import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    
    // Attach to request object for later use in controllers/services
    (req as any).requestId = requestId;
    
    // Attach to response headers
    res.setHeader('x-request-id', requestId);
    
    next();
  }
}
