import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfirmService } from '../../services/confirm.service';
import { Credential, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-credential-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Git Credentials</h1>
        <p class="page-subtitle">Manage access to Git repositories</p>
      </div>
      <a routerLink="/settings/credentials/new" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i> Add
      </a>
    </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else if (gitCredentials().length === 0) {
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-key fs-1 text-muted mb-3 d-block"></i>
          <h5>No credentials</h5>
          <p class="text-muted mb-3">Add credentials to access your Git repositories</p>
          <a routerLink="/settings/credentials/new" class="btn btn-primary">
            <i class="bi bi-plus-lg me-1"></i> Add
          </a>
        </div>
      </div>
    } @else {
      @if (gitCredentials().length > 0) {
        <div class="mb-4">
          <h5 class="mb-3"><i class="bi bi-key me-2"></i>Git Credentials</h5>
          <div class="row g-3">
            @for (cred of gitCredentials(); track cred.id) {
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
                      @if (cred.type === 'username-password' && cred.username) {
                        <div><i class="bi bi-person me-1"></i> {{ cred.username }}</div>
                      }
                      @if (cred.type === 'token') {
                        <div><i class="bi bi-shield-lock me-1"></i> Token configured</div>
                      }
                      @if (cred.type === 'ssh-key' && cred.privateKey) {
                        <div><i class="bi bi-key me-1"></i> SSH Key configured</div>
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
        </div>
      }


    }
  `
})
export class CredentialListComponent implements OnInit {
  loading = signal(true);
  private confirmService = inject(ConfirmService);

  gitCredentials = signal<Credential[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCredentials();
  }

  loadCredentials(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<Credential[]>>('/credentials').subscribe({
      next: (res) => {
        const gitTypes = ['username-password', 'token', 'ssh-key'];
        this.gitCredentials.set((res.data || []).filter(c => gitTypes.includes(c.type)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  deleteCredential(cred: Credential): void {
    this.confirmService.confirm('Delete Credential', `Are you sure you want to delete "${cred.name}"?`).then((confirmed: boolean) => {
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
      'username-password': 'person-lock',
      'token': 'shield-lock',
      'ssh-key': 'key'
    };
    return icons[type] || 'key';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'username-password': 'primary',
      'token': 'success',
      'ssh-key': 'warning'
    };
    return colors[type] || 'secondary';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'username-password': 'Username / Password',
      'token': 'Access Token',
      'ssh-key': 'SSH Key'
    };
    return labels[type] || type;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
