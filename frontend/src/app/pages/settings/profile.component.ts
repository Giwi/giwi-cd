import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Profile Settings</h1>
        <p class="page-subtitle">Manage your account settings</p>
      </div>
    </div>

    @if (message(); as msg) {
      <div class="alert" [class]="msg.type === 'success' ? 'alert-success' : 'alert-danger'">
        <i class="bi" [class]="msg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
        {{ msg.text }}
      </div>
    }

    <div class="row">
      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-person"></i>
            Profile Information
          </div>

          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input 
              type="text" 
              class="form-control" 
              id="username"
              [(ngModel)]="username"
              placeholder="Enter username"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input 
              type="email" 
              class="form-control" 
              id="email"
              [value]="authService.user()?.email"
              disabled
            />
            <div class="form-text">Email cannot be changed</div>
          </div>

          <div class="form-group">
            <label class="form-label">Role</label>
            <input 
              type="text" 
              class="form-control" 
              [value]="authService.user()?.role | titlecase"
              disabled
            />
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isUpdating()"
            (click)="updateProfile()"
          >
            @if (isUpdating()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save Changes
          </button>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-lock"></i>
            Change Password
          </div>

          <div class="form-group">
            <label class="form-label" for="currentPassword">Current Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="currentPassword"
              [(ngModel)]="currentPassword"
              placeholder="Enter current password"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="newPassword">New Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="newPassword"
              [(ngModel)]="newPassword"
              placeholder="Enter new password"
              minlength="6"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmNewPassword">Confirm New Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="confirmNewPassword"
              [(ngModel)]="confirmNewPassword"
              placeholder="Confirm new password"
            />
            @if (confirmNewPassword && newPassword !== confirmNewPassword) {
              <div class="form-text text-danger">Passwords do not match</div>
            }
          </div>

          <button 
            class="btn btn-outline-primary"
            [disabled]="!isPasswordFormValid() || isUpdatingPassword()"
            (click)="updatePassword()"
          >
            @if (isUpdatingPassword()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Update Password
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .row {
      display: flex;
      gap: 1.5rem;
    }
    
    .col-lg-6 {
      flex: 1;
      min-width: 300px;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .form-section-title i {
      font-size: 1.25rem;
    }
  `]
})
export class ProfileComponent {
  authService = inject(AuthService);
  
  username = '';
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  
  isUpdating = signal(false);
  isUpdatingPassword = signal(false);
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  constructor() {
    const user = this.authService.user();
    if (user) {
      this.username = user.username || '';
    }
  }

  updateProfile(): void {
    this.isUpdating.set(true);
    this.message.set(null);

    this.authService.updateProfile({ username: this.username }).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.message.set({ type: 'success', text: 'Profile updated successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: () => {
        this.isUpdating.set(false);
        this.message.set({ type: 'error', text: 'Failed to update profile' });
      }
    });
  }

  isPasswordFormValid(): boolean {
    return !!this.currentPassword && 
           !!this.newPassword && 
           this.newPassword.length >= 6 && 
           this.newPassword === this.confirmNewPassword;
  }

  updatePassword(): void {
    if (!this.isPasswordFormValid()) return;

    this.isUpdatingPassword.set(true);
    this.message.set(null);

    this.authService.updatePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.isUpdatingPassword.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.message.set({ type: 'success', text: 'Password updated successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err) => {
        this.isUpdatingPassword.set(false);
        this.message.set({ type: 'error', text: err.error?.error || 'Failed to update password' });
      }
    });
  }
}
