import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@cloudlab/shared-types';

export const authenticateJwt = (jwtSecret: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authorization token is required (Bearer <token>)',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
      };
      next();
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token signature',
      });
      return;
    }
  };
};

export const optionalAuth = (jwtSecret: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
        };
      } catch {
        // Silently ignore token errors for optional auth routes
      }
    }
    next();
  };
};
