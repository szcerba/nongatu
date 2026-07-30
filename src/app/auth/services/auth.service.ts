import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthProvider } from './auth-provider.interface';
import type { AuthResult } from '../models/auth-result.model';
import type { User } from '../models/user.model';
import { AuthProviderType } from '../models/auth-provider-type.enum';
import { GoogleAuthProviderService } from './google-auth-provider.service';
import { AuthStorageService } from './auth-storage.service';

export type AuthErrorCode =
  | 'cancelled'
  | 'offline'
  | 'token_expired'
  | 'google_error'
  | 'unexpected';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<AuthError | null>(null);

  private readonly providers = new Map<AuthProviderType, AuthProvider>();
  private activeProvider: AuthProvider | null = null;
  private readonly storage = inject(AuthStorageService);

  constructor() {
    const google = inject(GoogleAuthProviderService);
    this.providers.set(AuthProviderType.Google, google);
  }

  async restoreSession(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const saved = await this.storage.loadUser();
      if (!saved) {
        this.user.set(null);
        this.isLoading.set(false);
        return;
      }

      const provider = this.providers.get(AuthProviderType.Google);
      if (!provider) {
        this.user.set(null);
        this.isLoading.set(false);
        return;
      }

      const restored = await provider.restoreSession();
      if (restored) {
        this.activeProvider = provider;
        this.user.set(restored.user);
      } else {
        await this.storage.clear();
        this.user.set(null);
      }
    } catch {
      await this.storage.clear();
      this.user.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async login(providerType: AuthProviderType = AuthProviderType.Google): Promise<AuthResult | null> {
    this.error.set(null);

    const provider = this.providers.get(providerType);
    if (!provider) {
      this.error.set({ code: 'unexpected', message: `Proveedor ${providerType} no configurado` });
      return null;
    }

    if (!provider.isAvailable()) {
      this.error.set({ code: 'offline', message: 'Autenticación disponible solo en dispositivo móvil' });
      return null;
    }

    try {
      const result = await provider.signIn();
      this.activeProvider = provider;
      this.user.set(result.user);
      await this.storage.saveUser(result.user);
      return result;
    } catch (err: any) {
      const authError = this.mapError(err);
      this.error.set(authError);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.activeProvider?.signOut();
    } catch {
      // Ignorar errores de logout
    }

    this.activeProvider = null;
    this.user.set(null);
    this.error.set(null);
    await this.storage.clear();
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await this.activeProvider?.getAccessToken() ?? null;
    } catch {
      return null;
    }
  }

  static handleOAuthPopup(): () => Promise<void> {
    return async () => {
      if (typeof window === 'undefined') return;
      if (window.name !== 'Google Sign In') return;

      const hash = window.location.hash.substring(1);
      if (!hash) {
        try { window.close(); } catch { /* ignore */ }
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');

      if (accessToken && idToken) {
        const stateRaw = localStorage.getItem('social_login_oauth_pending');
        if (stateRaw) {
          try {
            const parsed = JSON.parse(stateRaw);
            const nonce = parsed.nonce;
            if (nonce) {
              const channel = new BroadcastChannel(`google_oauth_${nonce}`);
              channel.postMessage({
                type: 'oauth-response',
                provider: 'google',
                accessToken: { token: accessToken },
                idToken,
                responseType: 'online',
              });
              channel.close();
            }
          } catch { /* ignore */ }
        }
      }

      localStorage.removeItem('social_login_oauth_pending');
      try { window.close(); } catch { /* ignore */ }
    };
  }

  clearError(): void {
    this.error.set(null);
  }

  private mapError(err: any): AuthError {
    const message = err?.message ?? '';

    if (this.isCancellation(err, message)) {
      return { code: 'cancelled', message: 'Inicio de sesión cancelado' };
    }
    if (message.includes('network') || message.includes('offline') || message.includes('No internet')) {
      return { code: 'offline', message: 'Sin conexión a internet. Verifica tu conexión.' };
    }
    if (message.includes('token') || message.includes('expired') || message.includes('unauthorized')) {
      return { code: 'token_expired', message: 'La sesión expiró. Inicia sesión nuevamente.' };
    }
    if (message.includes('google') || message.includes('GOOGLE') || message.includes('10')) {
      return { code: 'google_error', message: 'Error de Google. Intenta nuevamente.' };
    }

    console.error('Auth error:', err);
    return { code: 'unexpected', message: 'Error inesperado al iniciar sesión.' };
  }

  private isCancellation(err: any, message: string): boolean {
    if (err?.code === 'CANCELED' || err?.code === 'canceled') return true;
    if (message.includes('cancel') || message.includes('Cancel')) return true;
    if (err?.message === 'User cancelled') return true;
    return false;
  }
}
