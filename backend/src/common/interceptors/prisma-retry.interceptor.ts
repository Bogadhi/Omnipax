import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaRetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PrismaRetryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      retry({
        count: 1, // Retry once
        delay: 500, // Wait 500ms
      }),
      catchError((err) => {
        // Log if it was a Prisma error
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.warn(
            `Prisma Error detected: ${err.code} - ${err.message}`,
          );
        } else if (err instanceof Prisma.PrismaClientInitializationError) {
          this.logger.warn(`Prisma Init Error: ${err.message}`);
        } else if (errCodeIsNetwork(err)) {
          this.logger.warn(`Network Error detected: ${err.message}`);
        }
        return throwError(() => err);
      }),
    );
  }
}

function errCodeIsNetwork(err: any): boolean {
  const msg = err.message?.toLowerCase() || '';
  return (
    msg.includes('econnreset') ||
    msg.includes('connection terminated') ||
    msg.includes('pool timeout')
  );
}
