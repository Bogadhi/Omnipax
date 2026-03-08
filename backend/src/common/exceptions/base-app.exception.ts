import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'SYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'PLAN_LIMIT_EXCEEDED'
  | 'FEATURE_DISABLED'
  | 'PAYMENT_ERROR'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'CIRCUIT_OPEN'
  | 'RESOURCE_NOT_FOUND'
  | 'DUPLICATE_REQUEST';

export class BaseAppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly metadata?: Record<string, any>,
  ) {
    super({ message, errorCode: code, ...metadata }, status);
  }
}
