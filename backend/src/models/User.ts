import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import type { User as IUser } from '../types';

interface UserData {
  email: string;
  password: string;
  username?: string;
  role?: string;
}

interface UserUpdateData {
  username?: string;
  role?: string;
  password?: string;
}

export class User {
  static async create(data: UserData): Promise<Omit<IUser, 'password'>> {
    const existingUser = db.get('users').find({ email: data.email }).value();
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user: IUser = {
      id: uuidv4(),
      email: data.email,
      username: data.username || data.email.split('@')[0],
      password: hashedPassword,
      role: (data.role as IUser['role']) || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.get('users').push(user).write();
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static findAll(): Omit<IUser, 'password'>[] {
    return db.get('users').map((user: IUser) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }).value();
  }

  static findById(id: string): Omit<IUser, 'password'> | null {
    const user = db.get('users').find({ id }).value();
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static findByEmail(email: string): IUser | undefined {
    return db.get('users').find({ email }).value();
  }

  static async update(id: string, data: UserUpdateData): Promise<Omit<IUser, 'password'> | null> {
    const user = db.get('users').find({ id }).value();
    if (!user) return null;

    const updates: Partial<IUser> = {
      role: (data.role as IUser['role']) || user.role,
      updatedAt: new Date().toISOString()
    };

    if (data.username !== undefined) {
      updates.username = data.username;
    }

    if (data.password) {
      updates.password = await bcrypt.hash(data.password, 10);
    }

    db.get('users').find({ id }).assign(updates).write();
    return this.findById(id);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static delete(id: string): boolean {
    db.get('users').remove({ id }).write();
    return true;
  }
}

export default User
