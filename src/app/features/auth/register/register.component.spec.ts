import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthUser } from '../../../core/auth/auth.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { RegisterComponent } from './register.component';

const MOCK_USER: AuthUser = {
  id: 'u1',
  email: 'user@example.com',
};

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let registerMock: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  function fillForm(
    overrides: Partial<{
      email: string;
      password: string;
      confirmPassword: string;
    }> = {},
  ) {
    component.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
      ...overrides,
    });
  }

  beforeEach(() => {
    registerMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: { register: registerMock },
        },
      ],
    });

    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.detectChanges();
  });

  it('форма невалидна, если пароли не совпадают, и submit() не вызывает register()', () => {
    fillForm({
      confirmPassword: 'different',
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.errors).toEqual({ passwordMismatch: true });

    component.submit();

    expect(registerMock).not.toHaveBeenCalled();
  });

  it('форма валидна, когда пароли совпадают и достаточно длинные', () => {
    fillForm();

    expect(component.form.valid).toBe(true);
  });

  it('password короче 6 символов делает форму невалидной', () => {
    fillForm({
      password: '123',
      confirmPassword: '123',
    });

    expect(component.form.controls.password.invalid).toBe(true);
    expect(component.form.controls.password.errors).toEqual({
      minlength: expect.any(Object),
    });
  });

  it('пустые обязательные поля делают форму невалидной', () => {
    component.form.setValue({
      email: '',
      password: '',
      confirmPassword: '',
    });

    expect(component.form.controls.email.hasError('required')).toBe(true);
    expect(component.form.controls.password.hasError('required')).toBe(true);
  });

  it('невалидный email делает форму невалидной', () => {
    fillForm({
      email: 'invalid-email',
    });

    expect(component.form.controls.email.hasError('email')).toBe(true);
  });

  it('submit() с валидными данными отправляет в register() только email и password', () => {
    registerMock.mockReturnValue(of(MOCK_USER));

    fillForm();

    component.submit();

    expect(registerMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });

    expect(navigateSpy).toHaveBeenCalledWith('/cocktails');
    expect(component.errorMessage()).toBeNull();
    expect(component.isSubmitting()).toBe(false);
  });

  it('при 409 показывает сообщение про уже существующий email и не выполняет навигацию', () => {
    registerMock.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
          }),
      ),
    );

    fillForm();

    component.submit();

    expect(component.errorMessage()).toBe('Пользователь с таким email уже существует');
    expect(component.isSubmitting()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('при 400 показывает конкретное сообщение бэкенда, а не общую фразу', () => {
    registerMock.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'Некорректный email или пароль короче 6 символов' },
          }),
      ),
    );
    fillForm();
    component.submit();

    expect(component.errorMessage()).toBe('Некорректный email или пароль короче 6 символов');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('при 400 без тела сообщения — общая фраза, а не undefined/пустая строка', () => {
    registerMock.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
    );
    fillForm();
    component.submit();

    expect(component.errorMessage()).toBe('Не удалось зарегистрироваться. Попробуйте в другой раз');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('при прочих ошибках показывает общее сообщение и не выполняет навигацию', () => {
    registerMock.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Server Error',
          }),
      ),
    );

    fillForm();

    component.submit();

    expect(component.errorMessage()).toBe('Не удалось зарегистрироваться. Попробуйте в другой раз');
    expect(component.isSubmitting()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('текст "Пароли не совпадают" появляется только после touch поля confirmPassword', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const localComponent = fixture.componentInstance;

    fixture.detectChanges();

    localComponent.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
      confirmPassword: 'different',
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Пароли не совпадают');

    localComponent.form.controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Пароли не совпадают');
  });

  it('сообщение "Пароли не совпадают" исчезает после исправления confirmPassword', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const localComponent = fixture.componentInstance;

    fixture.detectChanges();

    localComponent.form.setValue({
      email: 'user@example.com',
      password: 'secret123',
      confirmPassword: 'different',
    });

    localComponent.form.controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Пароли не совпадают');

    localComponent.form.controls.confirmPassword.setValue('secret123');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Пароли не совпадают');
  });
});
