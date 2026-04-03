import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ApiResponse } from '../../../models/types';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">System Logs</h1>
        <p class="page-subtitle">View server logs and events</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" (click)="refresh()">
          <i class="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
        <button class="btn btn-outline-danger" (click)="clearLogs()">
          <i class="bi bi-trash me-1"></i> Clear
        </button>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header card-header-theme py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Logs</h5>
          <span class="badge bg-secondary">{{ filteredLogs().length }}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" placeholder="Search logs..." 
                   [value]="searchQuery()" (input)="onSearch($event)">
            @if (searchQuery()) {
              <button class="btn btn-outline-secondary" (click)="clearSearch()">
                <i class="bi bi-x"></i>
              </button>
            }
          </div>
          <select class="form-select form-select-sm" style="width: auto;" [value]="levelFilter()" (change)="onLevelFilter($event)">
            <option value="">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="log-terminal" #logContainer>
          @for (log of filteredLogs(); track $index; let i = $index) {
            <div class="log-line log-{{ log.level }}">
              <span class="log-line-number">{{ i + 1 }}</span>
              <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
              <span class="log-level badge-{{ log.level }}">{{ log.level }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          }
          @if (filteredLogs().length === 0) {
            <div class="text-center text-muted py-4">
              <i class="bi bi-journal-text fs-1 d-block mb-2"></i>
              No logs available
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .log-terminal {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      max-height: 70vh;
      overflow-y: auto;
      background: #1a1a2e;
      color: #e4e4e7;
    }
    .log-line {
      display: flex;
      align-items: flex-start;
      padding: 2px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      &:hover { background: rgba(255, 255, 255, 0.08); }
      .log-line-number { color: #52525b; min-width: 40px; margin-right: 12px; text-align: right; user-select: none; }
      .log-timestamp { color: #71717a; min-width: 80px; margin-right: 12px; }
      .log-level { min-width: 60px; margin-right: 12px; text-transform: uppercase; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-align: center; }
      .badge-error { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      .badge-warn { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .badge-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
      .badge-debug { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
      .log-message { flex: 1; word-break: break-word; white-space: pre-wrap; }
      &.log-error { border-left: 3px solid #f87171; }
      &.log-warn { border-left: 3px solid #fbbf24; }
    }
  `]
})
export class LogsComponent implements OnInit, AfterViewChecked {
  @ViewChild('logContainer') logContainer!: ElementRef;
  
  private api = inject(ApiService);
  private shouldScroll = true;
  
  logs = signal<LogEntry[]>([]);
  filteredLogs = signal<LogEntry[]>([]);
  searchQuery = signal('');
  levelFilter = signal('');
  autoScroll = signal(true);

  ngOnInit(): void {
    this.loadLogs();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.logContainer && this.autoScroll()) {
      const el = this.logContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  loadLogs(): void {
    this.api.get<ApiResponse<LogEntry[]>>('/admin/logs').subscribe({
      next: (res) => {
        this.logs.set(res.data || []);
        this.applyFilters();
        this.shouldScroll = true;
      }
    });
  }

  refresh(): void {
    this.loadLogs();
  }

  clearLogs(): void {
    this.logs.set([]);
    this.filteredLogs.set([]);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.applyFilters();
  }

  onLevelFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.levelFilter.set(value);
    this.applyFilters();
  }

  private applyFilters(): void {
    let logs = this.logs();
    
    const level = this.levelFilter();
    if (level) {
      logs = logs.filter(l => l.level === level);
    }
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      logs = logs.filter(l => l.message.toLowerCase().includes(query));
    }
    
    this.filteredLogs.set(logs);
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}
