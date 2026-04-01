import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-notification-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <a routerLink="/settings/notifications" class="text-decoration-none text-muted small">
          <i class="bi bi-arrow-left me-1"></i> Back to Notifications
        </a>
        <h1 class="page-title mt-2">Add Notification Source</h1>
        <p class="page-subtitle">Configure a new notification channel</p>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <button class="btn btn-outline-secondary w-100 p-3 h-100" (click)="selectType('telegram')">
              <i class="bi bi-telegram fs-4 d-block mb-2 text-info"></i>
              Telegram
            </button>
          </div>
          <div class="col-6 col-md-3">
            <button class="btn btn-outline-secondary w-100 p-3 h-100" (click)="selectType('slack')">
              <i class="bi bi-chat-dots fs-4 d-block mb-2 text-danger"></i>
              Slack
            </button>
          </div>
          <div class="col-6 col-md-3">
            <button class="btn btn-outline-secondary w-100 p-3 h-100" (click)="selectType('teams')">
              <i class="bi bi-people fs-4 d-block mb-2 text-primary"></i>
              Teams
            </button>
          </div>
          <div class="col-6 col-md-3">
            <button class="btn btn-outline-secondary w-100 p-3 h-100" (click)="selectType('mail')">
              <i class="bi bi-envelope fs-4 d-block mb-2 text-success"></i>
              Email
            </button>
          </div>
        </div>

        @if (selectedType()) {
          <hr class="my-4">

          <form (ngSubmit)="save()">
            <div class="mb-3">
              <label class="form-label">Name *</label>
              <input type="text" class="form-control" [(ngModel)]="name" name="name" placeholder="My Telegram Bot" required>
              <div class="form-text">A friendly name to identify this notification source</div>
            </div>

            @switch (selectedType()) {
              @case ('telegram') {
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bot Token *</label>
                    <input type="text" class="form-control" [(ngModel)]="token" name="token" placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" required>
                    <div class="form-text">From @BotFather</div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Chat ID *</label>
                    <input type="text" class="form-control" [(ngModel)]="username" name="username" placeholder="-1001234567890" required>
                    <div class="form-text">Use @userinfobot to get your Chat ID</div>
                  </div>
                </div>
              }
              @case ('slack') {
                <div class="mb-3">
                  <label class="form-label">Webhook URL *</label>
                  <input type="text" class="form-control" [(ngModel)]="token" name="token" placeholder="https://hooks.slack.com/services/..." required>
                  <div class="form-text">Create a webhook in your Slack workspace</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Channel (optional)</label>
                  <input type="text" class="form-control" [(ngModel)]="channel" name="channel" placeholder="#builds">
                  <div class="form-text">Override default channel</div>
                </div>
              }
              @case ('teams') {
                <div class="mb-3">
                  <label class="form-label">Webhook URL *</label>
                  <input type="text" class="form-control" [(ngModel)]="token" name="token" placeholder="https://outlook.office.com/webhook/..." required>
                  <div class="form-text">Create an incoming webhook in your Teams channel</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Channel (optional)</label>
                  <input type="text" class="form-control" [(ngModel)]="channel" name="channel" placeholder="Build Notifications">
                  <div class="form-text">Override default channel</div>
                </div>
              }
              @case ('mail') {
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">SMTP Host *</label>
                    <input type="text" class="form-control" [(ngModel)]="smtpHost" name="smtpHost" placeholder="smtp.gmail.com" required>
                  </div>
                  <div class="col-md-3 mb-3">
                    <label class="form-label">Port *</label>
                    <input type="number" class="form-control" [(ngModel)]="smtpPort" name="smtpPort" placeholder="587" required>
                  </div>
                  <div class="col-md-3 mb-3">
                    <label class="form-label">Encryption</label>
                    <select class="form-select" [(ngModel)]="smtpSecure" name="smtpSecure">
                      <option [ngValue]="true">TLS/SSL</option>
                      <option [ngValue]="false">None</option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Username *</label>
                    <input type="text" class="form-control" [(ngModel)]="smtpUser" name="smtpUser" placeholder="your@email.com" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Password *</label>
                    <input [type]="showPassword ? 'text' : 'password'" class="form-control" [(ngModel)]="smtpPass" name="smtpPass" required>
                    <div class="form-text">For Gmail, use an App Password</div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">From Email *</label>
                  <input type="email" class="form-control" [(ngModel)]="fromEmail" name="fromEmail" placeholder="noreply@example.com" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">To Email *</label>
                  <input type="email" class="form-control" [(ngModel)]="toEmail" name="toEmail" placeholder="admin@example.com" required>
                </div>
              }
            }

            <div class="mb-3">
              <label class="form-label">Description (optional)</label>
              <input type="text" class="form-control" [(ngModel)]="description" name="description" placeholder="Optional description">
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                Create
              </button>
              <a routerLink="/settings/notifications" class="btn btn-outline-secondary">Cancel</a>
            </div>
          </form>
        }
      </div>
    </div>
  `
})
export class NotificationAddComponent {
  selectedType = signal<string | null>(null);
  saving = signal(false);
  showPassword = false;

  name = '';
  token = '';
  username = '';
  channel = '';
  description = '';

  smtpHost = '';
  smtpPort = 587;
  smtpSecure = true;
  smtpUser = '';
  smtpPass = '';
  fromEmail = '';
  toEmail = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  selectType(type: string): void {
    this.selectedType.set(type);
  }

  save(): void {
    this.saving.set(true);

    let data: any = {
      name: this.name,
      type: this.selectedType(),
      description: this.description
    };

    switch (this.selectedType()) {
      case 'telegram':
        data = { ...data, token: this.token, username: this.username };
        break;
      case 'slack':
        data = { ...data, token: this.token, channel: this.channel || null };
        break;
      case 'teams':
        data = { ...data, token: this.token, channel: this.channel || null };
        break;
      case 'mail':
        data = {
          ...data,
          token: this.smtpPass,
          username: this.smtpUser,
          smtp: {
            host: this.smtpHost,
            port: this.smtpPort,
            secure: this.smtpSecure
          },
          from: this.fromEmail,
          to: this.toEmail
        };
        break;
    }

    this.api.post<{ success: boolean; message?: string }>('/credentials', data).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toast.success('Notification source created');
          this.router.navigate(['/settings/notifications']);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Failed to create notification source');
      }
    });
  }
}
