const Build = require('../models/Build');
const NotificationService = require('./NotificationService');

class StageRunner {
  constructor(wsManager, commandExecutor) {
    this.wsManager = wsManager;
    this.commandExecutor = commandExecutor;
    this.notificationService = new NotificationService(wsManager);
  }

  async executeStage(buildId, stage, pipeline, workDir, emit) {
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

  async _executeNotification(buildId, step, pipeline, emit) {
    const currentBuild = Build.findById(buildId);
    try {
      await this.notificationService.send(buildId, step, currentBuild, pipeline);
    } catch (err) {
      emit(buildId, 'error', `  ❌ Notification error: ${err.message}`);
    }
  }

  async _executeCommand(buildId, step, pipeline, workDir, emit) {
    const command = this._interpolateCredentials(step.command, pipeline);
    const maskedCommand = this.commandExecutor.maskCredentials(command);
    emit(buildId, 'info', `  ▶ Step: ${step.name || maskedCommand}`);
    
    const stepWorkingDir = step.workingDir || workDir;
    const result = await this.commandExecutor.execute(buildId, command, stepWorkingDir);
    
    return result.success;
  }

  _interpolateCredentials(command, pipeline) {
    if (!command) return command;

    const Credential = require('../models/Credential');
    const credPattern = /\$\{CRED:([^}]+)\}/g;
    let result = command;
    let match;

    while ((match = credPattern.exec(command)) !== null) {
      const credName = match[1];
      const cred = Credential.findAll().find(c => c.name.toLowerCase() === credName.toLowerCase());
      
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

module.exports = StageRunner;
