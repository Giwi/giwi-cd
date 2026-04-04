import type { Request, Response } from 'express';
import express from 'express';
import { db } from '../config/database';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function getDiskUsage(dir: string): { total: number; used: number; free: number; usagePercent: number } | null {
  try {
    const stat = fs.statfsSync(dir);
    const total = stat.bsize * stat.blocks;
    const free = stat.bsize * stat.bfree;
    const used = total - free;
    return {
      total: Math.round(total / 1024 / 1024),
      used: Math.round(used / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      usagePercent: total > 0 ? Math.round((used / total) * 100) : 0
    };
  } catch {
    return null;
  }
}

function checkDatabase(): { status: string; tables?: { pipelines: number; builds: number; users: number }; message?: string } {
  try {
    const pipelines = db.get('pipelines').value();
    const builds = db.get('builds').value();
    const users = db.get('users').value();
    return {
      status: 'ok',
      tables: {
        pipelines: Array.isArray(pipelines) ? pipelines.length : 0,
        builds: Array.isArray(builds) ? builds.length : 0,
        users: Array.isArray(users) ? users.length : 0
      }
    };
  } catch (err) {
    return { status: 'error', message: (err as Error).message };
  }
}

function checkDisk(): { status: string; message?: string; total?: number; used?: number; free?: number; usagePercent?: number; threshold?: number } {
  const dataDir = path.join(process.cwd(), 'data');
  const disk = getDiskUsage(dataDir);
  if (!disk) return { status: 'unknown', message: 'Could not determine disk usage' };

  const threshold = parseInt(process.env.DISK_USAGE_THRESHOLD || '90', 10);
  if (disk.usagePercent >= threshold) {
    return { status: 'critical', ...disk, threshold };
  }
  return { status: 'ok', ...disk };
}

function checkMemory(): { status: string; usedMB: number; totalMB: number; usagePercent: number; rssMB: number } {
  const mem = process.memoryUsage();
  const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const usagePercent = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

  return {
    status: usagePercent >= 90 ? 'critical' : usagePercent >= 70 ? 'warning' : 'ok',
    usedMB,
    totalMB,
    usagePercent,
    rssMB: Math.round(mem.rss / 1024 / 1024)
  };
}

function checkUptime(): string {
  const seconds = Math.floor(process.uptime());
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

router.get('/', (_req: Request, res: Response) => {
  const dbCheck = checkDatabase();
  const diskCheck = checkDisk();
  const memCheck = checkMemory();

  const checks = {
    database: dbCheck.status,
    disk: diskCheck.status,
    memory: memCheck.status
  };

  const criticalChecks = Object.values(checks);
  const isHealthy = criticalChecks.every(s => s === 'ok');
  const isDegraded = criticalChecks.some(s => s === 'warning' || s === 'degraded');
  const isCritical = criticalChecks.some(s => s === 'critical' || s === 'error');

  let status = 'ok';
  if (isCritical) status = 'critical';
  else if (isDegraded) status = 'degraded';

  const response = {
    status,
    timestamp: new Date().toISOString(),
    uptime: checkUptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbCheck,
      disk: diskCheck,
      memory: memCheck
    }
  };

  res.status(isCritical ? 503 : 200).json(response);
});

router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', (_req: Request, res: Response) => {
  const dbCheck = checkDatabase();
  if (dbCheck.status === 'ok') {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: dbCheck.message });
  }
});

export default router;
