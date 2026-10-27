import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Router } from 'express';
import { config } from '../config';
import { gatewayAuthMiddleware } from '../middleware/auth-proxy.middleware';

export const setupProxyRoutes = (app: Router): void => {
  const commonOptions: Partial<Options> = {
    changeOrigin: true,
    on: {
      error: (err, _req, res: any) => {
        if (res && !res.headersSent && typeof res.status === 'function') {
          res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'The requested microservice is currently unreachable',
            details: err.message,
          });
        }
      },
    },
  };

  // 1. Auth Service Proxy (public endpoints + token verification for /me)
  app.use(
    '/api/v1/auth',
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.auth,
      pathRewrite: { '^/api/v1/auth': '/api/v1/auth' },
      ...commonOptions,
    }),
  );

  // 2. Learning Service Proxy (optional auth for catalog, authenticated for quizzes)
  app.use(
    '/api/v1/learning',
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.learning,
      pathRewrite: { '^/api/v1/learning': '/api/v1/learning' },
      ...commonOptions,
    }),
  );

  // 3. Challenge Service Proxy (optional auth for list, auth required for attempts/validations)
  app.use(
    '/api/v1/challenges',
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.challenge,
      pathRewrite: { '^/api/v1/challenges': '/api/v1/challenges' },
      ...commonOptions,
    }),
  );

  // 4. Progress Service Proxy (leaderboard public, user progress requires auth)
  app.use(
    '/api/v1/progress',
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.progress,
      pathRewrite: { '^/api/v1/progress': '/api/v1/progress' },
      ...commonOptions,
    }),
  );

  // 5. Projects Proxy → dedicated project-service on port 4005
  app.use(
    '/api/v1/projects',
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.project,
      pathRewrite: { '^/api/v1/projects': '/api/v1/projects' },
      ...commonOptions,
    }),
  );

  // 6. Communication Service Proxy → dedicated communication-service on port 4006
  app.use(
    ['/api/v1/communication', '/api/v1/announcements', '/api/v1/forum', '/api/v1/notifications', '/api/v1/ai'],
    gatewayAuthMiddleware({ required: false }),
    createProxyMiddleware({
      target: config.services.communication,
      pathRewrite: (pathStr) => {
        if (pathStr.startsWith('/api/v1/communication')) return pathStr;
        return `/api/v1/communication${pathStr.replace('/api/v1', '')}`;
      },
      ...commonOptions,
    }),
  );

  // 7. WebSocket Proxy for real-time notifications
  app.use(
    '/ws/notifications',
    createProxyMiddleware({
      target: config.services.communication,
      ws: true,
      ...commonOptions,
    })
  );

  // 8. Avatar static files — MUST be registered before generic /uploads to take priority
  app.use(
    '/uploads/avatars',
    createProxyMiddleware({
      target: config.services.auth,
      pathRewrite: { '^/uploads/avatars': '/uploads/avatars' },
      ...commonOptions,
    }),
  );

  // 9. Uploaded Static Files Proxy (serve PDFs/resources through learning service)
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: config.services.learning,
      pathRewrite: { '^/uploads': '/uploads' },
      ...commonOptions,
    }),
  );
};

