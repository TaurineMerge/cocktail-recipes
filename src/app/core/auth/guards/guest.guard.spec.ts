import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../auth.model';

const MOCK_USER: AuthUser = { id: 'u1', email: 'user@example.com' };

describe('guestGuard', () => {
  let isAuthenticatedValue: boolean;
  let refreshSessionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAuthenticatedValue = false;
    refreshSessionMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuthenticatedValue,
            refreshSession: refreshSessionMock,
          },
        },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
  }

  async function resolveGuardResult() {
    const result = runGuard();

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result;
  }

  it('пропускает на гостевые страницы, если пользователь не аутентифицирован и refresh не удался', async () => {
    refreshSessionMock.mockReturnValue(throwError(() => new Error('нет сессии')));

    const resolved = await resolveGuardResult();

    expect(resolved).toBe(true);
  });

  it('редиректит на /cocktails, если пользователь уже аутентифицирован', async () => {
    isAuthenticatedValue = true;
    const router = TestBed.inject(Router);

    const resolved = await resolveGuardResult();

    expect(refreshSessionMock).not.toHaveBeenCalled();

    if (!(resolved instanceof UrlTree)) {
      throw new Error('Expected UrlTree');
    }

    expect(router.serializeUrl(resolved)).toBe('/cocktails');
  });

  it('редиректит на /cocktails после успешного восстановления сессии', async () => {
    refreshSessionMock.mockReturnValue(of(MOCK_USER));
    const router = TestBed.inject(Router);

    const resolved = await resolveGuardResult();

    if (!(resolved instanceof UrlTree)) {
      throw new Error('Expected UrlTree');
    }

    expect(router.serializeUrl(resolved)).toBe('/cocktails');
  });
});
