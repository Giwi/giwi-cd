import { Component, ElementRef, OnDestroy, Input, afterNextRender } from '@angular/core';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { DailyStat, Build } from '../../models/types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function makeGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, 250);
  g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.6)'));
  g.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', ', 0.3)'));
  g.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.05)'));
  return g;
}

export const STATUS_COLORS: Record<string, string> = {
  running: 'rgb(6, 182, 212)',
  success: 'rgb(16, 185, 129)',
  failed: 'rgb(239, 68, 68)',
  pending: 'rgb(245, 158, 11)',
  cancelled: 'rgb(107, 114, 128)'
};

export const PIPELINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

@Component({
  selector: 'app-status-chart',
  standalone: true,
  template: `<div style="height: 240px;"><canvas></canvas></div>`
})
export class StatusChartComponent implements OnDestroy {
  @Input() dailyStats?: DailyStat[];
  @Input() builds?: Build[];

  private chart?: Chart;

  constructor(private el: ElementRef<HTMLDivElement>) {
    afterNextRender(() => this.render());
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    const canvas = this.el.nativeElement.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    let labels: string[];
    let makeStack: (key: string) => any;

    if (this.dailyStats?.length) {
      labels = this.dailyStats.map(d => d.date.slice(5));
      makeStack = (key: string) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        data: this.dailyStats!.map(d => Number(d[key as keyof typeof d]) || 0),
        backgroundColor: makeGradient(ctx, STATUS_COLORS[key]),
        borderColor: STATUS_COLORS[key].replace('rgb', 'rgba').replace(')', ', 0.7)'),
        borderWidth: 1,
        borderRadius: 2
      });
    } else if (this.builds?.length) {
      const map: Record<string, Record<string, number>> = {};
      for (const b of this.builds) {
        const key = new Date(b.createdAt).toISOString().slice(0, 10);
        if (!map[key]) map[key] = { running: 0, success: 0, failed: 0, pending: 0, cancelled: 0 };
        if (b.status in map[key]) map[key][b.status]++;
      }
      const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
      labels = sorted.map(([d]) => d.slice(5));
      makeStack = (key: string) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        data: sorted.map(([, v]) => v[key] || 0),
        backgroundColor: makeGradient(ctx, STATUS_COLORS[key]),
        borderColor: STATUS_COLORS[key].replace('rgb', 'rgba').replace(')', ', 0.7)'),
        borderWidth: 1,
        borderRadius: 2
      });
    } else {
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: ['running', 'success', 'failed', 'pending', 'cancelled'].map(makeStack) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.06)' } }
        }
      }
    });
  }
}
