import express from 'express';
import cors from 'cors';
import { config } from './config';
import { projectsRepository } from './db/projects.repository';
import { projectRoutes } from './routes/projects.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'project-service',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Mount routes at three paths to handle both:
 * 1. Direct calls:         GET http://localhost:4005/api/v1/projects
 * 2. Gateway with prefix:  GET http://localhost:4005/projects  (if rewritten)
 * 3. Gateway stripped:     GET http://localhost:4005/           (Express strips /api/v1/projects prefix before proxying)
 *
 * This mirrors the pattern used by auth-service, learning-service, etc.
 */
app.use('/api/v1/projects', projectRoutes);
app.use('/projects', projectRoutes);
app.use('/', projectRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Endpoint not found on Project Service',
  });
});

export const startServer = async () => {
  await projectsRepository.initialize();
  const server = app.listen(config.port, () => {
    console.log(`🚀 [Project Service] Running on http://localhost:${config.port}`);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

export default app;
