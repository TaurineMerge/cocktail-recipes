import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AuthRepository } from '../auth.repository';
import { AuthResponse, AuthUser } from '../auth.model';

const MOCK_USER: AuthUser = { id: 'u1', email: 'user@example.com' };

function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return { accessToken: 'token-1', user: MOCK_USER, ...overrides };
}

describe('AuthService', () => {
  let repository: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;
  let router: Router;

  beforeEach(() => {
    repository = {
      register: vi.fn(),
      login: vi.fn(),
      refreshSession: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([]),
        { provide: AuthRepository, useValue: repository },
      ],
    });

    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  describe('начальное состояние', () => {
    it('нет токена, нет пользователя, isAuthenticated false', () => {
      expect(service.accessToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('login() / register()', () => {
    it('login() сохраняет токен и пользователя, возвращает пользователя подписчику', () => {
      repository.login.mockReturnValue(of(makeAuthResponse()));
      let result: AuthUser | undefined;

      service
        .login({ email: 'user@example.com', password: 'pass123' })
        .subscribe((u) => (result = u));

      expect(repository.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'pass123',
      });
      expect(result).toEqual(MOCK_USER);
      expect(service.accessToken()).toBe('token-1');
      expect(service.currentUser()).toEqual(MOCK_USER);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('register() ведёт себя так же, как login() — сохраняет сессию', () => {
      repository.register.mockReturnValue(of(makeAuthResponse({ accessToken: 'token-reg' })));

      service.register({ email: 'user@example.com', password: 'pass123' }).subscribe();

      expect(service.accessToken()).toBe('token-reg');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('при ошибке login() состояние сессии не меняется', () => {
      repository.login.mockReturnValue(throwError(() => new Error('Неверный пароль')));

      service
        .login({ email: 'user@example.com', password: 'wrong' })
        .subscribe({ error: () => {} });

      expect(service.accessToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshSession() — single-flight', () => {
    it('дедуплицирует параллельные вызовы в один HTTP-запрос', () => {
      const response$ = new Subject<AuthResponse>();
      repository.refreshSession.mockReturnValue(response$.asObservable());

      const results: AuthUser[] = [];
      service.refreshSession().subscribe((u) => results.push(u));
      service.refreshSession().subscribe((u) => results.push(u));
      service.refreshSession().subscribe((u) => results.push(u));

      expect(repository.refreshSession).toHaveBeenCalledOnce();

      response$.next(makeAuthResponse({ accessToken: 'fresh-token' }));
      response$.complete();

      expect(results).toEqual([MOCK_USER, MOCK_USER, MOCK_USER]);
      expect(service.accessToken()).toBe('fresh-token');
    });

    it('после завершения refresh следующий вызов делает новый запрос, а не переиспользует старый результат', () => {
      repository.refreshSession
        .mockReturnValueOnce(of(makeAuthResponse({ accessToken: 't1' })))
        .mockReturnValueOnce(of(makeAuthResponse({ accessToken: 't2' })));

      service.refreshSession().subscribe();
      expect(repository.refreshSession).toHaveBeenCalledTimes(1);
      expect(service.accessToken()).toBe('t1');

      service.refreshSession().subscribe();
      expect(repository.refreshSession).toHaveBeenCalledTimes(2);
      expect(service.accessToken()).toBe('t2');
    });

    it('после ошибки refresh сбрасывает #refreshInFlight — следующий вызов повторяет попытку, а не залипает навсегда', () => {
      repository.refreshSession
        .mockReturnValueOnce(throwError(() => new Error('network down')))
        .mockReturnValueOnce(of(makeAuthResponse({ accessToken: 'recovered' })));

      let firstError: unknown;
      service.refreshSession().subscribe({ error: (e) => (firstError = e) });

      expect(firstError).toBeInstanceOf(Error);
      expect(repository.refreshSession).toHaveBeenCalledTimes(1);

      let secondUser: AuthUser | undefined;
      service.refreshSession().subscribe((u) => (secondUser = u));

      expect(repository.refreshSession).toHaveBeenCalledTimes(2);
      expect(secondUser).toEqual(MOCK_USER);
      expect(service.accessToken()).toBe('recovered');
    });

    it('параллельные вызовы получают одну и ту же ошибку, если refresh падает', () => {
      const response$ = new Subject<AuthResponse>();
      repository.refreshSession.mockReturnValue(response$.asObservable());

      const errors: unknown[] = [];
      service.refreshSession().subscribe({ error: (e) => errors.push(e) });
      service.refreshSession().subscribe({ error: (e) => errors.push(e) });

      const failure = new Error('refresh failed');
      response$.error(failure);

      expect(errors).toEqual([failure, failure]);
      expect(repository.refreshSession).toHaveBeenCalledOnce();
    });
  });

  describe('logout()', () => {
    it('чистит сессию и редиректит на /login после успешного запроса', () => {
      repository.logout.mockReturnValue(of(undefined));
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      repository.login.mockReturnValue(of(makeAuthResponse()));
      service.login({ email: 'a@b.com', password: 'x' }).subscribe();

      service.logout();

      expect(repository.logout).toHaveBeenCalledOnce();
      expect(service.accessToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('чистит сессию и редиректит на /login, даже если запрос logout на сервере упал', () => {
      repository.logout.mockReturnValue(throwError(() => new Error('server unreachable')));
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      expect(() => service.logout()).not.toThrow();

      expect(service.accessToken()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('endSession()', () => {
    it('чистит сессию и редиректит на /login напрямую (без запроса на сервер)', () => {
      repository.login.mockReturnValue(of(makeAuthResponse()));
      service.login({ email: 'a@b.com', password: 'x' }).subscribe();
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      service.endSession();

      expect(repository.logout).not.toHaveBeenCalled();
      expect(service.accessToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
