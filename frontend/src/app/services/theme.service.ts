import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  
  readonly theme = signal<Theme>('dark');
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.loadTheme();
      } catch (e) {}
    }
    
    effect(() => {
      try {
        const user = this.authService.user();
        if (isPlatformBrowser(this.platformId) && user) {
          this.loadTheme();
        }
      } catch (e) {}
    });
    
    effect(() => {
      try {
        if (isPlatformBrowser(this.platformId)) {
          const current = this.theme();
          document.documentElement.setAttribute('data-theme', current);
          this.saveTheme(current);
        }
      } catch (e) {}
    });
  }

  private getThemeKey(): string {
    try {
      const user = this.authService.user();
      if (user && user.id) {
        return `giwicd-theme-${user.id}`;
      }
    } catch (e) {
      // AuthService not ready
    }
    return 'giwicd-theme';
  }

  private loadTheme(): void {
    try {
      const key = this.getThemeKey();
      if (!key) return;
      const saved = localStorage.getItem(key) as Theme | null;
      if (saved) {
        this.theme.set(saved);
      } else if (isPlatformBrowser(this.platformId) && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme.set('dark');
      }
    } catch (e) {
      // Ignore errors during initialization
    }
  }

  private saveTheme(theme: Theme): void {
    try {
      const key = this.getThemeKey();
      localStorage.setItem(key, theme);
    } catch (e) {
      // Ignore save errors
    }
  }
  
  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
  
  isDark(): boolean {
    return this.theme() === 'dark';
  }
}
