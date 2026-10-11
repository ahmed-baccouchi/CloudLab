import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.GATEWAY_PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'cloudlab-jwt-secret-dev-key',
  internalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    learning: process.env.LEARNING_SERVICE_URL || 'http://localhost:4002',
    challenge: process.env.CHALLENGE_SERVICE_URL || 'http://localhost:4003',
    progress: process.env.PROGRESS_SERVICE_URL || 'http://localhost:4004',
    project: process.env.PROJECT_SERVICE_URL || 'http://localhost:4005',
    communication: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:4006',
  },
};

