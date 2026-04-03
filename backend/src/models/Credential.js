const { v4: uuidv4 } = require('uuid');
const { db, dbIndex } = require('../config/database');
const { credentialCache } = require('../services/CredentialCache');

class Credential {
  static create(data) {
    const credential = {
      id: uuidv4(),
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
    return credential;
  }

  static findAll() {
    const credentials = db.get('credentials').value();
    return credentials.map(c => this.sanitize(c));
  }

  static findById(id) {
    const cached = credentialCache.get(id);
    if (cached) return cached;

    const cred = db.get('credentials').find({ id }).value();
    if (!cred) return null;
    
    const sanitized = this.sanitize(cred);
    credentialCache.set(id, sanitized);
    return sanitized;
  }

  static update(id, data) {
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
    credentialCache.invalidate(id);
    return this.sanitize(updated);
  }

  static delete(id) {
    db.get('credentials').remove({ id }).write();
    credentialCache.invalidate(id);
    return true;
  }

  static sanitize(cred) {
    return {
      ...cred,
      password: cred.password ? '********' : '',
      token: cred.token ? '********' : '',
      privateKey: cred.privateKey ? '********' : '',
      passphrase: cred.passphrase ? '********' : ''
    };
  }

  static getRaw(id) {
    const cached = credentialCache.get(id);
    if (cached) {
      return { ...cached, password: '', token: '', privateKey: '', passphrase: '' };
    }

    const cred = db.get('credentials').find({ id }).value();
    if (!cred) return null;
    
    credentialCache.set(id, cred);
    return cred;
  }

  static findByName(name) {
    const cached = credentialCache.getByName(name);
    if (cached) return cached;

    const cred = db.get('credentials')
      .find(c => c.name.toLowerCase() === name.toLowerCase())
      .value();
    
    if (!cred) return null;
    
    const sanitized = this.sanitize(cred);
    credentialCache.set(cred.id, sanitized);
    return sanitized;
  }
}

module.exports = Credential;
