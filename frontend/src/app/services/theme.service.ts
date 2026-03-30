import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  readonly theme = signal<Theme>('dark');
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('giwicd-theme') as Theme | null;
      if (saved) {
        this.theme.set(saved);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme.set('dark');
      }
    }
    
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const current = this.theme();
        document.documentElement.setAttribute('data-theme', current);
        localStorage.setItem('giwicd-theme', current);
      }
    });
  }
  
  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
  
  isDark(): boolean {
    return this.theme() === 'dark';
  }
}
