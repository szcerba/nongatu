import { Injectable } from '@angular/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { environment } from '../../../environments/environment';
import type { AuthProvider } from './auth-provider.interface';
import type { AuthResult } from '../models/auth-result.model';
import type { User } from '../models/user.model';
import { AuthProviderType } from '../models/auth-provider-type.enum';

@Injectable({ providedIn: 'root' })
export class GoogleAuthProviderService implements AuthProvider {
  readonly type = AuthProviderType.Google;

  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.isAvailable()) return;

    const origin = window.location.origin;
    await SocialLogin.initialize({
      google: {
        webClientId: environment.googleClientId,
        redirectUrl: origin,
      },
    });
    this.initialized = true;
  }

  isAvailable(): boolean {
    return true;
  }

  async signIn(): Promise<AuthResult> {
    await this.ensureInitialized();
    const response = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'] },
    });

    if (response.result.responseType === 'offline') {
      throw new Error('Google offline mode no soportado para login directo');
    }

    const profile = response.result.profile;
    const user: User = {
      id: profile.id ?? '',
      email: profile.email ?? '',
      name: profile.name ?? '',
      givenName: profile.givenName ?? '',
      familyName: profile.familyName ?? '',
      photoUrl: profile.imageUrl ?? null,
    };

    return {
      user,
      accessToken: response.result.accessToken?.token ?? '',
      idToken: response.result.idToken ?? null,
    };
  }

  async signOut(): Promise<void> {
    if (!this.initialized) return;
    await SocialLogin.logout({ provider: 'google' });
    this.initialized = false;
  }

  async restoreSession(): Promise<AuthResult | null> {
    if (!this.isAvailable()) return null;
    await this.ensureInitialized();

    try {
      const status = await SocialLogin.isLoggedIn({ provider: 'google' });
      if (status.isLoggedIn) return this.readSavedAuthResult();
    } catch {
      // Network error — fall through to local check below
    }

    return this.isLocallyValid() ? this.readSavedAuthResult() : null;
  }

  private readSavedAuthResult(): AuthResult | null {
    try {
      const raw = window.localStorage.getItem('capgo_social_login_google_state');
      if (!raw) return null;

      const { accessToken, idToken } = JSON.parse(raw);
      if (!accessToken || !idToken) return null;

      const payload = this.decodeJwtPayload(idToken);
      const user: User = {
        id: (payload['sub'] as string) ?? '',
        email: (payload['email'] as string) ?? '',
        name: (payload['name'] as string) ?? '',
        givenName: (payload['given_name'] as string) ?? '',
        familyName: (payload['family_name'] as string) ?? '',
        photoUrl: (payload['picture'] as string | null) ?? null,
      };

      return { user, accessToken, idToken };
    } catch {
      return null;
    }
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return {};
      const payload = parts[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return {};
    }
  }

  private isLocallyValid(): boolean {
    try {
      const raw = window.localStorage.getItem('capgo_social_login_google_state');
      if (!raw) return false;
      const { idToken } = JSON.parse(raw);
      if (!idToken) return false;
      const payload = this.decodeJwtPayload(idToken);
      const exp = payload['exp'] as number | undefined;
      if (!exp) return false;
      return Date.now() / 1000 < exp;
    } catch {
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.isLocallyValid()) return null;

    try {
      const raw = window.localStorage.getItem('capgo_social_login_google_state');
      if (!raw) return null;
      const { accessToken } = JSON.parse(raw);
      return accessToken ?? null;
    } catch {
      return null;
    }
  }
}
