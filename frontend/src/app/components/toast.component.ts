import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.list(); track toast.id) {
        <div class="toast-item toast-{{ toast.type }}">
          <i class="bi bi-{{ getIcon(toast.type) }}"></i>
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .toast-item {
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      color: white;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: slideIn 0.2s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toast-success { background: var(--success); }
    .toast-error { background: var(--danger); }
    .toast-info { background: var(--info); }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check-circle-fill';
      case 'error': return 'exclamation-circle-fill';
      case 'info': return 'info-circle-fill';
      default: return 'info-circle';
    }
  }
}
