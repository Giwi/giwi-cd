const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

const modelsPath = path.resolve(__dirname, '../models');
const Build = require(path.join(modelsPath, 'Build'));
const Credential = require(path.join(modelsPath, 'Credential'));
const CommandExecutor = require('./CommandExecutor');
const NotificationService = require('./NotificationService');

const { buildId, stage, pipeline, workDir } = workerData;

let cancelled = false;

const emit = (level, message) => {
  parentPort.postMessage({ type: 'log', buildId, level, message });
};

const emitWithBuildId = (bid, level, message) => {
  emit(level, message);
};

parentPort.on('message', (msg) => {
  if (msg === 'cancel') {
    cancelled = true;
  }
});

async function executeStage() {
  const commandExecutor = new CommandExecutor(emitWithBuildId);
  const notificationService = new NotificationService({
    broadcast: (msg) => parentPort.postMessage({ type: 'broadcast', ...msg })
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
        emit('error', `  ❌ Notification error: ${err.message}`);
      }
    } else {
      const command = interpolateCredentials(step.command, pipeline);
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

function interpolateCredentials(command, pipeline) {
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
    parentPort.postMessage({ type: 'complete', buildId, success });
  })
  .catch(err => {
    if (err.message === 'The worker has been terminated') {
      emit('warn', '⚠️ Stage worker terminated');
    } else {
      parentPort.postMessage({ type: 'error', buildId, message: err.message });
    }
  });
