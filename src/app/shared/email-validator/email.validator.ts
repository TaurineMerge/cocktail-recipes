import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function strictEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    return EMAIL_PATTERN.test(control.value) ? null : { email: true };
  };
}
