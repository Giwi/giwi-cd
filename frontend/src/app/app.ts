import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { ToastComponent } from './components/toast.component';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ConfirmModalComponent, ToastComponent],
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
              <a class="nav-item" routerLink="/settings/logs" routerLinkActive="active" [title]="sidebarCollapsed() ? 'Logs' : ''">
                <i class="bi bi-journal-text"></i>
                @if (!sidebarCollapsed()) {
                  Logs
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
                @if (getUserGravatar(); as gravatar) {
                  <img [src]="gravatar" class="user-avatar-img" alt="Avatar">
                } @else {
                  <div class="user-avatar">
                    {{ getUserInitials() }}
                  </div>
                }
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
    <app-toast></app-toast>
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
    
    .user-avatar-img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
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
      settingsChildren.push({ label: 'Logs', route: '/settings/logs', icon: 'bi-journal-text' });
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

  getUserGravatar(): string | null {
    const user = this.authService.user();
    if (!user?.email) return null;
    const email = user.email.trim().toLowerCase();
    const hash = this.md5(email);
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
  
  logout(): void {
    this.authService.logout();
  }
}
