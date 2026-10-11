import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@cloudlab/shared-types';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required before checking permissions',
      });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required roles: [${allowedRoles.join(', ')}]. Current role: [${req.user.role}]`,
      });
      return;
    }

    next();
  };
};
