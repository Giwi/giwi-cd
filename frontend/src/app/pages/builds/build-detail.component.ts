import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ConfirmService } from '../../services/confirm.service';
import { Build, Pipeline, BuildLog, ApiResponse, WebSocketMessage } from '../../models/types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-build-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div class="d-flex align-items-center gap-3">
        <a routerLink="/builds" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left"></i>
        </a>
        <div>
          <h1 class="page-title mb-0">
            Build #{{ build()?.number || '...' }}
            @if (build()) {
              <span class="badge-status status-{{ build()?.status }} ms-2">{{ build()?.status }}</span>
            }
          </h1>
          <p class="page-subtitle mb-0">{{ build()?.pipelineName }} / {{ build()?.branch }}</p>
        </div>
      </div>
      <div class="d-flex gap-2">
        @if (build()?.status === 'running' || build()?.status === 'pending') {
          <button class="btn btn-danger" (click)="cancelBuild()">
            <i class="bi bi-x-circle me-1"></i> Cancel
          </button>
        }
        <button class="btn btn-outline-secondary" (click)="refresh()">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    } @else if (build()) {
      @if (build()?.stages?.length) {
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body p-3">
            <div class="d-flex align-items-center justify-content-start flex-nowrap overflow-auto">
              @for (stage of build()?.stages || []; track $index; let i = $index) {
                <div class="d-flex align-items-center flex-nowrap">
                  <div class="stage-pill stage-{{ stage.status || 'pending' }}">
                    <span class="stage-dot"></span>
                    <span class="stage-name">{{ stage.name }}</span>
                  </div>
                  @if (i < (build()?.stages?.length || 0) - 1) {
                    <div class="stage-connector-line" [class.completed]="isStageCompleted(stage.status)"></div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header card-header-theme py-3">
              <h5 class="mb-0">Build Info</h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="text-muted small">Pipeline</label>
                <div class="fw-semibold">{{ build()?.pipelineName }}</div>
              </div>
              <div class="mb-3">
                <label class="text-muted small">Branch</label>
                <div><code>{{ build()?.branch }}</code></div>
              </div>
              @if (build()?.commit) {
                <div class="mb-3">
                  <label class="text-muted small">Commit</label>
                  <div><code>{{ build()?.commit }}</code></div>
                </div>
              }
              @if (build()?.commitMessage) {
                <div class="mb-3">
                  <label class="text-muted small">Commit Message</label>
                  <div class="small">{{ build()?.commitMessage }}</div>
                </div>
              }
              <div class="mb-3">
                <label class="text-muted small">Triggered By</label>
                <div class="text-capitalize">{{ build()?.triggeredBy }}</div>
              </div>
              <hr>
              <div class="row text-center">
                <div class="col-6">
                  <label class="text-muted small">Started</label>
                  <div class="small">{{ formatDate(build()?.startedAt) }}</div>
                </div>
                <div class="col-6">
                  <label class="text-muted small">Duration</label>
                  <div class="small fw-semibold">{{ formatDuration(build()?.duration) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header card-header-theme py-3 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Build Logs</h5>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" (click)="clearFilter()">
                  All
                </button>
                <button class="btn btn-outline-danger" (click)="filterLogs('error')">
                  Errors
                </button>
                <button class="btn btn-outline-warning" (click)="filterLogs('warn')">
                  Warnings
                </button>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="log-terminal" #logContainer>
                @for (log of filteredLogs(); track $index) {
                  <div class="log-line log-{{ log.level }}">
                    <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                }
                @if (filteredLogs().length === 0) {
                  <div class="text-center text-muted py-4">
                    <i class="bi bi-terminal fs-1 d-block mb-2"></i>
                    No logs available
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class BuildDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('logContainer') logContainer!: ElementRef;
  
  build = signal<Build | null>(null);
  loading = signal(true);
  filteredLogs = signal<BuildLog[]>([]);
  logFilter: string | null = null;
  private shouldScroll = true;
  private wsSub?: Subscription;
  confirmService = inject(ConfirmService);

  constructor(
    private api: ApiService,
    private ws: WebSocketService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBuild(id);
      this.ws.connect(id);
      this.subscribeToLogs();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.logContainer) {
      const el = this.logContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.ws.disconnect();
  }

  loadBuild(id: string): void {
    this.loading.set(true);
    this.api.get<ApiResponse<Build>>(`/builds/${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.build.set(res.data);
          this.applyFilter();
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  subscribeToLogs(): void {
    this.wsSub = this.ws.messages$.subscribe((msg: WebSocketMessage) => {
      const msgType = msg['type'] as string;
      const buildId = msg['buildId'] as string;
      
      if (msgType === 'build:log' && buildId === this.build()?.id) {
        const log = msg['log'] as BuildLog;
        const currentBuild = this.build();
        if (currentBuild) {
          const logs = [...(currentBuild.logs || []), log];
          this.build.set({ ...currentBuild, logs });
          this.applyFilter();
          this.shouldScroll = true;
        }
      } else if (msgType === 'build:complete' || msgType === 'build:cancelled' || msgType === 'build:stage') {
        this.loadBuild(this.build()!.id);
      }
    });
  }

  refresh(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadBuild(id);
  }

  cancelBuild(): void {
    this.confirmService.confirm('Cancel Build', 'Are you sure you want to cancel this build?').then((confirmed: boolean) => {
      if (confirmed) {
        const id = this.build()?.id;
        if (id) {
          this.api.post<ApiResponse<unknown>>(`/builds/${id}/cancel`).subscribe({
            next: () => this.refresh()
          });
        }
      }
    });
  }

  filterLogs(level: string): void {
    this.logFilter = this.logFilter === level ? null : level;
    this.applyFilter();
  }

  clearFilter(): void {
    this.logFilter = null;
    this.applyFilter();
  }

  private applyFilter(): void {
    const logs = this.build()?.logs || [];
    if (this.logFilter) {
      this.filteredLogs.set(logs.filter(l => l.level === this.logFilter));
    } else {
      this.filteredLogs.set(logs);
    }
  }

  getStageIcon(status?: string): string {
    const icons: Record<string, string> = {
      running: 'arrow-repeat spin',
      success: 'check-circle-fill',
      failed: 'x-circle-fill',
      pending: 'clock',
      cancelled: 'dash-circle'
    };
    return icons[status || 'pending'] || 'circle';
  }

  isStageCompleted(status?: string): boolean {
    return status === 'success';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString();
  }

  formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins < 60 ? `${mins}m ${secs}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
}
