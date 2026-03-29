import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Build, Pipeline, ApiResponse, BuildStatus } from '../../models/types';

@Component({
  selector: 'app-build-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Builds</h1>
        <p class="page-subtitle">View and manage build history</p>
      </div>
      <div class="d-flex gap-2">
        <select class="form-select form-select-sm" [(ngModel)]="filterStatus" (change)="loadBuilds()" style="width: 150px;">
          <option value="">All Status</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select class="form-select form-select-sm" [(ngModel)]="filterPipeline" (change)="loadBuilds()" style="width: 180px;">
          <option value="">All Pipelines</option>
          @for (p of pipelines(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else if (builds().length === 0) {
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-clock-history fs-1 text-muted mb-3 d-block"></i>
          <h5>No builds found</h5>
          <p class="text-muted mb-0">
            {{ filterStatus || filterPipeline ? 'Try adjusting your filters' : 'Trigger a build from a pipeline to see it here' }}
          </p>
        </div>
      </div>
    } @else {
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0 build-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pipeline</th>
                  <th>Branch</th>
                  <th>Commit</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Triggered By</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                @for (build of builds(); track build.id) {
                  <tr class="cursor-pointer" [routerLink]="['/builds', build.id]">
                    <td><span class="build-number">#{{ build.number }}</span></td>
                    <td>{{ build.pipelineName }}</td>
                    <td><code class="small">{{ build.branch }}</code></td>
                    <td>
                      @if (build.commit) {
                        <code class="small">{{ build.commit.substring(0, 7) }}</code>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                    <td>
                      <span class="badge-status status-{{ build.status }}">{{ build.status }}</span>
                    </td>
                    <td>{{ formatDuration(build.duration) }}</td>
                    <td>
                      <span class="badge bg-light text-dark">
                        {{ formatTrigger(build.triggeredBy) }}
                      </span>
                    </td>
                    <td>{{ formatDate(build.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      @if (totalBuilds() > builds().length) {
        <div class="text-center mt-4">
          <button class="btn btn-outline-primary" (click)="loadMore()" [disabled]="loading()">
            Load More
          </button>
        </div>
      }
    }
  `
})
export class BuildListComponent implements OnInit {
  builds = signal<Build[]>([]);
  pipelines = signal<Pipeline[]>([]);
  loading = signal(true);
  filterStatus = '';
  filterPipeline = '';
  totalBuilds = signal(0);
  currentPage = 1;
  pageSize = 20;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.filterPipeline = params['pipelineId'] || '';
      this.loadBuilds();
    });
    this.loadPipelines();
  }

  loadBuilds(): void {
    this.loading.set(true);
    const params: Record<string, string> = { limit: this.pageSize.toString() };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPipeline) params['pipelineId'] = this.filterPipeline;

    this.api.get<ApiResponse<Build[]>>('/builds', params).subscribe({
      next: (res) => {
        this.builds.set(res.data);
        this.totalBuilds.set(res.total || res.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPipelines(): void {
    this.api.get<ApiResponse<Pipeline[]>>('/pipelines').subscribe({
      next: (res) => this.pipelines.set(res.data)
    });
  }

  loadMore(): void {
    this.pageSize += 20;
    this.loadBuilds();
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

  formatTrigger(trigger: string): string {
    const map: Record<string, string> = {
      manual: 'Manual',
      push: 'Push',
      schedule: 'Scheduled',
      api: 'API'
    };
    return map[trigger] || trigger;
  }
}
