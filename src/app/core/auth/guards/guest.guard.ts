import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { tryRecoverSession } from './session-recovery';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/cocktails']);
  }

  return tryRecoverSession(auth).pipe(
    map((recovered) => (recovered ? router.createUrlTree(['/cocktails']) : true)),
  );
};
