import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toastService = inject(ToastService);
  private router = inject(Router);

  handleError(error: unknown): void {
    const message = this.extractMessage(error);
    const stack = this.extractStack(error);

    console.error('[GlobalErrorHandler]', message, stack);

    if (message.includes('NG0203') || message.includes('inject()')) {
      this.toastService.error('Application error: invalid injection context');
      return;
    }

    if (message.includes('NullInjectorError')) {
      this.toastService.error('Application configuration error');
      return;
    }

    if (message.includes('ExpressionChangedAfterItHasBeenCheckedError') &&
        (typeof ngDevMode === 'undefined' || ngDevMode)) {
      return;
    }

    this.toastService.error('An unexpected error occurred');
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return String(error);
  }

  private extractStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    return undefined;
  }
}

declare const ngDevMode: boolean | undefined;
