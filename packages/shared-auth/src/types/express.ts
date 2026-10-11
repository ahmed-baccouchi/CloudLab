import { Request } from 'express';
import { UserRole } from '@cloudlab/shared-types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
