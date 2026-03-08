import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { BaseAppException } from '../exceptions/base-app.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const requestId = request['requestId'] || 'unknown';

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody: any = {
      success: false,
      message: 'Internal server error',
      errorCode: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      requestId,
    };

    if (exception instanceof BaseAppException) {
      responseBody.message = exception.message;
      responseBody.errorCode = exception.code;
      if (exception.metadata) {
        responseBody.metadata = exception.metadata;
      }
    } else if (exception instanceof HttpException) {
      responseBody.message = exception.message;
      responseBody.errorCode = `HTTP_${httpStatus}`;
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const msg = (res as any).message;
        responseBody.message = Array.isArray(msg) ? msg.join(', ') : msg;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const message = exception.message || '';
      const lines = message.split('\n');
      responseBody.message = `Database Error: ${lines.at(-1) || 'Unknown Prisma Error'}`;
      responseBody.errorCode = `PRISMA_${exception.code}`;
    }

    // Structured logging with context and Request ID
    const logPrefix = `[${requestId}]`;
    if (httpStatus >= 500) {
      this.logger.error(`${logPrefix} ${responseBody.message}`);
      if (exception instanceof Error) {
        console.error(exception.stack);
      } else {
        console.error(exception);
      }
    } else {
      this.logger.warn(`${logPrefix} ${responseBody.message}`);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
