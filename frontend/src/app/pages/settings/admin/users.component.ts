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

    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
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
                    <div class="user-avatar-sm">{{ getInitials(user.username) }}</div>
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
