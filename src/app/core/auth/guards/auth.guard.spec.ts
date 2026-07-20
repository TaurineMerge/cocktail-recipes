import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../auth.model';

const MOCK_USER: AuthUser = { id: 'u1', email: 'user@example.com' };

describe('authGuard', () => {
  let isAuthenticatedValue: boolean;
  let refreshSessionMock: ReturnType<typeof vi.fn>;
  let endSessionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAuthenticatedValue = false;
    refreshSessionMock = vi.fn();
    endSessionMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuthenticatedValue,
            refreshSession: refreshSessionMock,
            endSession: endSessionMock,
          },
        },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  }

  it('пропускает сразу, если пользователь уже аутентифицирован — без похода за refresh', () => {
    isAuthenticatedValue = true;

    const result = runGuard();

    expect(result).toBe(true);
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it('пытается обновить сессию и пропускает при успешном обновлении, если пользователь не аутентифицирован', async () => {
    refreshSessionMock.mockReturnValue(of(MOCK_USER));

    const result = runGuard();
    expect(result).not.toBe(true);
    const resolved = await firstValueFrom(result as Observable<boolean>);

    expect(resolved).toBe(true);
    expect(endSessionMock).not.toHaveBeenCalled();
  });

  it('завершает сессию и не пропускает при ошибке обновления сессии', async () => {
    refreshSessionMock.mockReturnValue(throwError(() => new Error('refresh failed')));

    const result = runGuard();
    const resolved = await firstValueFrom(result as Observable<boolean>);

    expect(resolved).toBe(false);
    expect(endSessionMock).toHaveBeenCalledOnce();
  });
});
