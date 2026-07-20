import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthApiService } from './auth-api.service';
import { environment } from '../../../../environments/environment';
import { AuthResponse } from '../auth.model';

const BASE_URL = environment.authBaseUrl;

function makeAuthResponse(): AuthResponse {
  return { accessToken: 'token-1', user: { id: 'u1', email: 'user@example.com' } };
}

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('register() делает POST на /register с credentials и withCredentials=true', () => {
    const credentials = { email: 'user@example.com', password: 'pass123' };
    const response = makeAuthResponse();

    service.register(credentials).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${BASE_URL}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    expect(req.request.withCredentials).toBe(true);

    req.flush(response);
  });

  it('login() делает POST на /login с credentials и withCredentials=true', () => {
    const credentials = { email: 'user@example.com', password: 'pass123' };
    const response = makeAuthResponse();

    service.login(credentials).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${BASE_URL}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    expect(req.request.withCredentials).toBe(true);

    req.flush(response);
  });

  it('login() пробрасывает 401 наверх без изменений', () => {
    let receivedStatus: number | undefined;

    service.login({ email: 'user@example.com', password: 'wrong' }).subscribe({
      error: (err) => (receivedStatus = err.status),
    });

    const req = httpMock.expectOne(`${BASE_URL}/login`);
    req.flush(
      { message: 'Неверный email или пароль' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(receivedStatus).toBe(401);
  });

  it('refreshSession() делает POST на /refresh с пустым телом и withCredentials=true', () => {
    const response = makeAuthResponse();

    service.refreshSession().subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${BASE_URL}/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);

    req.flush(response);
  });

  it('logout() делает POST на /logout с пустым телом и withCredentials=true', () => {
    let completed = false;

    service.logout().subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(`${BASE_URL}/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);

    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });
});
