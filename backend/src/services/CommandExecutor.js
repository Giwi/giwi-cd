const { exec } = require('child_process');

class CommandExecutor {
  constructor(emitFn) {
    this.emit = emitFn;
  }

  async execute(buildId, command, workingDir) {
    return new Promise((resolve) => {
      if (!command) {
        resolve({ success: true, output: '' });
        return;
      }

      this.emit(buildId, 'info', `    $ ${command}`);
      
      const execOptions = {
        cwd: workingDir || process.cwd(),
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024
      };
      
      require('child_process').exec(command, execOptions, (error, stdout, stderr) => {
        let output = '';
        
        if (stdout) {
          stdout.split('\n').forEach(line => {
            if (line.trim()) {
              this.emit(buildId, 'info', `    ${line}`);
              output += line + '\n';
            }
          });
        }
        if (stderr && stderr.trim()) {
          stderr.split('\n').forEach(line => {
            if (line.trim()) {
              this.emit(buildId, 'error', `    ${line}`);
              output += line + '\n';
            }
          });
        }
        
        if (error) {
          this.emit(buildId, 'error', `    ❌ Exit code: ${error.code || 1}`);
          resolve({ success: false, output, exitCode: error.code });
        } else {
          resolve({ success: true, output });
        }
      });
    });
  }

  maskCredentials(command) {
    if (!command) return command;
    return command.replace(/\$\{CRED:([^}]+)\}/g, '${CRED:$1}');
  }
}

module.exports = CommandExecutor;
