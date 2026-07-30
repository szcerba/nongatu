import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { User } from '../models/user.model';

const USER_KEY = 'nongatu_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  async saveUser(user: User): Promise<void> {
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
  }

  async loadUser(): Promise<User | null> {
    const result = await Preferences.get({ key: USER_KEY });
    if (!result.value) return null;
    try {
      return JSON.parse(result.value) as User;
    } catch {
      await this.clear();
      return null;
    }
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: USER_KEY });
  }
}
