import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  title = signal('');
  message = signal('');
  isOpen = signal(false);
  resolveFn: ((result: boolean) => void) | null = null;

  confirm(title: string, message: string): Promise<boolean> {
    this.title.set(title);
    this.message.set(message);
    this.isOpen.set(true);
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  resolve(result: boolean): void {
    this.isOpen.set(false);
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
  }
}
