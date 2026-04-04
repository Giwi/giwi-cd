import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import { exec, ExecException } from 'child_process';

const modelsPath = path.resolve(__dirname, '../models');
const Build = require(path.join(modelsPath, 'Build.js')).default;
const { Credential } = require(path.join(modelsPath, 'Credential.js'));
const CommandExecutor = require('./CommandExecutor.js').default;
const NotificationService = require('./NotificationService.js').default;

interface WorkerData {
  buildId: string;
  stage: {
    name: string;
    steps: Array<{
      type?: string;
      name?: string;
      command?: string;
      workingDir?: string;
      continueOnError?: boolean;
      provider?: string;
      credentialId?: string;
      channel?: string;
      message?: string;
    }>;
  };
  pipeline: Record<string, unknown>;
  workDir: string | null;
}

const { buildId, stage, pipeline, workDir } = workerData as WorkerData;

let cancelled = false;

const emit = (level: string, message: string): void => {
  parentPort!.postMessage({ type: 'log', buildId, level, message });
};

parentPort!.on('message', (msg: unknown) => {
  if (msg === 'cancel') {
    cancelled = true;
  }
});

async function executeStage(): Promise<boolean> {
  const commandExecutor = new CommandExecutor((bid: string, level: string, message: string) => {
    emit(level, message);
  });
  const notificationService = new NotificationService({
    broadcast: (msg: Record<string, unknown>) => parentPort!.postMessage({ type: 'broadcast', ...msg })
  });

  const steps = stage.steps || [];

  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    if (cancelled) {
      emit('warn', '⚠️ Stage cancelled');
      return false;
    }

    const step = steps[sIdx];

    if (step.type === 'notification') {
      try {
        const currentBuild = Build.findById(buildId);
        await notificationService.send(buildId, step, currentBuild, pipeline);
      } catch (err) {
        emit('error', `  ❌ Notification error: ${(err as Error).message}`);
      }
    } else {
      const command = interpolateCredentials(step.command || '', pipeline);
      const maskedCommand = commandExecutor.maskCredentials(command);
      emit('info', `  ▶ Step: ${step.name || maskedCommand}`);

      const stepWorkingDir = step.workingDir || workDir;
      const result = await commandExecutor.execute(buildId, command, stepWorkingDir);

      if (cancelled) {
        emit('warn', '⚠️ Stage cancelled after step');
        return false;
      }

      if (!result.success && step.continueOnError !== true) {
        return false;
      }
    }
  }
  return true;
}

function interpolateCredentials(command: string, pipeline: Record<string, unknown>): string {
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

executeStage()
  .then(success => {
    parentPort!.postMessage({ type: 'complete', buildId, success });
  })
  .catch(err => {
    if ((err as Error).message === 'The worker has been terminated') {
      emit('warn', '⚠️ Stage worker terminated');
    } else {
      parentPort!.postMessage({ type: 'error', buildId, message: (err as Error).message });
    }
  });
