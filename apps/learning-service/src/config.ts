import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.LEARNING_SERVICE_PORT || '4002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'cloudlab-jwt-secret-dev-key',
  internalSecret: process.env.INTERNAL_API_SECRET || 'cloudlab-internal-gateway-secret-token',
  progressServiceInternalUrl: process.env.PROGRESS_SERVICE_URL || 'http://localhost:4004',
  uploadsDir: path.resolve(__dirname, '../../../uploads/learning-resources'),
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai', // openai, anthropic, etc.
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER ?? 'cloudlab',
    password: process.env.DATABASE_PASSWORD ?? 'cloudlabpassword',
    database: 'cloudlab_learning',
  },
};
