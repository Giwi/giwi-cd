import { Component, inject, signal } from '@angular/core';
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
      <div class="app-wrapper" [class.sidebar-collapsed]="sidebarCollapsed()">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <i class="bi bi-stack brand-icon"></i>
            @if (!sidebarCollapsed()) {
              <div>
                <span class="brand-name">GiwiCD</span>
                <div class="brand-version">v1.0.0</div>
              </div>
            }
          </div>
          
          <nav class="sidebar-nav">
            @if (!sidebarCollapsed()) {
              <div class="nav-section">Overview</div>
            }
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Dashboard' : ''">
              <i class="bi bi-grid-1x2"></i>
              @if (!sidebarCollapsed()) {
                Dashboard
              }
            </a>
            
            @if (!sidebarCollapsed()) {
              <div class="nav-section">Pipelines</div>
            }
            <a class="nav-item" routerLink="/pipelines" routerLinkActive="active" [title]="sidebarCollapsed() ? 'All Pipelines' : ''">
              <i class="bi bi-diagram-3"></i>
              @if (!sidebarCollapsed()) {
                All Pipelines
              }
            </a>
            <a class="nav-item" routerLink="/builds" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Build History' : ''">
              <i class="bi bi-clock-history"></i>
              @if (!sidebarCollapsed()) {
                Build History
              }
            </a>

            @if (!sidebarCollapsed()) {
              <div class="nav-section">Settings</div>
            }
            <a class="nav-item" routerLink="/settings/profile" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Profile' : ''">
              <i class="bi bi-person-gear"></i>
              @if (!sidebarCollapsed()) {
                Profile
              }
            </a>
            @if (isAdmin()) {
              <a class="nav-item" routerLink="/settings/general" routerLinkActive="active" [title]="sidebarCollapsed() ? 'General Settings' : ''">
                <i class="bi bi-gear"></i>
                @if (!sidebarCollapsed()) {
                  General
                }
              </a>
              <a class="nav-item" routerLink="/settings/users" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Users' : ''">
                <i class="bi bi-people"></i>
                @if (!sidebarCollapsed()) {
                  Users
                }
              </a>
            }
            <a class="nav-item" routerLink="/settings/credentials" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Credentials' : ''">
              <i class="bi bi-key"></i>
              @if (!sidebarCollapsed()) {
                Credentials
              }
            </a>
            <a class="nav-item" routerLink="/settings/notifications" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Notifications' : ''">
              <i class="bi bi-bell"></i>
              @if (!sidebarCollapsed()) {
                Notifications
              }
            </a>
          </nav>

          <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <i class="bi" [class.bi-chevron-left]="!sidebarCollapsed()" [class.bi-chevron-right]="sidebarCollapsed()"></i>
          </button>
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
                    @if (isAdmin()) {
                      <span class="badge bg-primary mt-1">Admin</span>
                    } @else {
                      <span class="badge bg-secondary mt-1">{{ authService.user()?.role }}</span>
                    }
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

        <footer class="app-footer">
          <span>&copy; {{ currentYear }} <a href="https://giwi.fr" target="_blank" rel="noopener">GiwiSoft</a>. All rights reserved.</span>
        </footer>
      </div>
    }
    <app-confirm-modal></app-confirm-modal>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .app-wrapper.sidebar-collapsed {
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .content-area {
      flex: 1;
    }

    .app-footer {
      margin-top: auto;
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
      color: var(--text-primary);
      
      strong {
        color: var(--text-primary);
      }
      
      .text-muted {
        color: var(--text-muted) !important;
      }
    }
    
    .dropdown-item {
      color: var(--text-primary);
      cursor: pointer;
      
      &:hover {
        background: var(--bg-muted);
      }
    }
    
    .dropdown-divider {
      border-color: var(--border);
    }

    .app-footer {
      padding: 0.75rem 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      background: var(--bg-surface);
      
      a {
        color: var(--text-primary);
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class App {
  protected readonly title = 'GiwiCD';
  protected readonly currentYear = new Date().getFullYear();
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly sidebarCollapsed = signal(false);
  protected readonly expandedGroups = signal<Set<string>>(new Set(['Pipelines', 'Settings']));

  private menuItems: { label: string; icon: string; route?: string; exact?: boolean; children?: { label: string; route: string; icon: string; exact?: boolean }[] }[] = [];

  constructor() {
    this.buildMenuItems();
  }

  private buildMenuItems(): void {
    const items: { label: string; icon: string; route?: string; exact?: boolean; children?: { label: string; route: string; icon: string; exact?: boolean }[] }[] = [
      { label: 'Dashboard', icon: 'bi-grid-1x2', route: '/dashboard', exact: true }
    ];

    items.push({
      label: 'Pipelines',
      icon: 'bi-diagram-3',
      children: [
        { label: 'All Pipelines', route: '/pipelines', icon: 'bi-diagram-3', exact: true },
        { label: 'Build History', route: '/builds', icon: 'bi-clock-history', exact: true }
      ]
    });

    const settingsChildren: { label: string; route: string; icon: string; exact?: boolean }[] = [
      { label: 'Profile', route: '/settings/profile', icon: 'bi-person-gear' }
    ];

    if (this.authService.isAdmin()) {
      settingsChildren.push({ label: 'General', route: '/settings', icon: 'bi-gear', exact: true });
      settingsChildren.push({ label: 'Users', route: '/settings/users', icon: 'bi-people' });
    }
    settingsChildren.push({ label: 'Credentials', route: '/settings/credentials', icon: 'bi-key' });

    items.push({
      label: 'Settings',
      icon: 'bi-gear',
      children: settingsChildren
    });

    this.menuItems = items;
  }

  getMenuItems() {
    return this.menuItems;
  }

  toggleGroup(label: string): void {
    this.expandedGroups.update(set => {
      const newSet = new Set(set);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }

  isGroupExpanded(label: string): boolean {
    return this.expandedGroups().has(label);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

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
