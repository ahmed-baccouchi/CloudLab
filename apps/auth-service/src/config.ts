import dotenv from 'dotenv';
import path from 'path';

// Load root .env or local
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.AUTH_SERVICE_PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'CloudLab',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'cloudlab-jwt-secret-dev-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '900s',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'cloudlab-refresh-secret-dev-key',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  internalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  avatarsDir: path.resolve(__dirname, '../../../uploads/avatars'),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER ?? 'cloudlab',
    password: process.env.DATABASE_PASSWORD ?? 'cloudlabpassword',
    database: 'cloudlab_auth',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim(),
    from: (process.env.SMTP_FROM || 'CloudLab <noreply@cloudlab.local>').trim(),
  },
};

