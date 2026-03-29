import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminSettings } from '../../../models/admin.types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">General Settings</h1>
        <p class="page-subtitle">Configure your GiwiCD instance</p>
      </div>
    </div>

    @if (message(); as msg) {
      <div class="alert" [class]="msg.type === 'success' ? 'alert-success' : 'alert-danger'">
        <i class="bi" [class]="msg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
        {{ msg.text }}
      </div>
    }

    <div class="row">
      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-person-plus"></i>
            Registration Settings
          </div>
          
          <div class="form-group">
            <div class="form-check form-switch">
              <input 
                class="form-check-input" 
                type="checkbox" 
                id="allowRegistration"
                [(ngModel)]="allowRegistration"
              />
              <label class="form-check-label" for="allowRegistration">
                <strong>Allow new user registration</strong>
                <small class="d-block text-muted">When disabled, only admins can create new accounts</small>
              </label>
            </div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="saveRegistration()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save Settings
          </button>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-gear"></i>
            Build Settings
          </div>

          <div class="form-group">
            <label class="form-label" for="maxConcurrentBuilds">Max Concurrent Builds</label>
            <input 
              type="number" 
              class="form-control" 
              id="maxConcurrentBuilds"
              [(ngModel)]="maxConcurrentBuilds"
              min="1"
              max="10"
            />
            <div class="form-text">Maximum number of builds that can run simultaneously (1-10)</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="defaultTimeout">Default Timeout (seconds)</label>
            <input 
              type="number" 
              class="form-control" 
              id="defaultTimeout"
              [(ngModel)]="defaultTimeout"
              min="60"
            />
            <div class="form-text">Default timeout for builds in seconds (minimum 60)</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="retentionDays">Build Retention (days)</label>
            <input 
              type="number" 
              class="form-control" 
              id="retentionDays"
              [(ngModel)]="retentionDays"
              min="1"
              max="365"
            />
            <div class="form-text">Number of days to keep build history (1-365)</div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="saveBuildSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save Settings
          </button>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-arrow-repeat"></i>
            Polling Settings
          </div>

          <div class="form-group">
            <label class="form-label" for="pollingInterval">Polling Interval (seconds)</label>
            <input 
              type="number" 
              class="form-control" 
              id="pollingInterval"
              [(ngModel)]="pollingInterval"
              min="10"
              max="3600"
            />
            <div class="form-text">How often to poll repositories for changes when "On push" trigger is enabled (10-3600 seconds)</div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="savePollingSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save Settings
          </button>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-bell"></i>
            Notification Defaults
          </div>
          <p class="text-muted small mb-3">Configure default values for notification steps. These can be overridden in individual pipelines.</p>

          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-telegram text-primary me-1"></i> Telegram
            </label>
            <input 
              type="text" 
              class="form-control" 
              id="telegramDefaultChannel"
              [(ngModel)]="telegramDefaultChannel"
              placeholder="Chat ID (ex: -1001234567890)"
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-chat-dots text-danger me-1"></i> Slack
            </label>
            <input 
              type="text" 
              class="form-control" 
              id="slackDefaultChannel"
              [(ngModel)]="slackDefaultChannel"
              placeholder="Channel name (ex: #builds)"
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-people text-primary me-1"></i> Microsoft Teams
            </label>
            <input 
              type="text" 
              class="form-control" 
              id="teamsDefaultChannel"
              [(ngModel)]="teamsDefaultChannel"
              placeholder="Team channel name (ex: CI/CD)"
            />
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="saveNotificationSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save Settings
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .row {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    
    .col-lg-6 {
      flex: 1;
      min-width: 300px;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .form-check {
      padding: 1rem;
      background: var(--bg-muted);
      border-radius: var(--radius);
      padding-left: 3rem;
    }
    
    .form-check-input {
      width: 1.5rem;
      height: 1.5rem;
      margin-top: 0;
      cursor: pointer;
    }
    
    .form-check-input:checked {
      background-color: var(--primary);
      border-color: var(--primary);
    }
  `]
})
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService);

  allowRegistration = true;
  maxConcurrentBuilds = 3;
  defaultTimeout = 3600;
  retentionDays = 30;
  pollingInterval = 60;
  telegramDefaultChannel = '';
  slackDefaultChannel = '';
  teamsDefaultChannel = '';

  isSaving = signal(false);
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.adminService.getSettings().subscribe({
      next: (response: { settings: AdminSettings }) => {
        const s = response.settings;
        this.allowRegistration = s.allowRegistration;
        this.maxConcurrentBuilds = s.maxConcurrentBuilds;
        this.defaultTimeout = s.defaultTimeout;
        this.retentionDays = s.retentionDays;
        this.pollingInterval = s.pollingInterval || 60;
        if (s.notificationDefaults) {
          this.telegramDefaultChannel = s.notificationDefaults.telegram?.defaultChannel || '';
          this.slackDefaultChannel = s.notificationDefaults.slack?.defaultChannel || '';
          this.teamsDefaultChannel = s.notificationDefaults.teams?.defaultChannel || '';
        }
      }
    });
  }

  saveRegistration(): void {
    this.isSaving.set(true);
    this.message.set(null);

    this.adminService.updateSettings({ allowRegistration: this.allowRegistration }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Registration settings saved successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.error || 'Failed to save settings' });
      }
    });
  }

  saveBuildSettings(): void {
    this.isSaving.set(true);
    this.message.set(null);

    this.adminService.updateSettings({
      maxConcurrentBuilds: this.maxConcurrentBuilds,
      defaultTimeout: this.defaultTimeout,
      retentionDays: this.retentionDays
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Build settings saved successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.error || 'Failed to save settings' });
      }
    });
  }

  savePollingSettings(): void {
    this.isSaving.set(true);
    this.message.set(null);

    this.adminService.updateSettings({ pollingInterval: this.pollingInterval }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Polling settings saved successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.error || 'Failed to save polling settings' });
      }
    });
  }

  saveNotificationSettings(): void {
    this.isSaving.set(true);
    this.message.set(null);

    const notificationDefaults = {
      telegram: { defaultChannel: this.telegramDefaultChannel || undefined },
      slack: { defaultChannel: this.slackDefaultChannel || undefined },
      teams: { defaultChannel: this.teamsDefaultChannel || undefined }
    };

    this.adminService.updateSettings({ notificationDefaults }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Notification settings saved successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.error || 'Failed to save notification settings' });
      }
    });
  }
}
