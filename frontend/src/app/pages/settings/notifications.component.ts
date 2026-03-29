import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfirmService } from '../../services/confirm.service';
import { Credential, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">Configure notifications via Telegram, Slack, Teams or Email</p>
      </div>
      <a routerLink="/settings/credentials/new?type=notification" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i> Add Notification
      </a>
    </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else if (credentials().length === 0) {
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-bell fs-1 text-muted mb-3 d-block"></i>
          <h5>No notifications configured</h5>
          <p class="text-muted mb-3">Configure Telegram, Slack, Teams or Email to receive notifications</p>
          <a routerLink="/settings/credentials/new?type=notification" class="btn btn-primary">
            <i class="bi bi-plus-lg me-1"></i> Add Notification
          </a>
        </div>
      </div>
    } @else {
      <div class="row g-3">
        @for (cred of credentials(); track cred.id) {
          <div class="col-md-6 col-xl-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <div class="credential-icon bg-{{ getTypeColor(cred.type) }} bg-opacity-10 text-{{ getTypeColor(cred.type) }} rounded p-2">
                      <i class="bi bi-{{ getTypeIcon(cred.type) }}"></i>
                    </div>
                    <div>
                      <h5 class="mb-0">{{ cred.name }}</h5>
                      <small class="text-muted">{{ getTypeLabel(cred.type) }}</small>
                    </div>
                  </div>
                  <div class="dropdown">
                    <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li>
                        <a class="dropdown-item" [routerLink]="['/settings/credentials', cred.id]">
                          <i class="bi bi-pencil me-2"></i>Edit
                        </a>
                      </li>
                      <li>
                        <button class="dropdown-item" (click)="testCredential(cred)">
                          <i class="bi bi-send me-2"></i>Test
                        </button>
                      </li>
                      <li><hr class="dropdown-divider"></li>
                      <li>
                        <button class="dropdown-item text-danger" (click)="deleteCredential(cred)">
                          <i class="bi bi-trash me-2"></i>Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                @if (cred.description) {
                  <p class="text-muted small mb-3">{{ cred.description }}</p>
                }
                <div class="text-muted small">
                  @if (cred.type === 'telegram') {
                    <div><i class="bi bi-telegram me-1"></i> Telegram Bot configured</div>
                  }
                  @if (cred.type === 'slack') {
                    <div><i class="bi bi-chat-dots me-1"></i> Slack Webhook configured</div>
                  }
                  @if (cred.type === 'teams') {
                    <div><i class="bi bi-people me-1"></i> Teams Webhook configured</div>
                  }
                  @if (cred.type === 'mail') {
                    <div><i class="bi bi-envelope me-1"></i> Email SMTP configured</div>
                  }
                </div>
              </div>
              <div class="card-footer bg-transparent border-top-0">
                <small class="text-muted">Created {{ formatDate(cred.createdAt) }}</small>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class NotificationsComponent implements OnInit {
  credentials = signal<Credential[]>([]);
  loading = signal(true);
  private confirmService = inject(ConfirmService);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCredentials();
  }

  loadCredentials(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<Credential[]>>('/credentials').subscribe({
      next: (res) => {
        const notifTypes = ['telegram', 'slack', 'teams', 'mail'];
        this.credentials.set(res.data.filter(c => notifTypes.includes(c.type)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  deleteCredential(cred: Credential): void {
    this.confirmService.confirm('Delete Notification', `Are you sure you want to delete "${cred.name}"?`).then((confirmed: boolean) => {
      if (confirmed) {
        this.api.delete<ApiResponse<unknown>>(`/credentials/${cred.id}`).subscribe({
          next: (res) => {
            if (res.success) this.loadCredentials();
          }
        });
      }
    });
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'telegram': 'telegram',
      'slack': 'chat-dots',
      'teams': 'people',
      'mail': 'envelope'
    };
    return icons[type] || 'bell';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'telegram': 'info',
      'slack': 'danger',
      'teams': 'primary',
      'mail': 'success'
    };
    return colors[type] || 'secondary';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'telegram': 'Telegram Bot',
      'slack': 'Slack Webhook',
      'teams': 'Teams Webhook',
      'mail': 'Email (SMTP)'
    };
    return labels[type] || type;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  testCredential(cred: Credential): void {
    const channel = prompt(`Enter the ${this.getChannelLabel(cred.type)} for testing (or leave empty for default):`);
    this.api.post<{ success: boolean; message?: string; error?: string }>(`/credentials/${cred.id}/test`, {
      provider: cred.type,
      channel: channel || undefined
    }).subscribe({
      next: (res) => {
        if (res.success) {
          alert('✅ ' + (res.message || 'Test notification sent!'));
        } else {
          alert('❌ ' + (res.error || 'Failed to send test notification'));
        }
      },
      error: (err) => {
        alert('❌ ' + (err.error?.error || 'Failed to send test notification'));
      }
    });
  }

  getChannelLabel(type: string): string {
    const labels: Record<string, string> = {
      'telegram': 'Chat ID',
      'slack': 'channel',
      'teams': 'channel',
      'mail': 'email address'
    };
    return labels[type] || 'channel';
  }
}
