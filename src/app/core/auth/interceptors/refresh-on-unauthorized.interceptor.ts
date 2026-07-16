import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const refreshOnUnauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isRefreshEndpoint = req.url === `${environment.authBaseUrl}/refresh`;
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      // игнорирование /refresh, чтобы избежать бесконечного цикла
      if (!isUnauthorized || isRefreshEndpoint) {
        return throwError(() => error);
      }

      return auth.refreshSession().pipe(
        switchMap(() =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken()}` } })),
        ),
        catchError((refreshError) => {
          auth.endSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
