const User = require('../../src/models/User').default;
const { db } = require('../../src/config/database');

describe('User Model', () => {
  beforeEach(() => {
    db.set('users', []).write();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      });

      expect(user).toHaveProperty('id');
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('user');
      expect(user).not.toHaveProperty('password');
    });

    it('should default username from email', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(user.username).toBe('test');
    });

    it('should accept custom role', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        username: 'admin',
        password: 'password123',
        role: 'admin'
      });

      expect(user.role).toBe('admin');
    });

    it('should throw if email already registered', async () => {
      await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });

      await expect(User.create({ email: 'test@example.com', username: 'testuser2', password: 'password123' }))
        .rejects.toThrow('Email already registered');
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email with password', async () => {
      await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const found = await User.findByEmail('test@example.com');

      expect(found).toBeDefined();
      expect(found.email).toBe('test@example.com');
      expect(found.password).toBeDefined();
    });

    it('should return undefined for non-existent email', async () => {
      const found = await User.findByEmail('nonexistent@example.com');
      expect(found).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find a user by id without password', async () => {
      const created = await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const found = User.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found).not.toHaveProperty('password');
    });

    it('should return null for non-existent id', () => {
      const found = User.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      await User.create({ email: 'a@example.com', username: 'userA', password: 'password123' });
      await User.create({ email: 'b@example.com', username: 'userB', password: 'password123' });

      const users = User.findAll();
      expect(users.length).toBe(2);
      expect(users[0]).not.toHaveProperty('password');
      expect(users[1]).not.toHaveProperty('password');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const fullUser = await User.findByEmail('test@example.com');
      const valid = await User.verifyPassword('password123', fullUser.password);

      expect(valid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const fullUser = await User.findByEmail('test@example.com');
      const valid = await User.verifyPassword('wrongpassword', fullUser.password);

      expect(valid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const updated = await User.update(user.id, { username: 'newname' });

      expect(updated.username).toBe('newname');
    });

    it('should preserve existing fields when not provided', async () => {
      const user = await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123', role: 'admin' });
      const updated = await User.update(user.id, { username: 'newname' });

      expect(updated.username).toBe('newname');
      expect(updated.role).toBe('admin');
    });

    it('should hash password when updating it', async () => {
      const user = await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      await User.update(user.id, { password: 'newpassword' });

      const fullUser = await User.findByEmail('test@example.com');
      const valid = await User.verifyPassword('newpassword', fullUser.password);
      expect(valid).toBe(true);
    });

    it('should return null for non-existent id', async () => {
      const updated = await User.update('non-existent', { username: 'newname' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const user = await User.create({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      const result = User.delete(user.id);

      expect(result).toBe(true);
      expect(User.findById(user.id)).toBeNull();
    });
  });
});
