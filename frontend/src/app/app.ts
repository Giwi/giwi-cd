import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ConfirmModalComponent],
  template: `
    @if (authService.isLoading()) {
      <div class="loading-screen">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    } @else if (!authService.isAuthenticated()) {
      <router-outlet></router-outlet>
    } @else {
      <div class="app-wrapper">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <i class="bi bi-stack brand-icon"></i>
            <div>
              <span class="brand-name">GiwiCD</span>
              <div class="brand-version">v1.0.0</div>
            </div>
          </div>
          
          <nav class="sidebar-nav">
            <div class="nav-section">Overview</div>
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
              <i class="bi bi-grid-1x2"></i>
              Dashboard
            </a>
            
            <div class="nav-section">Pipelines</div>
            <a class="nav-item" routerLink="/pipelines" routerLinkActive="active">
              <i class="bi bi-diagram-3"></i>
              All Pipelines
            </a>
            <a class="nav-item" routerLink="/builds" routerLinkActive="active">
              <i class="bi bi-clock-history"></i>
              Build History
            </a>

            <div class="nav-section">Settings</div>
            <a class="nav-item" routerLink="/settings/profile" routerLinkActive="active">
              <i class="bi bi-person-gear"></i>
              Profile
            </a>
            @if (authService.isAdmin()) {
              <a class="nav-item" routerLink="/settings" routerLinkActive="active">
                <i class="bi bi-gear"></i>
                General Settings
              </a>
              <a class="nav-item" routerLink="/settings/users" routerLinkActive="active">
                <i class="bi bi-people"></i>
                User Management
              </a>
              <a class="nav-item" routerLink="/settings/credentials" routerLinkActive="active">
                <i class="bi bi-key"></i>
                Credentials
              </a>
            } @else {
              <a class="nav-item" routerLink="/settings/credentials" routerLinkActive="active">
                <i class="bi bi-key"></i>
                Credentials
              </a>
            }
          </nav>
        </aside>

        <header class="topbar">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item"><a routerLink="/dashboard">Home</a></li>
              <li class="breadcrumb-item active" aria-current="page">Dashboard</li>
            </ol>
          </nav>
          <div class="ms-auto d-flex align-items-center gap-3">
            <button 
              class="btn btn-ghost theme-toggle" 
              (click)="toggleTheme()"
              [title]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              @if (themeService.isDark()) {
                <i class="bi bi-sun-fill"></i>
              } @else {
                <i class="bi bi-moon-fill"></i>
              }
            </button>

            <div class="dropdown">
              <button 
                class="btn btn-ghost user-menu-btn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div class="user-avatar">
                  {{ getUserInitials() }}
                </div>
                <span class="user-name d-none d-md-inline">{{ authService.user()?.username }}</span>
                <i class="bi bi-chevron-down ms-1"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <div class="dropdown-item-text">
                    <strong>{{ authService.user()?.username }}</strong>
                    <small class="d-block text-muted">{{ authService.user()?.email }}</small>
                  </div>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li>
                  <a class="dropdown-item" routerLink="/settings/profile">
                    <i class="bi bi-person me-2"></i>Profile
                  </a>
                </li>
                <li>
                  <hr class="dropdown-divider">
                </li>
                <li>
                  <button class="dropdown-item text-danger" (click)="logout()">
                    <i class="bi bi-box-arrow-right me-2"></i>Sign out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <main class="main-content">
          <div class="content-area">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    }
    <app-confirm-modal></app-confirm-modal>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .loading-screen {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-base);
    }
    
    .theme-toggle {
      font-size: 1.1rem;
      padding: 0.5rem;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    }
    
    .theme-toggle:hover {
      background: var(--bg-muted);
    }
    
    .theme-toggle i {
      transition: transform 0.3s ease;
    }
    
    .theme-toggle:hover i {
      transform: rotate(15deg);
    }
    
    .user-menu-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius);
      background: var(--bg-muted);
      border: none;
    }
    
    .user-menu-btn:hover {
      background: var(--border);
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .user-name {
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .dropdown-item-text {
      padding: 0.5rem 1rem;
    }
    
    .dropdown-item {
      cursor: pointer;
    }
  `]
})
export class App {
  protected readonly title = 'GiwiCD';
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  
  getUserInitials(): string {
    const user = this.authService.user();
    if (!user) return '?';
    const name = user.username || user.email;
    return name.substring(0, 2).toUpperCase();
  }
  
  logout(): void {
    this.authService.logout();
  }
}
