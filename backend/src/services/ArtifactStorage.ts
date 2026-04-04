import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ArtifactFile, ArtifactInfo } from '../types/index';

class ArtifactStorage {
  private baseDir: string;

  constructor(baseDir: string | null = null) {
    this.baseDir = baseDir || path.join(process.cwd(), 'artifacts');
    this._ensureDirectory(this.baseDir);
  }

  private _ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private _getBuildDir(pipelineId: string, buildId: string): string {
    return path.join(this.baseDir, pipelineId, buildId);
  }

  async store(pipelineId: string, buildId: string, files: ArtifactFile[]): Promise<ArtifactInfo[]> {
    const buildDir = this._getBuildDir(pipelineId, buildId);
    this._ensureDirectory(buildDir);

    const stored: ArtifactInfo[] = [];

    for (const file of files) {
      const filename = file.name || `file-${uuidv4()}`;
      const filepath = path.join(buildDir, filename);

      if (file.content) {
        fs.writeFileSync(filepath, file.content);
      } else if (file.path) {
        fs.copyFileSync(file.path, filepath);
      }

      const stats = fs.statSync(filepath);
      stored.push({
        name: filename,
        path: filepath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      });
    }

    return stored;
  }

  get(pipelineId: string, buildId: string, filename: string): fs.ReadStream | null {
    const filepath = path.join(this._getBuildDir(pipelineId, buildId), filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    return fs.createReadStream(filepath);
  }

  getInfo(pipelineId: string, buildId: string, filename: string): ArtifactInfo | null {
    const filepath = path.join(this._getBuildDir(pipelineId, buildId), filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const stats = fs.statSync(filepath);
    return {
      name: filename,
      path: filepath,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }

  list(pipelineId: string, buildId: string): (ArtifactInfo | null)[] {
    const buildDir = this._getBuildDir(pipelineId, buildId);
    if (!fs.existsSync(buildDir)) {
      return [];
    }

    return fs.readdirSync(buildDir).map(filename => {
      return this.getInfo(pipelineId, buildId, filename);
    });
  }

  delete(pipelineId: string, buildId: string, filename: string | null = null): void {
    const buildDir = this._getBuildDir(pipelineId, buildId);
    if (!fs.existsSync(buildDir)) {
      return;
    }

    if (filename) {
      const filepath = path.join(buildDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } else {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
  }

  getTotalSize(pipelineId: string, buildId: string): number {
    const files = this.list(pipelineId, buildId);
    return files.reduce((sum, file) => sum + (file?.size || 0), 0);
  }

  cleanupOldBuilds(pipelineId: string, keepCount: number): void {
    const pipelineDir = path.join(this.baseDir, pipelineId);
    if (!fs.existsSync(pipelineDir)) {
      return;
    }

    const builds = fs.readdirSync(pipelineDir)
      .map(dir => ({
        name: dir,
        path: path.join(pipelineDir, dir),
        mtime: fs.statSync(path.join(pipelineDir, dir)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (builds.length <= keepCount) {
      return;
    }

    const toDelete = builds.slice(keepCount);
    for (const build of toDelete) {
      fs.rmSync(build.path, { recursive: true, force: true });
    }
  }

  getStorageStats(): { totalSize: number; totalFiles: number; totalBuilds: number; byPipeline: Record<string, { size: number; files: number; builds: number }> } {
    const stats = {
      totalSize: 0,
      totalFiles: 0,
      totalBuilds: 0,
      byPipeline: {} as Record<string, { size: number; files: number; builds: number }>
    };

    if (!fs.existsSync(this.baseDir)) {
      return stats;
    }

    for (const pipelineId of fs.readdirSync(this.baseDir)) {
      const pipelineDir = path.join(this.baseDir, pipelineId);
      if (!fs.statSync(pipelineDir).isDirectory()) continue;

      stats.byPipeline[pipelineId] = {
        size: 0,
        files: 0,
        builds: 0
      };

      for (const buildId of fs.readdirSync(pipelineDir)) {
        const buildDir = path.join(pipelineDir, buildId);
        if (!fs.statSync(buildDir).isDirectory()) continue;

        stats.totalBuilds++;
        stats.byPipeline[pipelineId].builds++;

        for (const file of fs.readdirSync(buildDir)) {
          const filepath = path.join(buildDir, file);
          const size = fs.statSync(filepath).size;

          stats.totalSize += size;
          stats.totalFiles++;
          stats.byPipeline[pipelineId].size += size;
          stats.byPipeline[pipelineId].files++;
        }
      }
    }

    return stats;
  }
}

export default ArtifactStorage;
