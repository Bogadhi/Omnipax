import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  private requestId?: string;

  setRequestId(id: string) {
    this.requestId = id;
  }

  /**
   * CRITICAL Log Level for high-severity issues
   */
  critical(message: any, stack?: string, context?: string) {
    const formatted = `[CRITICAL] ${this.applyRequestId(message)}`;
    super.error(formatted, stack, context);
  }

  private applyRequestId(message: any): string {
    const idStr = this.requestId ? `[${this.requestId}] ` : '';
    return `${idStr}${message}`;
  }

  log(message: any, context?: string) {
    super.log(this.applyRequestId(message), context);
  }

  warn(message: any, context?: string) {
    super.warn(this.applyRequestId(message), context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(this.applyRequestId(message), stack, context);
  }

  debug(message: any, context?: string) {
    super.debug(this.applyRequestId(message), context);
  }

  verbose(message: any, context?: string) {
    super.verbose(this.applyRequestId(message), context);
  }
}
