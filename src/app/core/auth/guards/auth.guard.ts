import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { tryRecoverSession } from './session-recovery';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  return tryRecoverSession(auth).pipe(
    map((recovered) => {
      if (!recovered) {
        auth.endSession();
      }
      return recovered;
    }),
  );
};
