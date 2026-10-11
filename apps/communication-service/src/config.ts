import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.COMMUNICATION_SERVICE_PORT || '4006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'cloudlab-jwt-secret-dev-key',
  internalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  database: {
    host: process.env.MYSQL_HOST || process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.DATABASE_PORT || '3306', 10),
    user: process.env.MYSQL_USER || process.env.DATABASE_USER || 'cloudlab',
    password: process.env.MYSQL_PASSWORD ?? process.env.DATABASE_PASSWORD ?? 'cloudlabpassword',
    database: process.env.COMMUNICATION_DB_NAME || 'cloudlab_communication',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
  },
};
