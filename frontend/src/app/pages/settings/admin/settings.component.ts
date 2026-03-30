import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
            Registration
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
            Save
          </button>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-gear"></i>
            Build Settings
          </div>

          <div class="row">
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label" for="maxConcurrentBuilds">Max Concurrent</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="maxConcurrentBuilds"
                  [(ngModel)]="maxConcurrentBuilds"
                  min="1"
                  max="10"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label" for="defaultTimeout">Timeout (sec)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="defaultTimeout"
                  [(ngModel)]="defaultTimeout"
                  min="60"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label" for="retentionDays">Retention (days)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="retentionDays"
                  [(ngModel)]="retentionDays"
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="saveBuildSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save
          </button>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-arrow-repeat"></i>
            Polling
          </div>

          <div class="form-group mb-3">
            <label class="form-label" for="pollingInterval">Polling Interval (sec)</label>
            <input 
              type="number" 
              class="form-control" 
              id="pollingInterval"
              [(ngModel)]="pollingInterval"
              min="10"
              max="3600"
            />
            <div class="form-text">How often to poll repositories when "On push" trigger is enabled</div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="savePollingSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save
          </button>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="bi bi-bell"></i>
            Notification Defaults
          </div>
          <p class="text-muted small mb-3">Configure defaults for notification steps</p>

          <div class="row">
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label">
                  <i class="bi bi-telegram text-info me-1"></i> Telegram
                </label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="telegramDefaultChannel"
                  [(ngModel)]="telegramDefaultChannel"
                  placeholder="Chat ID"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label">
                  <i class="bi bi-chat-dots text-danger me-1"></i> Slack
                </label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="slackDefaultChannel"
                  [(ngModel)]="slackDefaultChannel"
                  placeholder="#channel"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group mb-3">
                <label class="form-label">
                  <i class="bi bi-people text-primary me-1"></i> Teams
                </label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="teamsDefaultChannel"
                  [(ngModel)]="teamsDefaultChannel"
                  placeholder="Channel"
                />
              </div>
            </div>
          </div>

          <button 
            class="btn btn-primary"
            [disabled]="isSaving()"
            (click)="saveNotificationSettings()"
          >
            @if (isSaving()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            Save
          </button>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

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
