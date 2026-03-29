export interface AdminSettings {
  allowRegistration: boolean;
  maxConcurrentBuilds: number;
  defaultTimeout: number;
  retentionDays: number;
}

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'contributor';
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  users: UserListItem[];
}
