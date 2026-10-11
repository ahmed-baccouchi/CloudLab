import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { internalAuthMiddleware, authenticateJwt } from '@cloudlab/shared-auth';
import { config } from '../config';
import { avatarUpload } from '../middleware/avatar-upload.middleware';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@cloudlab/shared-types';

const router = Router();

/**
 * Tolerant auth for logout only. Tries to attach req.user from JWT or internal-auth.
 * Never sends a 401 on auth failure — the logout controller must still run and
 * invalidate any provided refresh token, and always return success so the client
 * can safely clear its local session and redirect.
 */
const tolerantAuthForLogout = (req: any, _res: any, next: any) => {
  const authHeader = req.headers.authorization as string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
      };
      return next();
    } catch {
      // Token invalid or expired — still proceed with controller, but without user
    }
  }
  // Try internal-auth without requiring it to pass
  try {
    return internalAuthMiddleware({
      required: false,
      internalSecret: config.internalSecret,
    })(req, _res, next);
  } catch {
    return next();
  }
};

// Public Authentication Endpoints
router.post('/register', avatarUpload.single('avatar'), AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

// Email Verification & Password Recovery Endpoints
router.get('/verify-email', AuthController.verifyEmail);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Shared auth helper: prefer JWT if Authorization header is present,
// otherwise accept gateway internal-auth headers. Mirrors learning.routes style.
const authEither = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticateJwt(config.jwtSecret)(req, res, next);
  }
  return internalAuthMiddleware({ required: true, internalSecret: config.internalSecret })(req, res, next);
};

// Protected Profile Endpoint
router.get('/me', authEither, AuthController.getMe);

// Profile Update Endpoints (authenticated)
router.patch('/me/profile', authEither, AuthController.updateProfile);
router.post('/me/avatar', authEither, avatarUpload.single('avatar'), AuthController.uploadAvatar);
router.delete('/me/avatar', authEither, AuthController.deleteAvatar);

router.post('/logout', tolerantAuthForLogout, AuthController.logout);

// Admin User Management Endpoints
const adminAuth = authenticateJwt(config.jwtSecret);
router.get('/admin/users', adminAuth, AuthController.adminListUsers);
router.patch('/admin/users/:userId/status', adminAuth, AuthController.adminUpdateUserStatus);
router.patch('/admin/users/:userId/role', adminAuth, AuthController.adminUpdateUserRole);

export const authRoutes = router;
