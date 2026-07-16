import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.refreshSession().pipe(
    map(() => true),
    catchError(() => {
      auth.endSession();
      return of(false);
    }),
  );
};
