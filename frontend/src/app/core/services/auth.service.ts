import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  type AuthUser,
  type CurrentUserData,
  type LoginData,
  type LoginRequest,
  type RegisterData,
  type RegisterRequest,
  type CompanySummary,
} from '../models/auth.model';
import { type ApiResponse } from '../models/api-response.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserState = signal<AuthUser | null>(null);

  private readonly currentCompanyState =
  signal<CompanySummary | null>(null);

  readonly currentCompany = this.currentCompanyState.asReadonly();

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = signal(this.tokenStorage.hasAccessToken());

  register(
    request: RegisterRequest,
  ): Observable<ApiResponse<RegisterData>> {
    return this.http.post<ApiResponse<RegisterData>>(
      `${this.apiUrl}/register`,
      request,
    );
  }

  login(request: LoginRequest): Observable<ApiResponse<LoginData>> {
    return this.http
      .post<ApiResponse<LoginData>>(`${this.apiUrl}/login`, request)
      .pipe(
        tap((response) => {
          if (!response.data) {
            return;
          }

          this.tokenStorage.setAccessToken(response.data.accessToken);
          this.currentUserState.set(response.data.user);
          this.isAuthenticated.set(true);
          this.currentCompanyState.set(response.data.company);
        }),
      );
  }

  loadCurrentUser(): Observable<ApiResponse<CurrentUserData>> {
    return this.http
      .get<ApiResponse<CurrentUserData>>(`${this.apiUrl}/me`)
      .pipe(
        tap((response) => {
          if (response.data) {
            this.currentUserState.set(response.data.user);
            this.currentCompanyState.set(response.data.user.company);
            this.isAuthenticated.set(true);
          }
        }),
      );
  }

  logout(): void {
    this.tokenStorage.clearAccessToken();
    this.currentUserState.set(null);
    this.currentCompanyState.set(null);
    this.isAuthenticated.set(false);
  }
}