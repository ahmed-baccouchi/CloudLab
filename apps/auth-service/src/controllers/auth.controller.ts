import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthService, EmailNotVerifiedError } from '../services/auth.service';
import { RegisterDto, LoginDto, UserRole, UserStatus } from '@cloudlab/shared-types';
import { AuthenticatedRequest } from '@cloudlab/shared-auth';
import { config } from '../config';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const dto: RegisterDto = req.body;
      if (!dto.email || !dto.password || !dto.firstName || !dto.lastName) {
        // Clean up any uploaded file before rejecting
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email, password, firstName, and lastName are required fields',
        });
        return;
      }

      // If a file was uploaded, build the avatar URL
      const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

      const result = await AuthService.register(dto, avatarUrl);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDto = req.body;
      if (!dto.email || !dto.password) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email and password are required',
        });
        return;
      }

      const result = await AuthService.login(dto);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError || err.code === 'EMAIL_NOT_VERIFIED') {
        res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          error: 'Forbidden',
          message: err.message,
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: err.message,
      });
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = (req.query.token || req.body.token) as string;
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Verification token is required',
        });
        return;
      }

      const result = await AuthService.verifyEmail(token);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email is required',
        });
        return;
      }

      const result = await AuthService.resendVerification(email);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email is required',
        });
        return;
      }

      const result = await AuthService.forgotPassword(email);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Token and newPassword are required',
        });
        return;
      }

      const result = await AuthService.resetPassword(token, newPassword);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'refreshToken is required',
        });
        return;
      }

      const result = await AuthService.refresh(refreshToken);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: err.message,
      });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const user = await AuthService.getMe(userId);
      res.json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: err.message,
      });
    }
  }

  static async adminListUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
        });
        return;
      }

      const users = await AuthService.adminListUsers();
      res.json({
        success: true,
        data: users,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async adminUpdateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
        });
        return;
      }

      const userId = req.params.userId;
      const status = req.body.status;
      if (!userId || !status) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'userId and status are required',
        });
        return;
      }

      if (![UserStatus.ACTIVE, UserStatus.SUSPENDED].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid status. Allowed: ACTIVE, SUSPENDED',
        });
        return;
      }

      const user = await AuthService.adminUpdateUserStatus(userId, status);
      res.json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async adminUpdateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
        });
        return;
      }

      const userId = req.params.userId;
      const role = req.body.role;
      if (!userId || !role) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'userId and role are required',
        });
        return;
      }

      if (![UserRole.STUDENT, UserRole.ADMIN].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid role. Allowed: STUDENT, ADMIN (INSTRUCTOR promotion is disabled per policy)',
        });
        return;
      }

      const user = await AuthService.adminUpdateUserRole(userId, role);
      res.json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: err.message,
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const refreshToken = req.body?.refreshToken;

      // Always invalidate the provided refresh token if given, even without a
      // valid JWT user. This lets a client clear session state regardless of
      // whether the current access token is still valid (e.g. after a manual
      // role change in MySQL, or after a token expiry race).
      if (refreshToken) {
        try {
          await AuthService.invalidateRefreshTokenOnly(refreshToken);
        } catch (_) {
          // ignore invalidation errors — the logout call must still succeed
        }
      }

      // If we have a valid user (access token or internal auth was valid),
      // revoke all their refresh tokens as well.
      if (userId) {
        try {
          await AuthService.logout(userId, undefined);
        } catch (_) {
          // ignore per-user revocation errors on best-effort basis
        }
      }

      res.json({
        success: true,
        data: {
          message:
            'Logged out successfully. Session has been cleared on the client; server-side tokens invalidated where possible.',
          invalidatedRefreshToken: !!refreshToken,
          invalidatedUserSessions: !!userId,
        },
      });
    } catch (err: any) {
      // Never expose an error for logout — idempotent client-side cleanup.
      res.json({
        success: true,
        data: {
          message: 'Logout acknowledged (client-side only).',
          invalidatedRefreshToken: false,
          invalidatedUserSessions: false,
          warning: err?.message,
        },
      });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      const { firstName, lastName, bio, githubUrl, linkedinUrl, preferredTerminalTheme } = req.body;
      const user = await AuthService.updateProfile(userId, {
        firstName,
        lastName,
        bio,
        githubUrl,
        linkedinUrl,
        preferredTerminalTheme,
      });

      // Expose the actual avatar URL stored in the database row, post-update,
      // so the frontend can trust this value instead of a cached one.
      res.json({
        success: true,
        data: user,
        meta: {
          persistedAvatarUrl: user.avatarUrl || null,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: 'Bad Request', message: err.message });
    }
  }

  static async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'No image file provided' });
        return;
      }

      // Build the public URL for the uploaded avatar
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const user = await AuthService.updateAvatar(userId, avatarUrl);

      // Return both the intended URL and the actual value stored in the DB row
      // so the client and the operator can confirm the row was updated.
      res.json({
        success: true,
        data: { avatarUrl, user },
        meta: {
          persistedAvatarUrl: user.avatarUrl || null,
          storedFilename: req.file.filename,
          fileSize: req.file.size,
        },
      });
    } catch (err: any) {
      // Clean up uploaded file on error
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
    }
  }

  static async deleteAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      const user = await AuthService.updateAvatar(userId, '');

      res.json({
        success: true,
        data: { user },
        meta: {
          persistedAvatarUrl: user.avatarUrl || null,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: 'Bad Request', message: err.message });
    }
  }
}
