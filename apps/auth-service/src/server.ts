import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { authRepository } from './db/auth.repository';
import { authRoutes } from './routes/auth.routes';

const app = express();

// Ensure the avatars upload directory exists on startup
try {
  if (!fs.existsSync(config.avatarsDir)) {
    fs.mkdirSync(config.avatarsDir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ [Auth Service] Could not create avatars directory:', e);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatars as static files
// Cross-Origin-Resource-Policy must be set so browsers allow cross-origin image loads.
// IMPORTANT: avatars use no-cache (revalidate) because newly uploaded files should
// appear immediately — otherwise a 1-year max-age keeps the old avatar forever.
const avatarStaticOptions: Parameters<typeof express.static>[1] = {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  },
};
const otherUploadsStaticOptions: Parameters<typeof express.static>[1] = {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  },
};
app.use('/uploads/avatars', express.static(config.avatarsDir, avatarStaticOptions));
app.use('/uploads', express.static(path.resolve(config.avatarsDir, '..'), otherUploadsStaticOptions));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/', authRoutes);

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Endpoint not found on Auth Service',
  });
});

export const startServer = async () => {
  await authRepository.initialize();
  const server = app.listen(config.port, () => {
    console.log(`🚀 [Auth Service] Running on http://localhost:${config.port}`);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

export default app;
