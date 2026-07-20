import { ErrorHandler, Injectable } from '@angular/core';
import { logger } from './logger';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error('app.uncaught_error', { message, stack });

    console.error(error);
  }
}
