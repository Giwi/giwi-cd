import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminSettings, UserListItem } from '../models/admin.types';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/admin';

  getSettings(): Observable<{ settings: AdminSettings }> {
    return this.http.get<{ settings: AdminSettings }>(`${this.apiUrl}/settings`);
  }

  updateSettings(settings: Partial<AdminSettings>): Observable<{ settings: AdminSettings; message: string }> {
    return this.http.put<{ settings: AdminSettings; message: string }>(`${this.apiUrl}/settings`, settings);
  }

  getUsers(): Observable<{ users: UserListItem[] }> {
    return this.http.get<{ users: UserListItem[] }>(`${this.apiUrl}/users`);
  }

  getUser(id: string): Observable<{ user: UserListItem }> {
    return this.http.get<{ user: UserListItem }>(`${this.apiUrl}/users/${id}`);
  }

  createUser(data: { email: string; password: string; username?: string; role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, data);
  }

  updateUser(id: string, data: { username?: string; role?: string; password?: string }): Observable<{ user: UserListItem }> {
    return this.http.put<{ user: UserListItem }>(`${this.apiUrl}/users/${id}`, data);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`);
  }
}
