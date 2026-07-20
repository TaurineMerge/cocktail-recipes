import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attachTokenInterceptor } from './attach-token.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';

describe('attachTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let currentToken: string | null;

  beforeEach(() => {
    currentToken = null;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([attachTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken: () => currentToken } },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('добавляет Authorization к запросам на apiBaseUrl, если токен есть', () => {
    currentToken = 'abc123';

    httpClient.get(`${environment.apiBaseUrl}/cocktails`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cocktails`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush([]);
  });

  it('не добавляет Authorization к apiBaseUrl-запросам, если токена нет', () => {
    httpClient.get(`${environment.apiBaseUrl}/cocktails`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cocktails`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('не добавляет Authorization к authBaseUrl-запросам, даже если токен есть', () => {
    currentToken = 'abc123';

    httpClient.post(`${environment.authBaseUrl}/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.authBaseUrl}/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('withCredentials=true для authBaseUrl-запросов (нужны cookie для refresh)', () => {
    httpClient.post(`${environment.authBaseUrl}/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.authBaseUrl}/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('не трогает запросы к сторонним доменам', () => {
    currentToken = 'abc123';

    httpClient.get('https://fonts.googleapis.com/some-font').subscribe();

    const req = httpMock.expectOne('https://fonts.googleapis.com/some-font');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush('');
  });
});
