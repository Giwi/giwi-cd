const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { db, dbIndex } = require('../config/database');

class User {
  static async create(data) {
    const existingUser = db.get('users').find({ email: data.email }).value();
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user = {
      id: uuidv4(),
      email: data.email,
      username: data.username || data.email.split('@')[0],
      password: hashedPassword,
      role: data.role || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.get('users').push(user).write();
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static findAll() {
    return db.get('users').map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }).value();
  }

  static findById(id) {
    const user = db.get('users').find({ id }).value();
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static findByEmail(email) {
    return db.get('users').find({ email }).value();
  }

  static async update(id, data) {
    const user = db.get('users').find({ id }).value();
    if (!user) return null;

    const updates = {
      username: data.username !== undefined ? data.username : user.username,
      role: data.role !== undefined ? data.role : user.role,
      updatedAt: new Date().toISOString()
    };

    if (data.password) {
      updates.password = await bcrypt.hash(data.password, 10);
    }

    db.get('users').find({ id }).assign(updates).write();
    return this.findById(id);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static delete(id) {
    db.get('users').remove({ id }).write();
    return true;
  }
}

module.exports = User;
