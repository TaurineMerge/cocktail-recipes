import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { logger } from './logger';

export const httpErrorLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        logger.error('http.request_failed', {
          method: req.method,
          url: req.urlWithParams,
          status: error.status,
        });
      }
      return throwError(() => error);
    }),
  );
};
