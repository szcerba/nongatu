import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthProviderType } from '../../models/auth-provider-type.enum';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isLoading = this.auth.isLoading;
  readonly user = this.auth.user;
  readonly error = this.auth.error;

  readonly signingIn = signal(false);

  async signInWithGoogle(): Promise<void> {
    this.auth.clearError();
    this.signingIn.set(true);

    try {
      const result = await this.auth.login(AuthProviderType.Google);
      if (result) {
        await this.router.navigate(['/dashboard']);
      }
    } finally {
      this.signingIn.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.signingIn.set(false);
  }
}
