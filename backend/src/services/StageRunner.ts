import type { Build as IBuild, Pipeline as IPipeline, Stage, Step } from '../types/index';
import { Build } from '../models/Build';
import { Credential } from '../models/Credential';

interface WSManager {
  broadcast: (data: Record<string, unknown>) => void;
}

interface CommandExecutor {
  execute: (buildId: string, command: string, workingDir?: string) => Promise<{ success: boolean; output: string }>;
  maskCredentials: (command: string) => string;
}

type EmitFn = (buildId: string, level: string, message: string) => void;

class StageRunner {
  private wsManager: WSManager;
  private commandExecutor: CommandExecutor;
  private notificationService: unknown;

  constructor(wsManager: WSManager, commandExecutor: CommandExecutor) {
    this.wsManager = wsManager;
    this.commandExecutor = commandExecutor;
    const NotificationService = require('./NotificationService.js').default;
    this.notificationService = new NotificationService(wsManager);
  }

  async executeStage(buildId: string, stage: Stage, pipeline: IPipeline, workDir: string, emit: EmitFn): Promise<boolean> {
    const steps = stage.steps || [];

    for (let sIdx = 0; sIdx < steps.length; sIdx++) {
      const step = steps[sIdx];

      if (step.type === 'notification') {
        await this._executeNotification(buildId, step, pipeline, emit);
      } else {
        const success = await this._executeCommand(buildId, step, pipeline, workDir, emit);
        if (!success && step.continueOnError !== true) {
          return false;
        }
      }
    }
    return true;
  }

  private async _executeNotification(buildId: string, step: Step, pipeline: IPipeline, emit: EmitFn): Promise<void> {
    const currentBuild = Build.findById(buildId);
    try {
      await (this.notificationService as { send: (buildId: string, step: Step, build: IBuild | null, pipeline: IPipeline) => Promise<unknown> }).send(buildId, step, currentBuild as IBuild | null, pipeline);
    } catch (err) {
      emit(buildId, 'error', `  ❌ Notification error: ${(err as Error).message}`);
    }
  }

  private async _executeCommand(buildId: string, step: Step, pipeline: IPipeline, workDir: string, emit: EmitFn): Promise<boolean> {
    const command = this._interpolateCredentials(step.command || '', pipeline);
    const maskedCommand = this.commandExecutor.maskCredentials(command);
    emit(buildId, 'info', `  ▶ Step: ${step.name || maskedCommand}`);

    const stepWorkingDir = step.workingDir || workDir;
    const result = await this.commandExecutor.execute(buildId, command, stepWorkingDir);

    return result.success;
  }

  private _interpolateCredentials(command: string, pipeline: IPipeline): string {
    if (!command) return command;

    const credPattern = /\$\{CRED:([^}]+)\}/g;
    let result = command;
    let match;

    while ((match = credPattern.exec(command)) !== null) {
      const credName = match[1];
      const cred = Credential.findByName(credName);

      if (cred) {
        let value = '';
        switch (cred.type) {
          case 'username-password':
            value = cred.password || '';
            break;
          case 'token':
            value = cred.token || '';
            break;
          case 'ssh-key':
            value = cred.privateKey || '';
            break;
        }
        result = result.replace(match[0], value);
      } else {
        result = result.replace(match[0], '');
      }
    }

    return result;
  }
}

export default StageRunner;
