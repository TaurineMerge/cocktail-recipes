import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap, map, shareReplay, finalize } from 'rxjs';
import { AuthRepository } from '../auth.repository';
import { AuthCredentials, AuthResponse, AuthUser } from '../auth.model';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #repository = inject(AuthRepository);
  readonly #router = inject(Router);

  readonly #accessToken = signal<string | null>(null);
  readonly #user = signal<AuthUser | null>(null);

  #refreshInFlight: Observable<AuthUser> | null = null; // единственный активный refresh-запрос

  readonly accessToken = this.#accessToken.asReadonly();
  readonly currentUser = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#accessToken() !== null);

  register(credentials: AuthCredentials): Observable<AuthUser> {
    return this.#repository.register(credentials).pipe(this.#applySession());
  }

  login(credentials: AuthCredentials): Observable<AuthUser> {
    return this.#repository.login(credentials).pipe(this.#applySession());
  }

  refreshSession(): Observable<AuthUser> {
    if (!this.#refreshInFlight) {
      this.#refreshInFlight = this.#repository.refreshSession().pipe(
        this.#applySession(),
        finalize(() => (this.#refreshInFlight = null)),
        shareReplay(1), // все подписчики получают результат одного refresh-запроса
      );
    }
    return this.#refreshInFlight;
  }

  logout(): void {
    this.#repository
      .logout()
      .pipe(finalize(() => this.endSession()))
      .subscribe();
  }

  endSession(): void {
    this.#clearSession();
    this.#router.navigate(['/login']);
  }

  #applySession() {
    return (source: Observable<AuthResponse>): Observable<AuthUser> =>
      source.pipe(
        tap(({ accessToken, user }) => {
          this.#accessToken.set(accessToken);
          this.#user.set(user);
        }),
        map(({ user }) => user),
      );
  }

  #clearSession(): void {
    this.#accessToken.set(null);
    this.#user.set(null);
  }
}
