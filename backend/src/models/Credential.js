const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('credentials').push(credential).write();
    return credential;
  }

  static findAll() {
    return db.get('credentials').value().map(c => this.sanitize(c));
  }

  static findById(id) {
    const cred = db.get('credentials').find({ id }).value();
    return cred ? this.sanitize(cred) : null;
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
      updatedAt: new Date().toISOString()
    };
    db.get('credentials').find({ id }).assign(updated).write();
    return this.sanitize(updated);
  }

  static delete(id) {
    db.get('credentials').remove({ id }).write();
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
    const cred = db.get('credentials').find({ id }).value();
    return cred || null;
  }
}

module.exports = Credential;
