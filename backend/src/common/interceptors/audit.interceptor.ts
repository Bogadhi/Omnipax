import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    // Only log state-changing operations
    const sensitiveMethods = ['POST', 'PATCH', 'DELETE', 'PUT'];

    return next.handle().pipe(
      tap(() => {
        if (sensitiveMethods.includes(method)) {
          // Sensitive fields to mask
          const maskedBody = { ...body };
          const sensitiveFields = ['password', 'token', 'otp'];
          sensitiveFields.forEach((field) => {
            if (maskedBody[field]) maskedBody[field] = '********';
          });

          this.auditService.log(
            `${method} ${url}`,
            {
              body: maskedBody,
              ip: request.ip,
              userAgent: request.get('user-agent'),
            },
            user?.id,
            user?.role,
            request.tenantId,
          );
        }
      }),
    );
  }
}
