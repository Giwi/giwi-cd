import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';

const DEFAULT_ADMIN = {
  email: 'admin@giwicd.local',
  username: 'admin',
  password: 'admin123'
};

async function createDefaultAdmin(): Promise<void> {
  const existingAdmin = db.get('users').find({ email: DEFAULT_ADMIN.email }).value();

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

  const admin = {
    id: uuidv4(),
    email: DEFAULT_ADMIN.email,
    username: DEFAULT_ADMIN.username,
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('users').push(admin as Record<string, unknown>).write();
  console.log(`Default admin created: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
  console.log('Please change the password after first login!');
}

function ensureDefaultAdmin(): void {
  const admin = db.get('users').find({ role: 'admin' }).value();
  if (!admin) {
    createDefaultAdmin();
  }
}

export { createDefaultAdmin, ensureDefaultAdmin, DEFAULT_ADMIN };
