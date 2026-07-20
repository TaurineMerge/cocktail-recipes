import { FormControl } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { strictEmailValidator } from './email.validator';

describe('strictEmailValidator', () => {
  const validator = strictEmailValidator();

  it('пропускает пустое значение (ответственность required)', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('принимает обычный email с доменом и TLD', () => {
    expect(validator(new FormControl('user@example.com'))).toBeNull();
  });

  it('отклоняет email без домена верхневого уровня (TLD)', () => {
    expect(validator(new FormControl('asdf@xcv'))).toEqual({ email: true });
    expect(validator(new FormControl('asdf@xcv.'))).toEqual({ email: true });
  });

  it('отклоняет email без @', () => {
    expect(validator(new FormControl('not-an-email'))).toEqual({ email: true });
  });

  it('отклоняет email с пробелом', () => {
    expect(validator(new FormControl('user name@example.com'))).toEqual({ email: true });
  });
});
