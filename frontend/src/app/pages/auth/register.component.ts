import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-icon">
            <i class="bi bi-person-plus"></i>
          </div>
          <h1>Create account</h1>
          <p>Get started with GiwiCD</p>
        </div>

        @if (error()) {
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle me-2"></i>
            {{ error() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input 
              type="text" 
              class="form-control" 
              id="username"
              name="username"
              [(ngModel)]="username"
              placeholder="Choose a username"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input 
              type="email" 
              class="form-control" 
              id="email"
              name="email"
              [(ngModel)]="email"
              placeholder="you@example.com"
              required
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="password"
              name="password"
              [(ngModel)]="password"
              placeholder="At least 6 characters"
              required
              minlength="6"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              placeholder="Confirm your password"
              required
              [disabled]="isLoading()"
            />
            @if (confirmPassword && password !== confirmPassword) {
              <div class="form-text text-danger">Passwords do not match</div>
            }
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-lg w-100"
            [disabled]="!isFormValid() || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
              Creating account...
            } @else {
              Create account
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--bg-base);
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: var(--shadow-lg);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;

      .brand-icon {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        color: #fff;
        margin: 0 auto 1.5rem;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
      }

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .alert {
      margin-bottom: 1.5rem;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);

      p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin: 0;
      }

      a {
        color: var(--primary);
        font-weight: 600;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = this.authService.isLoading;
  error = signal<string | null>(null);

  isFormValid(): boolean {
    return !!this.email && 
           !!this.password && 
           this.password.length >= 6 && 
           this.password === this.confirmPassword;
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    this.error.set(null);

    this.authService.register({ 
      email: this.email, 
      password: this.password,
      username: this.username || undefined
    }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
