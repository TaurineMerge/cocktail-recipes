import { Observable, of, map, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export function tryRecoverSession(auth: AuthService): Observable<boolean> {
  return auth.refreshSession().pipe(
    map(() => true),
    catchError(() => of(false)),
  );
}
