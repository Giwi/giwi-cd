import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfirmService } from '../../services/confirm.service';
import { Pipeline, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-pipeline-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Pipelines</h1>
        <p class="page-subtitle">Manage your CI/CD pipelines</p>
      </div>
      <a routerLink="/pipelines/new" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i> New Pipeline
      </a>
    </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else if (pipelines().length === 0) {
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-diagram-3 fs-1 text-muted mb-3 d-block"></i>
          <h5>No pipelines yet</h5>
          <p class="text-muted mb-3">Create your first pipeline to get started</p>
          <a routerLink="/pipelines/new" class="btn btn-primary">
            <i class="bi bi-plus-lg me-1"></i> Create Pipeline
          </a>
        </div>
      </div>
    } @else {
      <div class="row g-4">
        @for (pipeline of pipelines(); track pipeline.id) {
          <div class="col-md-6 col-xl-4">
            <div class="pipeline-card h-100">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="pipeline-name mb-1">{{ pipeline.name }}</h5>
                  <small class="text-muted">
                    <i class="bi bi-git me-1"></i>{{ pipeline.branch }}
                  </small>
                </div>
                <div class="dropdown">
                  <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <a class="dropdown-item" [routerLink]="['/pipelines', pipeline.id, 'edit']">
                        <i class="bi bi-pencil me-2"></i>Edit
                      </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <button class="dropdown-item text-danger" (click)="togglePipeline(pipeline)">
                        <i class="bi bi-{{ pipeline.enabled ? 'pause' : 'play' }}-circle me-2"></i>
                        {{ pipeline.enabled ? 'Disable' : 'Enable' }}
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item text-danger" (click)="deletePipeline(pipeline)">
                        <i class="bi bi-trash me-2"></i>Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              
              @if (pipeline.description) {
                <p class="text-muted small mb-3 text-truncate-2">{{ pipeline.description }}</p>
              }

              <div class="d-flex flex-wrap gap-2 mb-3">
                <span class="badge bg-{{ pipeline.enabled ? 'success' : 'secondary' }}">
                  {{ pipeline.enabled ? 'Active' : 'Inactive' }}
                </span>
                <span class="badge bg-muted text-secondary">
                  <i class="bi bi-list-check me-1"></i>{{ pipeline.stages?.length || 0 }} stages
                </span>
                @if (pipeline.credentialName) {
                  <span class="badge bg-info">
                    <i class="bi bi-{{ getCredIcon(pipeline.credentialType) }} me-1"></i>{{ pipeline.credentialName }}
                  </span>
                }
                @if (pipeline.lastBuildStatus) {
                  <span class="badge-status status-{{ pipeline.lastBuildStatus }}">
                    {{ pipeline.lastBuildStatus }}
                  </span>
                }
              </div>

              <div class="d-flex gap-2 mt-auto">
                <button class="btn btn-sm btn-outline-primary flex-fill" 
                        (click)="triggerBuild(pipeline)"
                        [disabled]="!pipeline.enabled">
                  <i class="bi bi-play-fill me-1"></i> Run
                </button>
                <a class="btn btn-sm btn-outline-secondary flex-fill" 
                   [routerLink]="['/builds']" 
                   [queryParams]="{pipelineId: pipeline.id}">
                  <i class="bi bi-clock-history me-1"></i> Builds
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class PipelineListComponent implements OnInit {
  pipelines = signal<Pipeline[]>([]);
  loading = signal(true);
  private confirmService = inject(ConfirmService);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadPipelines();
  }

  loadPipelines(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<Pipeline[]>>('/pipelines').subscribe({
      next: (res) => {
        this.pipelines.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  triggerBuild(pipeline: Pipeline): void {
    this.api.post<ApiResponse<unknown>>(`/pipelines/${pipeline.id}/trigger`).subscribe();
  }

  togglePipeline(pipeline: Pipeline): void {
    this.api.patch<ApiResponse<Pipeline>>(`/pipelines/${pipeline.id}/toggle`).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadPipelines();
        }
      }
    });
  }

  deletePipeline(pipeline: Pipeline): void {
    this.confirmService.confirm('Delete Pipeline', `Are you sure you want to delete "${pipeline.name}"?`).then((confirmed: boolean) => {
      if (confirmed) {
        this.api.delete<ApiResponse<unknown>>(`/pipelines/${pipeline.id}`).subscribe({
          next: (res) => {
            if (res.success) {
              this.loadPipelines();
            }
          }
        });
      }
    });
  }

  getCredIcon(type?: string | null): string {
    const icons: Record<string, string> = {
      'username-password': 'person-lock',
      'token': 'shield-lock',
      'ssh-key': 'key'
    };
    return icons[type || ''] || 'key';
  }
}
