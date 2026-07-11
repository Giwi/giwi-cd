import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminSettings, UserListItem } from '../models/admin.types';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  getSettings(): Observable<{ settings: AdminSettings }> {
    return this.api.get<{ settings: AdminSettings }>('/admin/settings');
  }

  updateSettings(settings: Partial<AdminSettings>): Observable<{ settings: AdminSettings; message: string }> {
    return this.api.put<{ settings: AdminSettings; message: string }>('/admin/settings', settings);
  }

  getUsers(): Observable<{ users: UserListItem[] }> {
    return this.api.get<{ users: UserListItem[] }>('/admin/users');
  }

  getUser(id: string): Observable<{ user: UserListItem }> {
    return this.api.get<{ user: UserListItem }>(`/admin/users/${id}`);
  }

  createUser(data: { email: string; password: string; username?: string; role?: string }): Observable<any> {
    return this.api.post('/admin/users', data);
  }

  updateUser(id: string, data: { username?: string; role?: string; password?: string }): Observable<{ user: UserListItem }> {
    return this.api.put<{ user: UserListItem }>(`/admin/users/${id}`, data);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/admin/users/${id}`);
  }
}
