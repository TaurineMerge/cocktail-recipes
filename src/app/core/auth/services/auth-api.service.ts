import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthCredentials, AuthResponse } from '../auth.model';
import { AuthRepository } from '../auth.repository';

@Injectable()
export class AuthApiService extends AuthRepository {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = environment.authBaseUrl;
  readonly #options = { withCredentials: true };

  override register(credentials: AuthCredentials): Observable<AuthResponse> {
    return this.#http.post<AuthResponse>(`${this.#baseUrl}/register`, credentials, this.#options);
  }

  override login(credentials: AuthCredentials): Observable<AuthResponse> {
    return this.#http.post<AuthResponse>(`${this.#baseUrl}/login`, credentials, this.#options);
  }

  override refreshSession(): Observable<AuthResponse> {
    return this.#http.post<AuthResponse>(`${this.#baseUrl}/refresh`, {}, this.#options);
  }

  override logout(): Observable<void> {
    return this.#http.post<void>(`${this.#baseUrl}/logout`, {}, this.#options);
  }
}
