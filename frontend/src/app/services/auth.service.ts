import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private readonly apiUrl = '/api/auth';
  private readonly tokenKey = 'giwicd_token';
  private readonly userKey = 'giwicd_user';

  private _user = signal<User | null>(null);
  private _isAuthenticated = signal(false);
  private _isLoading = signal(true);
  private _isAdmin = signal(false);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initAuth();
    } else {
      this._isLoading.set(false);
    }
  }

  private initAuth(): void {
    const token = localStorage.getItem(this.tokenKey) as any;
    const userStr = localStorage.getItem(this.userKey);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this._user.set(user);
        this._isAuthenticated.set(true);
        this._isAdmin.set(user.role === 'admin');
      } catch {
        this.clearAuth();
      }
    }
    this._isLoading.set(false);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._user.set(null);
    this._isAuthenticated.set(false);
    this._isAdmin.set(false);
  }

  private storeAuth(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this._user.set(user);
    this._isAuthenticated.set(true);
    this._isAdmin.set(user.role === 'admin');
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        this.storeAuth(response.token, response.user);
      }),
      catchError(error => {
        this.clearAuth();
        throw error;
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(response => {
        this.storeAuth(response.token, response.user);
      }),
      catchError(error => {
        this.clearAuth();
        throw error;
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => {
        this.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.clearAuth();
        this.router.navigate(['/login']);
      }
    });
  }

  checkAuth(): Observable<{ user: User } | null> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/me`).pipe(
      tap(response => {
        this._user.set(response.user);
        this._isAuthenticated.set(true);
        this._isAdmin.set(response.user.role === 'admin');
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      }),
      catchError(() => {
        this.clearAuth();
        return of(null);
      })
    );
  }

  updateProfile(data: { username?: string }): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.apiUrl}/me`, data).pipe(
      tap(response => {
        this._user.set(response.user);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      })
    );
  }

  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, { currentPassword, newPassword });
  }
}
