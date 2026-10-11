import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { communicationRepository } from './db/communication.repository';
import { communicationRoutes } from './routes/communication.routes';
import { notificationSocketServer } from './websocket/socket.server';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'communication-service',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Mount routes at multiple path prefixes:
 * 1. Direct gateway proxy: /api/v1/communication
 * 2. Short prefix: /communication
 * 3. Root fallback for gateway path rewriting: /
 */
app.use('/api/v1/communication', communicationRoutes);
app.use('/communication', communicationRoutes);
app.use('/', communicationRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Endpoint not found on Communication Service',
  });
});

export const startServer = async () => {
  await communicationRepository.initialize();

  const server = http.createServer(app);

  // Attach real-time WebSocket notification server
  notificationSocketServer.initialize(server);

  server.listen(config.port, () => {
    console.log(`🚀 [Communication Service] Running on http://localhost:${config.port}`);
  });

  return server;
};

if (require.main === module) {
  startServer();
}

export default app;
