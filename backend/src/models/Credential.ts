import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import type { Credential as ICredential } from '../types';

interface CredentialData {
  name: string;
  type?: ICredential['type'];
  username?: string;
  password?: string;
  token?: string;
  privateKey?: string;
  passphrase?: string;
  description?: string;
  provider?: string;
}

export class Credential {
  static create(data: CredentialData): ICredential {
    const credential: ICredential & { userId: string; passphrase?: string } = {
      id: uuidv4(),
      userId: '',
      name: data.name,
      type: data.type || 'username-password',
      username: data.username || '',
      password: data.password || '',
      token: data.token || '',
      privateKey: data.privateKey || '',
      passphrase: data.passphrase || '',
      description: data.description || '',
      provider: data.provider || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('credentials').push(credential).write();
    return this.sanitize(credential);
  }

  static findAll(): (ICredential & { userId: string })[] {
    return db.get('credentials').value().map((c: ICredential & { userId: string }) => this.sanitize(c));
  }

  static findById(id: string): (ICredential & { userId: string }) | null {
    const cred = db.get('credentials').find({ id }).value();
    return cred ? this.sanitize(cred) : null;
  }

  static update(id: string, data: Partial<CredentialData>): (ICredential & { userId: string }) | null {
    const existing = db.get('credentials').find({ id }).value();
    if (!existing) return null;

    const updated = {
      ...existing,
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      username: data.username ?? existing.username,
      password: data.password ?? existing.password,
      token: data.token ?? existing.token,
      privateKey: data.privateKey ?? existing.privateKey,
      passphrase: data.passphrase ?? existing.passphrase,
      description: data.description ?? existing.description,
      provider: data.provider ?? existing.provider,
      updatedAt: new Date().toISOString()
    };
    db.get('credentials').find({ id }).assign(updated).write();
    return this.sanitize(updated);
  }

  static delete(id: string): boolean {
    db.get('credentials').remove({ id }).write();
    return true;
  }

  static sanitize(cred: ICredential & { userId: string; passphrase?: string }): ICredential & { userId: string } {
    return {
      ...cred,
      password: cred.password ? '********' : '',
      token: cred.token ? '********' : '',
      privateKey: cred.privateKey ? '********' : ''
    };
  }

  static getRaw(id: string): (ICredential & { userId: string }) | null {
    const cred = db.get('credentials').find({ id }).value();
    return cred || null;
  }
}
