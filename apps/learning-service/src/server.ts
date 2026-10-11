import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { learningRepository } from './db/learning.repository';
import { learningRoutes } from './routes/learning.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
try {
  if (!fs.existsSync(config.uploadsDir)) {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
    console.log('📁 [Learning Service] Created uploads directory:', config.uploadsDir);
  }
} catch (e: any) {
  console.warn('⚠️ [Learning Service] Could not create uploads directory:', e.message);
}

// Serve uploaded resource files statically FIRST (before any route handlers)
app.use('/uploads/learning-resources', express.static(config.uploadsDir));
app.use('/uploads', express.static(path.resolve(config.uploadsDir, '..')));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'learning-service',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes under explicit prefix and root (gateway strips /learning and forwards to root)
app.use('/api/v1/learning', learningRoutes);
app.use('/learning', learningRoutes);
app.use('/', learningRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Endpoint not found on Learning Service',
  });
});

export const startServer = async () => {
  await learningRepository.initialize();
  const server = app.listen(config.port, () => {
    console.log(`📚 [Learning Service] Running on http://localhost:${config.port}`);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

export default app;
