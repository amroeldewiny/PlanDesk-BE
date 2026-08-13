import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'plandesk_access_token';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  /**
   * V1 stores the short-lived access token in localStorage so sessions survive
   * reloads. A refresh-token release should move long-lived credentials to a
   * Secure, HttpOnly, SameSite cookie.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  clearAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  hasAccessToken(): boolean {
    return Boolean(this.getAccessToken());
  }
}
