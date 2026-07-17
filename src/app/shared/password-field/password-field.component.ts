import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './password-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input('Пароль');
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly errorText = input('Минимум 6 символов');

  protected hide = true;

  toggleVisibility(): void {
    this.hide = !this.hide;
  }
}
