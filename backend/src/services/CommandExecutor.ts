import { exec, ExecException, ExecOptions } from 'child_process';

type EmitFn = (buildId: string, level: string, message: string) => void;

interface CommandResult {
  success: boolean;
  output: string;
  exitCode?: number | null;
}

class CommandExecutor {
  private emit: EmitFn;

  constructor(emitFn: EmitFn) {
    this.emit = emitFn;
  }

  async execute(buildId: string, command: string, workingDir?: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      if (!command) {
        resolve({ success: true, output: '' });
        return;
      }

      this.emit(buildId, 'info', `    $ ${command}`);

      const execOptions: ExecOptions = {
        cwd: workingDir || process.cwd(),
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024
      };

      exec(command, execOptions, (error: ExecException | null, stdout: string, stderr: string) => {
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

  maskCredentials(command: string): string {
    if (!command) return command;
    return command.replace(/\$\{CRED:([^}]+)\}/g, '${CRED:$1}');
  }
}

export default CommandExecutor;
