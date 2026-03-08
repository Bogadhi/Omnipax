import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * RequestCorrelationInterceptor
 *
 * Attaches a unique requestId to every incoming request and response.
 * All log calls made within nested services can use this ID for correlation.
 *
 * Usage in main.ts:
 *   app.useGlobalInterceptors(new RequestCorrelationInterceptor());
 */
@Injectable()
export class RequestCorrelationInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Assign a requestId: use client-provided one if present, else generate
    const requestId: string =
      (request.headers['x-request-id'] as string) || uuidv4();

    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          JSON.stringify({
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            tenantSlug: request.headers['x-tenant-slug'] || 'none',
          }),
        );
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          JSON.stringify({
            requestId,
            method,
            url,
            error: err.message,
            statusCode: err.status || 500,
            duration: `${duration}ms`,
          }),
        );
        return throwError(() => err);
      }),
    );
  }
}
