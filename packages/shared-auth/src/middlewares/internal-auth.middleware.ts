import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@cloudlab/shared-types';

export interface InternalAuthOptions {
  required?: boolean;
  internalSecret?: string;
}

export const internalAuthMiddleware = (options: InternalAuthOptions = { required: true }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Optional internal secret validation
    if (options.internalSecret) {
      const internalHeader = req.headers['x-internal-secret'];
      if (internalHeader !== options.internalSecret) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Invalid internal communication secret',
        });
        return;
      }
    }

    const userId = req.headers['x-user-id'] as string;
    const email = req.headers['x-user-email'] as string;
    const role = (req.headers['x-user-role'] as UserRole) || UserRole.STUDENT;
    const firstName = req.headers['x-user-firstname'] as string;
    const lastName = req.headers['x-user-lastname'] as string;

    if (userId) {
      req.user = {
        id: userId,
        email: email || '',
        role,
        firstName: firstName || '',
        lastName: lastName || '',
      };
    } else if (options.required) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing authenticated user context from gateway',
      });
      return;
    }

    next();
  };
};
