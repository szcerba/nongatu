import type { AuthProviderType } from '../models/auth-provider-type.enum';
import type { AuthResult } from '../models/auth-result.model';
import type { User } from '../models/user.model';

export interface AuthProvider {
  readonly type: AuthProviderType;

  signIn(): Promise<AuthResult>;

  signOut(): Promise<void>;

  restoreSession(): Promise<AuthResult | null>;

  getAccessToken(): Promise<string | null>;

  isAvailable(): boolean;
}
