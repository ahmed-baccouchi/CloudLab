import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PROJECT_SERVICE_PORT || '4005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'cloudlab-jwt-secret-dev-key',
  internalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  schedulerApiUrl: process.env.SCHEDULER_API_URL || '',
  schedulerApiKey: process.env.SCHEDULER_API_KEY || '',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  progressServiceUrl: process.env.PROGRESS_SERVICE_URL || 'http://localhost:4004',
  gatewayInternalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  database: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER ?? 'cloudlab',
    password: process.env.DATABASE_PASSWORD ?? 'cloudlabpassword',
    database: 'cloudlab_projects',
  },

};
