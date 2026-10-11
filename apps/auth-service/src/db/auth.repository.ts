import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { UserDto, UserRole, UserStatus, UserProfileDto } from '@cloudlab/shared-types';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  preferred_terminal_theme?: string;
  email_verification_token?: string;
  email_verification_expires?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  revoked: boolean;
}

export class AuthRepository {
  private pool: mysql.Pool | null = null;
  private isConnected = false;
  private memoryUsers: Map<string, UserRecord> = new Map();
  private memoryTokens: Map<string, RefreshTokenRecord> = new Map();

  async initialize(): Promise<void> {
    try {
      // 1. Automatically create database if it does not exist
      const bootstrapConn = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
      });
      await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\`;`);
      await bootstrapConn.end();

      // 2. Connect pool to the newly ensured database
      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      const conn = await this.pool.getConnection();
      await this.createTables(conn);
      await this.seedMysqlUsers(conn);
      conn.release();
      this.isConnected = true;
      console.log('✅ [Auth Service] Connected to MySQL database:', config.database.database);
    } catch (err: any) {
      console.warn('⚠️ [Auth Service] MySQL unavailable (' + err.message + '). Using resilient in-memory storage for development.');
      this.isConnected = false;
      await this.seedMemoryUsers();
    }
  }

  private async seedMysqlUsers(conn: mysql.PoolConnection): Promise<void> {
    const [rows] = await conn.query<any[]>('SELECT COUNT(*) as count FROM users');
    if (rows[0]?.count === 0) {
      const studentPass = await bcrypt.hash('Student123!', 10);
      const instructorPass = await bcrypt.hash('Instructor123!', 10);
      const adminPass = await bcrypt.hash('Admin123!', 10);

      await conn.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, preferred_terminal_theme) VALUES
         ('11111111-1111-1111-1111-111111111111', 'student@cloudlab.local', ?, 'Alex', 'DevOps', 'STUDENT', 'ACTIVE', 'cyberpunk'),
         ('22222222-2222-2222-2222-222222222222', 'instructor@cloudlab.local', ?, 'Sarah', 'Architect', 'INSTRUCTOR', 'ACTIVE', 'dracula'),
         ('33333333-3333-3333-3333-333333333333', 'admin@cloudlab.local', ?, 'Root', 'Administrator', 'ADMIN', 'ACTIVE', 'matrix')`,
        [studentPass, instructorPass, adminPass]
      );
    }
  }

  private async createTables(conn: mysql.PoolConnection): Promise<void> {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(500),
        role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        bio TEXT,
        github_url VARCHAR(255),
        linkedin_url VARCHAR(255),
        preferred_terminal_theme VARCHAR(50) DEFAULT 'dracula',
        email_verification_token VARCHAR(100),
        email_verification_expires DATETIME,
        password_reset_token VARCHAR(100),
        password_reset_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  private async seedMemoryUsers(): Promise<void> {
    const studentPass = await bcrypt.hash('Student123!', 10);
    const instructorPass = await bcrypt.hash('Instructor123!', 10);
    const adminPass = await bcrypt.hash('Admin123!', 10);
    const users: UserRecord[] = [
      { id: '11111111-1111-1111-1111-111111111111', email: 'student@cloudlab.local', password_hash: studentPass, first_name: 'Alex', last_name: 'DevOps', role: UserRole.STUDENT, status: UserStatus.ACTIVE, bio: 'Aspiring Cloud & DevOps Engineer', preferred_terminal_theme: 'cyberpunk', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-222222222222', email: 'instructor@cloudlab.local', password_hash: instructorPass, first_name: 'Sarah', last_name: 'Architect', role: UserRole.INSTRUCTOR, status: UserStatus.ACTIVE, bio: 'Senior Kubernetes Instructor & Author', preferred_terminal_theme: 'dracula', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '33333333-3333-3333-3333-333333333333', email: 'admin@cloudlab.local', password_hash: adminPass, first_name: 'Root', last_name: 'Administrator', role: UserRole.ADMIN, status: UserStatus.ACTIVE, bio: 'CloudLab Platform Admin', preferred_terminal_theme: 'matrix', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    users.forEach((u) => this.memoryUsers.set(u.email.toLowerCase(), u));
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const e = email.toLowerCase().trim();
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [e]);
      return rows.length ? rows[0] : null;
    }
    return this.memoryUsers.get(e) || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      return rows.length ? rows[0] : null;
    }
    for (const u of this.memoryUsers.values()) if (u.id === id) return u;
    return null;
  }

  async findByVerificationToken(token: string): Promise<UserRecord | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users WHERE email_verification_token = ? LIMIT 1', [token]);
      return rows.length ? rows[0] : null;
    }
    for (const u of this.memoryUsers.values()) if (u.email_verification_token === token) return u;
    return null;
  }

  async findByPasswordResetToken(token: string): Promise<UserRecord | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users WHERE password_reset_token = ? LIMIT 1', [token]);
      return rows.length ? rows[0] : null;
    }
    for (const u of this.memoryUsers.values()) if (u.password_reset_token === token) return u;
    return null;
  }

  async createUser(data: { email: string; passwordHash: string; firstName: string; lastName: string; role?: UserRole; verificationToken: string; verificationExpires: Date; avatarUrl?: string; }): Promise<UserRecord> {
    const id = uuidv4();
    const role = data.role || UserRole.STUDENT;
    const now = new Date().toISOString();
    const record: UserRecord = { id, email: data.email.toLowerCase().trim(), password_hash: data.passwordHash, first_name: data.firstName.trim(), last_name: data.lastName.trim(), avatar_url: data.avatarUrl, role, status: UserStatus.PENDING, email_verification_token: data.verificationToken, email_verification_expires: data.verificationExpires, created_at: now, updated_at: now };
    if (this.isConnected && this.pool) {
      await this.pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, avatar_url, role, status, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, record.email, record.password_hash, record.first_name, record.last_name, record.avatar_url ?? null, role, UserStatus.PENDING, data.verificationToken, data.verificationExpires]
      );
    } else {
      this.memoryUsers.set(record.email, record);
    }
    return record;
  }

  async activateUser(id: string): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query(`UPDATE users SET status = 'ACTIVE' WHERE id = ?`, [id]);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          u.status = UserStatus.ACTIVE;
          break;
        }
      }
    }
  }

  async saveVerificationToken(id: string, token: string, expires: Date): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?', [token, expires, id]);
    } else {
      for (const u of this.memoryUsers.values()) { if (u.id === id) { u.email_verification_token = token; u.email_verification_expires = expires; break; } }
    }
  }

  async savePasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?', [token, expires, id]);
    } else {
      for (const u of this.memoryUsers.values()) { if (u.id === id) { u.password_reset_token = token; u.password_reset_expires = expires; break; } }
    }
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?', [newPasswordHash, id]);
    } else {
      for (const u of this.memoryUsers.values()) { if (u.id === id) { u.password_hash = newPasswordHash; u.password_reset_token = undefined; u.password_reset_expires = undefined; break; } }
    }
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const id = uuidv4();
    if (this.isConnected && this.pool) {
      await this.pool.query('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)', [id, userId, token, expiresAt]);
    } else {
      this.memoryTokens.set(token, { id, user_id: userId, token, expires_at: expiresAt, revoked: false });
    }
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = FALSE LIMIT 1', [token]);
      return rows.length ? rows[0] : null;
    }
    const rec = this.memoryTokens.get(token);
    return rec && !rec.revoked ? rec : null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?', [token]);
    } else {
      const rec = this.memoryTokens.get(token);
      if (rec) rec.revoked = true;
    }
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [userId]);
    } else {
      for (const rec of this.memoryTokens.values()) {
        if (rec.user_id === userId) rec.revoked = true;
      }
    }
  }

  async findAllUsers(): Promise<UserRecord[]> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users ORDER BY created_at DESC');
      return rows;
    }
    return Array.from(this.memoryUsers.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<void> {
    const now = new Date().toISOString();
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          u.status = status;
          u.updated_at = now;
          break;
        }
      }
    }
  }

  async updateUserRole(id: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, now, id]);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          u.role = role;
          u.updated_at = now;
          break;
        }
      }
    }
  }

  async updateProfile(
    id: string,
    data: { firstName?: string; lastName?: string; bio?: string; githubUrl?: string; linkedinUrl?: string; preferredTerminalTheme?: string },
  ): Promise<void> {
    const now = new Date().toISOString();
    if (this.isConnected && this.pool) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (data.firstName !== undefined) { sets.push('first_name = ?'); vals.push(data.firstName.trim()); }
      if (data.lastName !== undefined) { sets.push('last_name = ?'); vals.push(data.lastName.trim()); }
      if (data.bio !== undefined) { sets.push('bio = ?'); vals.push(data.bio); }
      if (data.githubUrl !== undefined) { sets.push('github_url = ?'); vals.push(data.githubUrl); }
      if (data.linkedinUrl !== undefined) { sets.push('linkedin_url = ?'); vals.push(data.linkedinUrl); }
      if (data.preferredTerminalTheme !== undefined) { sets.push('preferred_terminal_theme = ?'); vals.push(data.preferredTerminalTheme); }
      if (sets.length === 0) return;
      sets.push('updated_at = ?'); vals.push(now); vals.push(id);
      await this.pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          if (data.firstName !== undefined) u.first_name = data.firstName.trim();
          if (data.lastName !== undefined) u.last_name = data.lastName.trim();
          if (data.bio !== undefined) u.bio = data.bio;
          if (data.githubUrl !== undefined) u.github_url = data.githubUrl;
          if (data.linkedinUrl !== undefined) u.linkedin_url = data.linkedinUrl;
          if (data.preferredTerminalTheme !== undefined) u.preferred_terminal_theme = data.preferredTerminalTheme;
          u.updated_at = now;
          break;
        }
      }
    }
  }

  async updateAvatarUrl(id: string, avatarUrl: string): Promise<void> {
    const now = new Date().toISOString();
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [avatarUrl, now, id]);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          u.avatar_url = avatarUrl;
          u.updated_at = now;
          break;
        }
      }
    }
  }

  toUserDto(user: UserRecord): UserDto {
    const profile: UserProfileDto = { bio: user.bio, githubUrl: user.github_url, linkedinUrl: user.linkedin_url, preferredTerminalTheme: user.preferred_terminal_theme || 'dracula' };
    return { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, avatarUrl: user.avatar_url, role: user.role, status: user.status, profile, createdAt: user.created_at, updatedAt: user.updated_at };
  }
}

export const authRepository = new AuthRepository();
