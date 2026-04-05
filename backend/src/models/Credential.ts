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
      provider: data.provider || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('credentials').push(credential as unknown as Record<string, unknown>).write();
    return this.sanitize(credential);
  }

  static findAll(): (ICredential & { userId: string })[] {
    const values = db.get('credentials').value() as unknown as Record<string, unknown>[];
    return values.map(c => {
      const cred = c as unknown as ICredential & { userId: string };
      return this.sanitize(cred);
    });
  }

  static findById(id: string): (ICredential & { userId: string }) | null {
    const cred = db.get('credentials').find({ id }).value() as Record<string, unknown> | undefined;
    if (!cred) return null;
    const credTyped = cred as unknown as ICredential & { userId: string };
    return this.sanitize(credTyped);
  }

  static update(id: string, data: Partial<CredentialData>): (ICredential & { userId: string }) | null {
    const existing = db.get('credentials').find({ id }).value() as Record<string, unknown> | undefined;
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
    db.get('credentials').find({ id }).assign(updated as Record<string, unknown>).write();
    return this.sanitize(updated as ICredential & { userId: string });
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
      privateKey: cred.privateKey ? '********' : '',
      passphrase: cred.passphrase ? '********' : ''
    };
  }

  static getRaw(id: string): (ICredential & { userId: string }) | null {
    const cred = db.get('credentials').find({ id }).value() as Record<string, unknown> | undefined;
    if (!cred) return null;
    return cred as unknown as ICredential & { userId: string };
  }

  static findByName(name: string): ICredential | null {
    const values = db.get('credentials').value() as unknown as Record<string, unknown>[];
    const cred = values.find((c: Record<string, unknown>) => {
      const typed = c as unknown as ICredential;
      return typed.name.toLowerCase() === name.toLowerCase();
    });
    if (!cred) return null;
    return this.sanitize(cred as unknown as ICredential & { userId: string });
  }
}

export default Credential
