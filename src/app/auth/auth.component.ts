import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import type { AppPage } from '../models';

type PasswordField = 'loginPassword' | 'newPassword' | 'confirmPassword';

type VisiblePasswords = {
  loginPassword: boolean;
  newPassword: boolean;
  confirmPassword: boolean;
};

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  readonly visiblePasswords = signal<VisiblePasswords>({
    loginPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  @Input({ required: true }) page!: AppPage;
  @Input() authMessage = '';

  @Output() loginSubmit = new EventEmitter<SubmitEvent>();
  @Output() createAccountSubmit = new EventEmitter<SubmitEvent>();
  @Output() passwordResetSubmit = new EventEmitter<SubmitEvent>();
  @Output() createAccountClick = new EventEmitter<Event>();
  @Output() forgotPasswordClick = new EventEmitter<Event>();
  @Output() loginClick = new EventEmitter<Event | undefined>();

  togglePasswordVisibility(field: PasswordField): void {
    this.visiblePasswords.update((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }
}
