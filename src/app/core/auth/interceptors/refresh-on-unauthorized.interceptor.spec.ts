import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { refreshOnUnauthorizedInterceptor } from './refresh-on-unauthorized.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';
import { AuthUser } from '../auth.model';

const MOCK_USER: AuthUser = { id: 'u1', email: 'user@example.com' };

describe('refreshOnUnauthorizedInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let refreshSessionMock: ReturnType<typeof vi.fn>;
  let endSessionMock: ReturnType<typeof vi.fn>;
  let currentToken: string | null;

  beforeEach(() => {
    currentToken = 'stale-token';
    refreshSessionMock = vi.fn();
    endSessionMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([refreshOnUnauthorizedInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: () => currentToken,
            refreshSession: refreshSessionMock,
            endSession: endSessionMock,
          },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('при 401 обновляет сессию и повторяет исходный запрос с новым токеном', () => {
    refreshSessionMock.mockImplementation(() => {
      currentToken = 'fresh-token';
      return of(MOCK_USER);
    });

    let result: unknown;
    httpClient.get(`${environment.apiBaseUrl}/cocktails`).subscribe((res) => (result = res));

    httpMock
      .expectOne(`${environment.apiBaseUrl}/cocktails`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(refreshSessionMock).toHaveBeenCalledOnce();

    const retryReq = httpMock.expectOne(`${environment.apiBaseUrl}/cocktails`);
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retryReq.flush([{ id: 'c1' }]);

    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('если refresh не удался — вызывает endSession() и пробрасывает именно ошибку refresh, а не исходную 401', () => {
    const refreshError = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    refreshSessionMock.mockReturnValue(throwError(() => refreshError));

    let capturedError: unknown;
    httpClient
      .get(`${environment.apiBaseUrl}/cocktails`)
      .subscribe({ error: (err) => (capturedError = err) });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/cocktails`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(endSessionMock).toHaveBeenCalledOnce();
    expect(capturedError).toBe(refreshError);
  });

  it('не пытается обновить сессию для запроса самого /refresh (защита от цикла)', () => {
    let capturedError: unknown;
    httpClient
      .post(`${environment.authBaseUrl}/refresh`, {})
      .subscribe({ error: (err) => (capturedError = err) });

    httpMock
      .expectOne(`${environment.authBaseUrl}/refresh`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect((capturedError as HttpErrorResponse).status).toBe(401);
  });

  it('не трогает ошибки, отличные от 401 — refresh не вызывается', () => {
    let capturedError: unknown;
    httpClient
      .get(`${environment.apiBaseUrl}/cocktails`)
      .subscribe({ error: (err) => (capturedError = err) });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/cocktails`)
      .flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect((capturedError as HttpErrorResponse).status).toBe(500);
  });
});
