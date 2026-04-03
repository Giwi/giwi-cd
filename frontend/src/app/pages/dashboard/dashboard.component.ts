import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { DashboardData, Build, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
     <div class="page-header">
       <div>
         <h1 class="page-title">Dashboard</h1>
         <p class="page-subtitle">CI/CD Pipeline Overview</p>
       </div>
       <div class="d-flex gap-2 align-items-center">
         <span class="badge bg-{{ healthStatus() === 'healthy' ? 'success' : 'danger' }}">
           <i class="bi bi-{{ healthStatus() === 'healthy' ? 'check-circle' : 'exclamation-circle' }}"></i>
           {{ healthStatus() }}
         </span>
         <button class="btn btn-outline-secondary btn-sm" (click)="refreshData()">
           <i class="bi bi-arrow-clockwise me-1"></i>Refresh
         </button>
       </div>
     </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else {
      <div class="row g-4 mb-4">
        <div class="col-sm-6 col-xl-3">
          <div class="stat-card">
            <div class="stat-icon bg-primary bg-opacity-10 text-primary">
              <i class="bi bi-diagram-3"></i>
            </div>
            <div class="stat-value">{{ data()?.pipelines?.total || 0 }}</div>
            <div class="stat-label">Total Pipelines</div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="stat-card">
            <div class="stat-icon bg-success bg-opacity-10 text-success">
              <i class="bi bi-check-circle"></i>
            </div>
            <div class="stat-value">{{ data()?.builds?.successRate || 0 }}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="stat-card">
            <div class="stat-icon bg-info bg-opacity-10 text-info">
              <i class="bi bi-lightning"></i>
            </div>
            <div class="stat-value">{{ data()?.builds?.last24h || 0 }}</div>
            <div class="stat-label">Builds (24h)</div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="stat-card">
            <div class="stat-icon bg-warning bg-opacity-10 text-warning">
              <i class="bi bi-clock-history"></i>
            </div>
            <div class="stat-value">{{ formatDuration(data()?.builds?.avgDuration || 0) }}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header card-header-theme py-3 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Recent Builds</h5>
              <a routerLink="/builds" class="btn btn-sm btn-outline-primary">
                View All <i class="bi bi-arrow-right"></i>
              </a>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0 build-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pipeline</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Triggered</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (build of data()?.recentBuilds || []; track build.id) {
                      <tr class="cursor-pointer" [routerLink]="['/builds', build.id]">
                        <td><span class="build-number">#{{ build.number }}</span></td>
                        <td>{{ build.pipelineName }}</td>
                        <td><code class="small">{{ build.branch }}</code></td>
                        <td><span class="badge-status status-{{ build.status }}">{{ build.status }}</span></td>
                        <td>{{ formatDuration(build.duration) }}</td>
                        <td>{{ formatDate(build.createdAt) }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center py-4 text-muted">
                          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                          No builds yet
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header card-header-theme py-3">
              <h5 class="mb-0">Pipeline Status</h5>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between mb-3">
                <span><i class="bi bi-check-circle text-success me-1"></i> Enabled</span>
                <strong>{{ data()?.pipelines?.enabled || 0 }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-3">
                <span><i class="bi bi-pause-circle text-secondary me-1"></i> Disabled</span>
                <strong>{{ data()?.pipelines?.disabled || 0 }}</strong>
              </div>
              <div class="d-flex justify-content-between">
                <span><i class="bi bi-lightning-charge text-info me-1"></i> Active</span>
                <strong>{{ data()?.pipelines?.active || 0 }}</strong>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header card-header-theme py-3">
              <h5 class="mb-0">Builds by Status</h5>
            </div>
            <div class="card-body">
              @for (status of buildStatusList; track status.key) {
                <div class="d-flex justify-content-between mb-2">
                  <span class="badge-status status-{{ status.key }}">{{ status.label }}</span>
                  <strong>{{ getStatusCount(status.key) }}</strong>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  data = signal<DashboardData | null>(null);
  loading = signal(true);
  healthStatus = signal('checking');

  buildStatusList = [
    { key: 'running', label: 'Running' },
    { key: 'success', label: 'Success' },
    { key: 'failed', label: 'Failed' },
    { key: 'pending', label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private api: ApiService,
    private ws: WebSocketService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<DashboardData>>('/dashboard').subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
        this.healthStatus.set('healthy');
      },
      error: () => {
        this.loading.set(false);
        this.healthStatus.set('unhealthy');
      }
    });
  }

  refreshData(): void {
    this.loadData();
    this.toast.info('Refreshing dashboard data...');
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins < 60 ? `${mins}m ${secs}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStatusCount(key: string): number {
    const byStatus = this.data()?.builds?.byStatus;
    if (byStatus) {
      return (byStatus as Record<string, number>)[key] || 0;
    }
    return 0;
  }
}
