export interface User {
  id: string;
  email: string;
  username?: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  userId?: string;
  name: string;
  type: 'username-password' | 'token' | 'ssh-key';
  username?: string;
  password?: string;
  token?: string;
  privateKey?: string;
  publicKey?: string;
  passphrase?: string;
  description?: string;
  provider?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  credentialId?: string;
  branch: string;
  stages: Stage[];
  triggers?: {
    manual?: boolean;
    push?: boolean;
    schedule?: string | null;
  };
  environment?: string[];
  enabled?: boolean;
  status: 'inactive' | 'running';
  lastBuildAt?: string | null;
  lastBuildStatus?: string | null;
  lastCommit?: string | null;
  pollingInterval?: number;
  keepBuilds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  continueOnError?: boolean;
  steps: Step[];
}

export interface Step {
  id: string;
  name?: string;
  type?: 'command' | 'notification';
  command?: string;
  workingDir?: string;
  continueOnError?: boolean;
  provider?: string;
  credentialId?: string;
  channel?: string;
  message?: string;
  webhookUrl?: string;
}

export interface Build {
  id: string;
  pipelineId: string;
  pipelineName?: string;
  number?: number;
  branch: string;
  commit?: string | null;
  commitMessage?: string;
  triggeredBy?: string;
  triggeredByType?: 'webhook' | 'manual' | 'schedule';
  status: 'pending' | 'running' | 'success' | 'failed' | 'error' | 'cancelled';
  logs: LogEntry[];
  stages: Stage[];
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  stage?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  provider: 'telegram' | 'slack' | 'teams' | 'mail';
  name: string;
  credentialId?: string;
  channel?: string;
  webhookUrl?: string;
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export interface ApiError extends Error {
  statusCode?: number;
}
