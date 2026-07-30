import type { User } from './user.model';

export interface AuthResult {
  user: User;
  accessToken: string;
  idToken: string | null;
}
