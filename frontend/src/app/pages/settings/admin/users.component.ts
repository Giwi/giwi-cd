import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { UserListItem, UserListResponse } from '../../../models/admin.types';
import { ConfirmService } from '../../../services/confirm.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage users and their roles</p>
      </div>
      <button class="btn btn-primary" (click)="showCreateModal = true">
        <i class="bi bi-plus-lg me-2"></i>
        Add User
      </button>
    </div>

    @if (message(); as msg) {
      <div class="alert" [class]="msg.type === 'success' ? 'alert-success' : 'alert-danger'">
        <i class="bi" [class]="msg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
        {{ msg.text }}
      </div>
    }

    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr>
              <td>
                <div class="d-flex align-items-center gap-2">
                  @if (getGravatar(user.email); as gravatar) {
                    <img [src]="gravatar" class="user-avatar-img" alt="Avatar">
                  } @else {
                    <div class="user-avatar-sm">{{ getInitials(user.username) }}</div>
                  }
                  <strong>{{ user.username }}</strong>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge" [class]="user.role === 'admin' ? 'bg-primary' : 'bg-secondary'">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ user.createdAt | date:'short' }}</td>
              <td class="text-end">
                <div class="btn-group">
                  <button class="btn btn-sm btn-ghost" (click)="editUser(user)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-ghost text-danger" 
                    (click)="deleteUser(user)"
                    [disabled]="user.id === currentUserId"
                    title="Delete"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="text-center py-4 text-muted">No users found</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (showCreateModal) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingUser ? 'Edit User' : 'Create New User' }}</h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="userEmail">Email</label>
              <input 
                type="email" 
                class="form-control" 
                id="userEmail"
                [(ngModel)]="formData.email"
                [disabled]="!!editingUser"
                placeholder="user@example.com"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="userUsername">Username</label>
              <input 
                type="text" 
                class="form-control" 
                id="userUsername"
                [(ngModel)]="formData.username"
                placeholder="Username"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="userRole">Role</label>
              <select class="form-select" id="userRole" [(ngModel)]="formData.role">
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="userPassword">
                {{ editingUser ? 'New Password (leave blank to keep current)' : 'Password' }}
              </label>
              <input 
                type="password" 
                class="form-control" 
                id="userPassword"
                [(ngModel)]="formData.password"
                [required]="!editingUser"
                placeholder="At least 6 characters"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Cancel</button>
            <button 
              type="button" 
              class="btn btn-primary" 
              [disabled]="isSaving() || !isFormValid()"
              (click)="saveUser()"
            >
              @if (isSaving()) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              {{ editingUser ? 'Save Changes' : 'Create User' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .user-avatar-sm {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .user-avatar-img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
    }
    
    .modal-content {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 480px;
      box-shadow: var(--shadow-xl);
    }
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    
    .modal-title {
      margin: 0;
      font-weight: 700;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .table {
      margin: 0;
    }
  `]
})
export class UsersComponent implements OnInit {
  users = signal<UserListItem[]>([]);
  currentUserId = '';
  showCreateModal = false;
  editingUser: UserListItem | null = null;
  
  formData = {
    email: '',
    username: '',
    role: 'contributor',
    password: ''
  };

  isSaving = signal(false);
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  constructor(
    private adminService: AdminService,
    private confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    const userStr = localStorage.getItem('giwicd_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserId = user.id;
      } catch {}
    }
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (response: UserListResponse) => {
        this.users.set(response.users);
      }
    });
  }

  getInitials(name: string): string {
    return name.substring(0, 2).toUpperCase();
  }

  getGravatar(email: string): string | null {
    if (!email) return null;
    const hash = this.md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=64&d=mp`;
  }

  private md5(str: string): string {
    const rotateLeft = (val: number, shift: number) => (val << shift) | (val >>> (32 - shift));
    const ff = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => 
      (rotateLeft((a + ((b & c) | (~b & d)) + x + ac) | 0, s) + b) | 0;
    const gg = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => 
      (rotateLeft((a + ((b & d) | (~d & c)) + x + ac) | 0, s) + b) | 0;
    const hh = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => 
      (rotateLeft((a + (b ^ c ^ d) + x + ac) | 0, s) + b) | 0;
    const ii = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => 
      (rotateLeft((a + (c ^ (b | ~d)) + x + ac) | 0, s) + b) | 0;
    const cvtHex = (val: number) => {
      let str = '';
      for (let i = 0; i <= 3; i++) str += ((val >>> (i * 8)) & 0x000000FF).toString(16).padStart(2, '0');
      return str;
    };
    let x = [];
    const lln = str.length + 8;
    const ls = (lln - (lln % 64)) / 64;
    const lx = (ls + 1) * 16;
    for (let i = 0; i < lx; i++) x[i] = 0;
    let l = 0;
    while (l < str.length) {
      const i = (l - (l % 4)) / 4;
      const j = (l % 4) * 8;
      x[i] = x[i] | (str.charCodeAt(l) << j);
      l++;
    }
    const i = (l - (l % 4)) / 4;
    const j = (l % 4) * 8;
    x[i] = x[i] | (0x80 << j);
    x[lx - 2] = str.length * 8;
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
    for (let i = 0; i < lx; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, x[i + 0], 7, 0xD76AA478);
      d = ff(d, a, b, c, x[i + 1], 12, 0xE8C7B756);
      c = ff(c, d, a, b, x[i + 2], 17, 0x242070DB);
      b = ff(b, c, d, a, x[i + 3], 22, 0xC1BDCEEE);
      a = ff(a, b, c, d, x[i + 4], 7, 0xF57C0FAF);
      d = ff(d, a, b, c, x[i + 5], 12, 0x4787C62A);
      c = ff(c, d, a, b, x[i + 6], 17, 0xA8304613);
      b = ff(b, c, d, a, x[i + 7], 22, 0xFD469501);
      a = ff(a, b, c, d, x[i + 8], 7, 0x698098D8);
      d = ff(d, a, b, c, x[i + 9], 12, 0x8B44F7AF);
      c = ff(c, d, a, b, x[i + 10], 17, 0xFFFF5BB1);
      b = ff(b, c, d, a, x[i + 11], 22, 0x895CD7BE);
      a = ff(a, b, c, d, x[i + 12], 7, 0x6B901122);
      d = ff(d, a, b, c, x[i + 13], 12, 0xFD987193);
      c = ff(c, d, a, b, x[i + 14], 17, 0xA679438E);
      b = ff(b, c, d, a, x[i + 15], 22, 0x49B40821);
      a = gg(a, b, c, d, x[i + 1], 5, 0xF61E2562);
      d = gg(d, a, b, c, x[i + 6], 9, 0xC040B340);
      c = gg(c, d, a, b, x[i + 11], 14, 0x265E5A51);
      b = gg(b, c, d, a, x[i + 0], 20, 0xE9B6C7AA);
      a = gg(a, b, c, d, x[i + 5], 5, 0xD62F105D);
      d = gg(d, a, b, c, x[i + 10], 9, 0x2441453);
      c = gg(c, d, a, b, x[i + 15], 14, 0xD8A1E681);
      b = gg(b, c, d, a, x[i + 4], 20, 0xE7D3FBC8);
      a = gg(a, b, c, d, x[i + 9], 5, 0x21E1CDE6);
      d = gg(d, a, b, c, x[i + 14], 9, 0xC33707D6);
      c = gg(c, d, a, b, x[i + 3], 14, 0xF4D50D87);
      b = gg(b, c, d, a, x[i + 8], 20, 0x455A14ED);
      a = gg(a, b, c, d, x[i + 13], 5, 0xA9E3E905);
      d = gg(d, a, b, c, x[i + 2], 9, 0xFCEFA3F8);
      c = gg(c, d, a, b, x[i + 7], 14, 0x676F02D9);
      b = gg(b, c, d, a, x[i + 12], 20, 0x8D2A4C8A);
      a = hh(a, b, c, d, x[i + 5], 4, 0xFFFA3942);
      d = hh(d, a, b, c, x[i + 8], 11, 0x8771F681);
      c = hh(c, d, a, b, x[i + 11], 16, 0x6D9D6122);
      b = hh(b, c, d, a, x[i + 14], 23, 0xFDE5380C);
      a = hh(a, b, c, d, x[i + 1], 4, 0xA4BEEA44);
      d = hh(d, a, b, c, x[i + 4], 11, 0x4BDECFA9);
      c = hh(c, d, a, b, x[i + 7], 16, 0xF6BB4B60);
      b = hh(b, c, d, a, x[i + 10], 23, 0xBEBFBC70);
      a = hh(a, b, c, d, x[i + 13], 4, 0x289B7EC6);
      d = hh(d, a, b, c, x[i + 0], 11, 0xEAA127FA);
      c = hh(c, d, a, b, x[i + 3], 16, 0xD4EF3085);
      b = hh(b, c, d, a, x[i + 6], 23, 0x4881D05);
      a = hh(a, b, c, d, x[i + 9], 4, 0xD9D4D039);
      d = hh(d, a, b, c, x[i + 12], 11, 0xE6DB99E5);
      c = hh(c, d, a, b, x[i + 15], 16, 0x1FA27CF8);
      b = hh(b, c, d, a, x[i + 2], 23, 0xC4AC5665);
      a = ii(a, b, c, d, x[i + 0], 6, 0xF4292244);
      d = ii(d, a, b, c, x[i + 7], 10, 0x432AFF97);
      c = ii(c, d, a, b, x[i + 14], 15, 0xAB9423A7);
      b = ii(b, c, d, a, x[i + 5], 21, 0xFC93A039);
      a = ii(a, b, c, d, x[i + 12], 6, 0x655B59C3);
      d = ii(d, a, b, c, x[i + 3], 10, 0x8F0CCC92);
      c = ii(c, d, a, b, x[i + 10], 15, 0xFFEFF47D);
      b = ii(b, c, d, a, x[i + 1], 21, 0x85845DD1);
      a = ii(a, b, c, d, x[i + 8], 6, 0x6FA87E4F);
      d = ii(d, a, b, c, x[i + 15], 10, 0xFE2CE6E0);
      c = ii(c, d, a, b, x[i + 6], 15, 0xA3014314);
      b = ii(b, c, d, a, x[i + 13], 21, 0x4E0811A1);
      a = ii(a, b, c, d, x[i + 4], 6, 0xF7537E82);
      d = ii(d, a, b, c, x[i + 11], 10, 0xBD3AF235);
      c = ii(c, d, a, b, x[i + 2], 15, 0x2AD7D2BB);
      b = ii(b, c, d, a, x[i + 9], 21, 0xEB86D391);
      a = (a + oa) | 0;
      b = (b + ob) | 0;
      c = (c + oc) | 0;
      d = (d + od) | 0;
    }
    return (cvtHex(a) + cvtHex(b) + cvtHex(c) + cvtHex(d)).toLowerCase();
  }

  editUser(user: UserListItem): void {
    this.editingUser = user;
    this.formData = {
      email: user.email,
      username: user.username,
      role: user.role,
      password: ''
    };
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.editingUser = null;
    this.formData = { email: '', username: '', role: 'contributor', password: '' };
  }

  isFormValid(): boolean {
    if (this.editingUser) {
      return !!this.formData.username && !!this.formData.role;
    }
    return !!this.formData.email && !!this.formData.password && this.formData.password.length >= 6;
  }

  saveUser(): void {
    if (!this.isFormValid()) return;

    this.isSaving.set(true);
    this.message.set(null);

    if (this.editingUser) {
      const data: { username: string; role: string; password?: string } = { 
        username: this.formData.username, 
        role: this.formData.role 
      };
      if (this.formData.password) {
        data.password = this.formData.password;
      }
      this.adminService.updateUser(this.editingUser.id, data).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.loadUsers();
          this.closeModal();
          this.message.set({ type: 'success', text: 'User updated successfully' });
          setTimeout(() => this.message.set(null), 3000);
        },
        error: (err: { error?: { error?: string } }) => {
          this.isSaving.set(false);
          this.message.set({ type: 'error', text: err.error?.error || 'Failed to update user' });
        }
      });
    } else {
      this.adminService.createUser({
        email: this.formData.email,
        username: this.formData.username,
        role: this.formData.role,
        password: this.formData.password
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.loadUsers();
          this.closeModal();
          this.message.set({ type: 'success', text: 'User created successfully' });
          setTimeout(() => this.message.set(null), 3000);
        },
        error: (err: { error?: { error?: string } }) => {
          this.isSaving.set(false);
          this.message.set({ type: 'error', text: err.error?.error || 'Failed to create user' });
        }
      });
    }
  }

  deleteUser(user: UserListItem): void {
    this.confirmService.confirm(
      'Delete User',
      `Are you sure you want to delete ${user.username}? This action cannot be undone.`
    ).then((confirmed: boolean) => {
      if (confirmed) {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            this.loadUsers();
            this.message.set({ type: 'success', text: 'User deleted successfully' });
            setTimeout(() => this.message.set(null), 3000);
          },
          error: (err: { error?: { error?: string } }) => {
            this.message.set({ type: 'error', text: err.error?.error || 'Failed to delete user' });
          }
        });
      }
    });
  }
}
