const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ArtifactStorage {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(process.cwd(), 'artifacts');
    this._ensureDirectory(this.baseDir);
  }

  _ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _getBuildDir(pipelineId, buildId) {
    return path.join(this.baseDir, pipelineId, buildId);
  }

  async store(pipelineId, buildId, files) {
    const buildDir = this._getBuildDir(pipelineId, buildId);
    this._ensureDirectory(buildDir);

    const stored = [];

    for (const file of files) {
      const filename = file.name || `file-${uuidv4()}`;
      const filepath = path.join(buildDir, filename);
      
      if (file.content) {
        fs.writeFileSync(filepath, file.content);
      } else if (file.path) {
        fs.copyFileSync(file.path, filepath);
      }

      stored.push({
        name: filename,
        path: filepath,
        size: fs.statSync(filepath).size
      });
    }

    return stored;
  }

  get(pipelineId, buildId, filename) {
    const filepath = path.join(this._getBuildDir(pipelineId, buildId), filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    return fs.createReadStream(filepath);
  }

  getInfo(pipelineId, buildId, filename) {
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

  list(pipelineId, buildId) {
    const buildDir = this._getBuildDir(pipelineId, buildId);
    if (!fs.existsSync(buildDir)) {
      return [];
    }

    return fs.readdirSync(buildDir).map(filename => {
      const info = this.getInfo(pipelineId, buildId, filename);
      return info;
    });
  }

  delete(pipelineId, buildId, filename = null) {
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

  getTotalSize(pipelineId, buildId) {
    const files = this.list(pipelineId, buildId);
    return files.reduce((sum, file) => sum + file.size, 0);
  }

  cleanupOldBuilds(pipelineId, keepCount) {
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
      .sort((a, b) => b.mtime - a.mtime);

    if (builds.length <= keepCount) {
      return;
    }

    const toDelete = builds.slice(keepCount);
    for (const build of toDelete) {
      fs.rmSync(build.path, { recursive: true, force: true });
    }
  }

  getStorageStats() {
    const stats = {
      totalSize: 0,
      totalFiles: 0,
      totalBuilds: 0,
      byPipeline: {}
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

module.exports = ArtifactStorage;
