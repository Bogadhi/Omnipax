import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable()
export class StructuredLogger extends ConsoleLogger {
  log(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    const cleanContext = context || this.context;

    // Check if we are in a request scope and have logical ID context
    // For now simple JSON structure
    const logObject = {
      level: 'info',
      message,
      timestamp,
      context: cleanContext,
    };

    super.log(JSON.stringify(logObject));
  }

  error(message: any, stack?: string, context?: string) {
    const timestamp = new Date().toISOString();
    const cleanContext = context || this.context;

    const logObject = {
      level: 'error',
      message,
      timestamp,
      context: cleanContext,
      stack,
    };

    super.error(JSON.stringify(logObject));
  }

  warn(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    const cleanContext = context || this.context;

    const logObject = {
      level: 'warn',
      message,
      timestamp,
      context: cleanContext,
    };

    super.warn(JSON.stringify(logObject));
  }
}
