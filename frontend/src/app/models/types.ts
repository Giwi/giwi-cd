export interface Pipeline {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  credentialId?: string | null;
  credentialName?: string | null;
  credentialType?: string | null;
  branch: string;
  stages: Stage[];
  triggers: {
    manual: boolean;
    push: boolean;
    schedule: string | null;
  };
  environment: EnvVar[];
  status: string;
  enabled: boolean;
  keepBuilds?: number;
  createdAt: string;
  updatedAt: string;
  lastBuildAt: string | null;
  lastBuildStatus: string | null;
}

export interface Stage {
  id?: string;
  name: string;
  steps: Step[];
  continueOnError?: boolean;
  status?: string;
}

export interface Step {
  type?: 'notification';
  name?: string;
  command?: string;
  provider?: 'telegram' | 'slack' | 'teams' | 'mail';
  credentialId?: string;
  channel?: string;
  message?: string;
  workingDir?: string;
  continueOnError?: boolean;
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface Build {
  id: string;
  number: number;
  pipelineId: string;
  pipelineName: string;
  branch: string;
  commit: string | null;
  commitMessage: string;
  triggeredBy: string;
  status: BuildStatus;
  stages: Stage[];
  logs: BuildLog[];
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  createdAt: string;
}

export interface BuildLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  stage?: string | null;
}

export type BuildStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'error';

export interface DashboardData {
  pipelines: {
    total: number;
    active: number;
    enabled: number;
    disabled: number;
  };
  builds: BuildStats;
  recentBuilds: Build[];
  connectedClients: number;
  serverTime: string;
}

export interface BuildStats {
  total: number;
  last24h: number;
  last7d: number;
  successRate: number;
  byStatus: {
    pending: number;
    running: number;
    success: number;
    failed: number;
    cancelled: number;
  };
  avgDuration: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface Credential {
  id: string;
  name: string;
  type: 'username-password' | 'token' | 'ssh-key' | 'telegram' | 'slack' | 'teams' | 'mail';
  username?: string;
  password?: string;
  token?: string;
  privateKey?: string;
  passphrase?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  error?: string;
}
