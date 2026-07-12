import { Component, ElementRef, OnDestroy, Input, afterNextRender } from '@angular/core';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { DailyStat, Build } from '../../models/types';
import { makeGradient, PIPELINE_COLORS } from './status-chart.component';

@Component({
  selector: 'app-duration-chart',
  standalone: true,
  template: `<div style="height: 240px;"><canvas></canvas></div>`
})
export class DurationChartComponent implements OnDestroy {
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

    if (this.dailyStats?.length) {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.dailyStats.map(d => d.date.slice(5)),
          datasets: [{
            label: 'Avg Duration (s)',
            data: this.dailyStats.map(d => d.avgDuration),
            backgroundColor: makeGradient(ctx, 'rgb(59, 130, 246)'),
            borderColor: 'rgba(59, 130, 246, 0.7)',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'seconds' }, grid: { color: 'rgba(0,0,0,0.06)' } },
            x: { grid: { display: false } }
          }
        }
      });
    } else if (this.builds?.length) {
      const labels = this.builds.map(b => new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      const pipelineNames = [...new Set(this.builds.map(b => b.pipelineName))];
      const colorMap: Record<string, string> = {};
      pipelineNames.forEach((name, i) => { colorMap[name] = PIPELINE_COLORS[i % PIPELINE_COLORS.length]; });

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: pipelineNames.map(name => ({
            label: name,
            data: this.builds!.map(b => b.pipelineName === name ? (b.duration || 0) : 0),
            backgroundColor: makeGradient(ctx, colorMap[name]),
            borderColor: colorMap[name].replace('rgb', 'rgba').replace(')', ', 0.7)'),
            borderWidth: 1,
            borderRadius: 4
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'seconds' }, grid: { color: 'rgba(0,0,0,0.06)' } }
          }
        }
      });
    }
  }
}
