import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-icon">
            <i class="bi bi-stack"></i>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to continue to GiwiCD</p>
        </div>

        @if (error()) {
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle me-2"></i>
            {{ error() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
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
              placeholder="Enter your password"
              required
              minlength="6"
              [disabled]="isLoading()"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-lg w-100"
            [disabled]="!email || !password || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
              Signing in...
            } @else {
              Sign in
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Create one</a></p>
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
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  isLoading = this.authService.isLoading;
  error = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.error.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Login failed. Please try again.');
      }
    });
  }
}
