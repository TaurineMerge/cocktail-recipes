import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/services/auth.service';
import { AuthUser } from '../../../core/auth/auth.model';

const MOCK_USER: AuthUser = { id: 'u1', email: 'user@example.com' };

describe('LoginComponent', () => {
  let loginMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loginMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: { login: loginMock } },
      ],
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('submit() с пустой формой не вызывает login() и помечает поля touched', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.submit();

    expect(loginMock).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
    expect(component.form.controls.password.touched).toBe(true);
  });

  it('submit() с валидными данными вызывает AuthService.login() и переходит на /cocktails', () => {
    loginMock.mockReturnValue(of(MOCK_USER));

    const fixture = setup();
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
    });

    component.submit();

    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(navigateSpy).toHaveBeenCalledWith('/cocktails');
  });

  it('при 401 показывает сообщение про неверный email или пароль', () => {
    loginMock.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    const fixture = setup();
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'user@example.com',
      password: 'wrong',
    });

    component.submit();

    expect(component.errorMessage()).toBe('Неверный email или пароль');
    expect(component.isSubmitting()).toBe(false);
  });

  it('при прочих HTTP-ошибках показывает общее сообщение', () => {
    loginMock.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );

    const fixture = setup();
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
    });

    component.submit();

    expect(component.errorMessage()).toBe('Не удалось войти. Попробуйте позже.');
  });

  it('при не-HTTP ошибке (например, сеть недоступна) тоже показывает общее сообщение', () => {
    loginMock.mockReturnValue(throwError(() => new Error('network down')));

    const fixture = setup();
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
    });

    component.submit();

    expect(component.errorMessage()).toBe('Не удалось войти. Попробуйте позже.');
  });

  it('повторный submit() во время уже выполняющегося запроса игнорируется', () => {
    const login = new Subject<AuthUser>();
    loginMock.mockReturnValue(login);

    const fixture = setup();
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
    });

    component.submit();
    component.submit();

    expect(loginMock).toHaveBeenCalledTimes(1);
  });

  it('рендерит app-password-field с типом поля password по умолчанию', () => {
    const fixture = setup();

    const input = fixture.nativeElement.querySelector('input[type="password"]');

    expect(input).not.toBeNull();
  });
});
