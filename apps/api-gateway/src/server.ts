import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { setupProxyRoutes } from './proxy/proxy.routes';

const app = express();

// Monorepo-wide uploads directory, shared by all services (avatars, course resources,
// project evidence, etc.). The gateway is the single public origin so the frontend
// uses one host (gateway host) for everything, avoiding CORS and broken-image issues
// when services run on different internal ports.
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  ['avatars', 'resources', 'project-evidence'].forEach((sub) => {
    const d = path.join(UPLOADS_DIR, sub);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
} catch (e) {
  console.warn('⚠️ [Gateway] Failed to ensure uploads directory:', e);
}

const avatarStaticOptions: Parameters<typeof express.static>[1] = {
  setHeaders: (res) => {
    // Avatar files change frequently after upload — serve no-cache so the browser
    // always revalidates, and the frontend adds a ?v= cache-bust query too.
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
};
const otherUploadsStaticOptions: Parameters<typeof express.static>[1] = {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
};
// Mount avatar subpath first with its stricter cache headers.
app.use('/uploads/avatars', express.static(path.join(UPLOADS_DIR, 'avatars'), avatarStaticOptions));
// Then everything else under uploads (resources, project-evidence, ...)
app.use('/uploads', express.static(UPLOADS_DIR, otherUploadsStaticOptions));

// Security and CORS
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: true, // Allow frontend dev server
    credentials: true,
  }),
);

// Rate limiting (relaxed for local development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    port: config.port,
    downstream: config.services,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Setup proxy routes
setupProxyRoutes(app);

// Global fallback for unrouted API calls
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'API route not recognized by API Gateway',
  });
});

export const startGateway = () => {
  return app.listen(config.port, () => {
    console.log(`🌐 [API Gateway] Listening on http://localhost:${config.port}`);
    console.log(`🔗 Proxying services:`);
    console.log(`   - Auth:      ${config.services.auth}`);
    console.log(`   - Learning:  ${config.services.learning}`);
    console.log(`   - Projects:  ${config.services.project} (/api/v1/projects)`);
    console.log(`   - Challenge: ${config.services.challenge}`);
    console.log(`   - Progress:  ${config.services.progress}`);
    console.log(`   - Communication: ${config.services.communication} (/api/v1/communication)`);
  });
};


if (require.main === module) {
  startGateway();
}

export default app;
