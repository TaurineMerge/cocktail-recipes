import { Observable } from 'rxjs';
import { AuthCredentials, AuthResponse } from './auth.model';

export abstract class AuthRepository {
  abstract register(credentials: AuthCredentials): Observable<AuthResponse>;
  abstract login(credentials: AuthCredentials): Observable<AuthResponse>;
  abstract refreshSession(): Observable<AuthResponse>;
  abstract logout(): Observable<void>;
}
