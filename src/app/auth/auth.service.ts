import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { AppUserDto, AuthResponseDto, LoginRequestDto } from './auth-api.models';

const ACCESS_TOKEN_KEY = 'fifabet.accessToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(Boolean(this.accessToken));

  constructor(private readonly http: HttpClient) {}

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  register(user: AppUserDto): Observable<AppUserDto> {
    return this.http.post<AppUserDto>(`${API_BASE_URL}/users`, user);
  }

  confirmEmail(username: string, token: string): Observable<void> {
    return this.http.get<void>(
      `${API_BASE_URL}/users/${encodeURIComponent(username)}/confirm-email/${encodeURIComponent(token)}`
    );
  }

  login(credentials: LoginRequestDto): Observable<AuthResponseDto> {
    return this.http
      .post<AuthResponseDto>(`${API_BASE_URL}/auth/login`, credentials, { withCredentials: true })
      .pipe(tap((response) => this.storeAuth(response)));
  }

  refresh(): Observable<AuthResponseDto> {
    return this.http
      .post<AuthResponseDto>(`${API_BASE_URL}/auth/refresh`, null, { withCredentials: true })
      .pipe(tap((response) => this.storeAuth(response)));
  }

  logout(): Observable<void> {
    this.clearAuth();
    return this.http.post<void>(`${API_BASE_URL}/auth/logout`, null, { withCredentials: true });
  }

  clearAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    this.isAuthenticated.set(false);
  }

  private storeAuth(response: AuthResponseDto): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    this.isAuthenticated.set(true);
  }
}
