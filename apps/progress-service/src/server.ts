import express from 'express';
import cors from 'cors';
import { config } from './config';
import { progressRepository } from './db/progress.repository';
import { progressRoutes } from './routes/progress.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'progress-service',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/v1/progress', progressRoutes);
app.use('/', progressRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Endpoint not found on Progress Service',
  });
});

export const startServer = async () => {
  await progressRepository.initialize();
  const server = app.listen(config.port, () => {
    console.log(`🏆 [Progress Service] Running on http://localhost:${config.port}`);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

export default app;
