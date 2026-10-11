import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '@cloudlab/shared-types';

export const gatewayAuthMiddleware = (options: { required?: boolean } = { required: false }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Inject internal gateway secret for microservice-to-microservice trust
    req.headers['x-internal-secret'] = config.internalSecret;

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (options.required) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication token required (Bearer <token>)',
        });
        return;
      }
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

      // Attach verified claims into forwarding headers
      req.headers['x-user-id'] = decoded.sub;
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-role'] = decoded.role;
      req.headers['x-user-firstname'] = encodeURIComponent(decoded.firstName || '');
      req.headers['x-user-lastname'] = encodeURIComponent(decoded.lastName || '');

      next();
    } catch (err: any) {
      if (options.required) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token signature',
        });
        return;
      }
      // If optional, proceed without claims
      next();
    }
  };
};
