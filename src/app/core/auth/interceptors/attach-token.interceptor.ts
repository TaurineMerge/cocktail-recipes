import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment';

export const attachTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthRequest = req.url.startsWith(environment.authBaseUrl);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (isAuthRequest) {
    return next(req.clone({ withCredentials: true })); // на случай cross origin
  }

  const token = auth.accessToken();

  if (token && isApiRequest) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req);
};
