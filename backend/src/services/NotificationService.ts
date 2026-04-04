import https from 'https';
import http from 'http';
import { URL } from 'url';
import nodemailer from 'nodemailer';
import { Credential } from '../models/Credential';
import type { Build as IBuild, Pipeline as IPipeline, Step, NotificationResult } from '../types/index';

interface WSManager {
  broadcast: (data: Record<string, unknown>) => void;
}

interface NotificationStep {
  provider: string;
  credentialId?: string;
  channel?: string;
  message?: string;
  webhookUrl?: string;
}

class NotificationService {
  private wsManager: WSManager;

  constructor(wsManager: WSManager) {
    this.wsManager = wsManager;
  }

  async send(buildId: string, notification: NotificationStep, build: IBuild | null, pipeline: IPipeline | null): Promise<NotificationResult> {
    const { provider, credentialId, channel, message, webhookUrl } = notification;

    if (!provider) {
      return { success: false, error: 'Provider is required' };
    }

    const emit = (level: string, msg: string) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({
          type: 'build:log',
          buildId,
          log: { timestamp: new Date().toISOString(), level, message: msg }
        });
      }
    };

    let apiKey: string | null = null;
    let chatId = channel;
    let finalWebhookUrl = webhookUrl;

    if (credentialId) {
      const cred = Credential.getRaw(credentialId);
      if (cred) {
        if (cred.type === provider || cred.type === 'token') {
          apiKey = cred.token || null;
          chatId = cred.username || channel;
        } else if (cred.type === 'username-password') {
          apiKey = cred.token || cred.password || null;
          chatId = cred.username || channel;
        }
      }
    }

    if (!apiKey && channel && (channel.startsWith('http') || channel.includes(':'))) {
      finalWebhookUrl = channel;
      chatId = null;
    }

    const interpolatedMessage = this._interpolate(build, pipeline, message || this._defaultMessage(build, pipeline));

    emit('info', `📬 Sending ${provider} notification...`);

    try {
      let result: NotificationResult;
      switch (provider) {
        case 'telegram':
          result = await this._sendTelegram(buildId, apiKey, chatId, interpolatedMessage, emit);
          break;
        case 'slack':
          result = await this._sendSlack(buildId, finalWebhookUrl || apiKey, interpolatedMessage, build, pipeline, emit);
          break;
        case 'teams':
          result = await this._sendTeams(buildId, finalWebhookUrl || apiKey, interpolatedMessage, build, pipeline, emit);
          break;
        case 'mail':
          result = await this._sendMail(buildId, channel, interpolatedMessage, build, pipeline, emit);
          break;
        default:
          result = { success: false, error: `Unknown provider: ${provider}` };
      }

      if (result.success) {
        emit('success', `✅ Notification sent via ${provider}`);
      } else {
        emit('error', `❌ ${provider} notification failed: ${result.error}`);
      }

      return result;
    } catch (err) {
      emit('error', `❌ Notification error: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  private _interpolate(build: IBuild | null, pipeline: IPipeline | null, message: string): string {
    const replacements: Record<string, string> = {
      '{{PIPELINE_NAME}}': pipeline?.name || 'Unknown',
      '{{BRANCH}}': build?.branch || 'Unknown',
      '{{STATUS}}': build?.status || 'Unknown',
      '{{BUILD_NUMBER}}': build?.number?.toString() || 'N/A',
      '{{COMMIT}}': build?.commit ? (build.commit as string).substring(0, 7) : 'N/A',
      '{{COMMIT_MESSAGE}}': build?.commitMessage || 'N/A',
      '{{TRIGGERED_BY}}': build?.triggeredBy || 'Unknown',
      '{{DURATION}}': this._getDuration(build),
      '{{BUILD_URL}}': this._getBuildUrl(build)
    };

    let result = message;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  }

  private _defaultMessage(build: IBuild | null, pipeline: IPipeline | null): string {
    const emoji = build?.status === 'success' ? '✅' : '❌';
    return `${emoji} Build **#{{BUILD_NUMBER}}** for *{{PIPELINE_NAME}}*\n` +
           `**Status:** {{STATUS}}\n` +
           `**Branch:** {{BRANCH}}\n` +
           `**Commit:** {{COMMIT}}\n` +
           `**Message:** {{COMMIT_MESSAGE}}`;
  }

  private _getDuration(build: IBuild | null): string {
    if (build?.startedAt) {
      const endTime = build.finishedAt ? new Date(build.finishedAt) : new Date();
      const seconds = Math.floor((endTime.getTime() - new Date(build.startedAt).getTime()) / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    return 'N/A';
  }

  private _getBuildUrl(build: IBuild | null): string {
    return `builds/${build?.id || 'unknown'}`;
  }

  private _sendTelegram(_buildId: string, botToken: string | null, chatId: string | null, message: string, emit: (level: string, msg: string) => void): Promise<NotificationResult> {
    return new Promise((resolve) => {
      if (!botToken || !chatId) {
        resolve({ success: false, error: 'Telegram bot token and chat ID are required' });
        return;
      }

      emit('info', `   Telegram: sending to chat ${chatId}`);

      const body = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });

      const options: https.RequestOptions = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.ok) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: response.description || 'Unknown error' });
            }
          } catch {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    });
  }

  private _sendSlack(_buildId: string, webhookUrl: string | null | undefined, message: string, build: IBuild | null, pipeline: IPipeline | null, emit: (level: string, msg: string) => void): Promise<NotificationResult> {
    return new Promise((resolve) => {
      if (!webhookUrl) {
        resolve({ success: false, error: 'Slack webhook URL is required' });
        return;
      }

      emit('info', `   Slack: sending to webhook`);

      const color = build?.status === 'success' ? '#36a64f' : '#dc3545';
      const statusEmoji = build?.status === 'success' ? ':white_check_mark:' : ':x:';

      const payload = {
        attachments: [{
          color: color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${statusEmoji} Build #${build?.number || 'N/A'}`,
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Pipeline:*\n${pipeline?.name || 'Unknown'}` },
                { type: 'mrkdwn', text: `*Branch:*\n${build?.branch || 'Unknown'}` },
                { type: 'mrkdwn', text: `*Status:*\n${build?.status || 'Unknown'}` },
                { type: 'mrkdwn', text: `*Commit:*\n${build?.commit ? (build.commit as string).substring(0, 7) : 'N/A'}` }
              ]
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: message }
              ]
            }
          ]
        }]
      };

      const body = JSON.stringify(payload);
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(webhookUrl);
      } catch {
        resolve({ success: false, error: 'Invalid Slack webhook URL' });
        return;
      }

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    });
  }

  private _sendTeams(_buildId: string, webhookUrl: string | null | undefined, message: string, build: IBuild | null, pipeline: IPipeline | null, emit: (level: string, msg: string) => void): Promise<NotificationResult> {
    return new Promise((resolve) => {
      if (!webhookUrl) {
        resolve({ success: false, error: 'Teams webhook URL is required' });
        return;
      }

      emit('info', `   Teams: sending to webhook`);

      const isSuccess = build?.status === 'success';
      const themeColor = isSuccess ? '36a64f' : 'dc3545';

      const payload = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                size: 'Large',
                weight: 'Bolder',
                text: `${isSuccess ? '✅' : '❌'} Build #${build?.number || 'N/A'}`,
                color: isSuccess ? 'Good' : 'Attention'
              },
              {
                type: 'FactSet',
                facts: [
                  { title: 'Pipeline', value: pipeline?.name || 'Unknown' },
                  { title: 'Branch', value: build?.branch || 'Unknown' },
                  { title: 'Status', value: build?.status || 'Unknown' },
                  { title: 'Commit', value: build?.commit ? (build.commit as string).substring(0, 7) : 'N/A' }
                ]
              },
              {
                type: 'TextBlock',
                text: message,
                wrap: true
              }
            ]
          }
        }]
      };

      const body = JSON.stringify(payload);
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(webhookUrl);
      } catch {
        resolve({ success: false, error: 'Invalid Teams webhook URL' });
        return;
      }

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    });
  }

  private _sendMail(_buildId: string, to: string | undefined, message: string, build: IBuild | null, pipeline: IPipeline | null, emit: (level: string, msg: string) => void): Promise<NotificationResult> {
    return new Promise((resolve) => {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      if (!to) {
        resolve({ success: false, error: 'Recipient email address is required' });
        return;
      }

      emit('info', `   Mail: sending to ${to}`);

      const subject = `[${build?.status?.toUpperCase() || 'BUILD'}] #${build?.number || 'N/A'} - ${pipeline?.name || 'Pipeline'}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        subject: subject,
        text: message,
        html: `<pre style="font-family: monospace;">${message}</pre>`
      };

      transporter.sendMail(mailOptions, (err, _info) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }
}

export default NotificationService;
