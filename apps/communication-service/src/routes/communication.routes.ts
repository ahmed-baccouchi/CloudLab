import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@cloudlab/shared-types';
import { config } from '../config';

import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
} from '../controllers/announcements.controller';

import {
  getCategories,
  createCategory,
  getDiscussions,
  getDiscussionById,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  solveDiscussion,
} from '../controllers/forum.controller';

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notifications.controller';

import { handleAiChat } from '../controllers/ai.controller';

export const communicationRoutes = Router();

/**
 * Flexible auth extractor for communication-service:
 * 1. Checks forwarded API Gateway headers (x-user-id, x-user-role, etc.)
 * 2. Checks direct Bearer JWT token if headers not present
 */
const extractUser = (req: any) => {
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    return {
      id: gatewayUserId as string,
      email: (req.headers['x-user-email'] as string) || '',
      role: (req.headers['x-user-role'] as string) || 'STUDENT',
      firstName: decodeURIComponent((req.headers['x-user-firstname'] as string) || ''),
      lastName: decodeURIComponent((req.headers['x-user-lastname'] as string) || ''),
    };
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      return {
        id: decoded.sub || decoded.id,
        email: decoded.email || '',
        role: decoded.role || 'STUDENT',
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
      };
    } catch {
      return null;
    }
  }
  return null;
};

const auth = (req: any, res: any, next: any) => {
  const user = extractUser(req);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication token required (Bearer <token>)',
    });
    return;
  }
  req.user = user;
  next();
};

const optAuth = (req: any, _res: any, next: any) => {
  const user = extractUser(req);
  if (user) {
    req.user = user;
  }
  next();
};

const checkRole = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
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

// ------------------- ANNOUNCEMENTS -------------------
communicationRoutes.get('/announcements', optAuth, getAnnouncements);
communicationRoutes.get('/announcements/:id', optAuth, getAnnouncementById);
communicationRoutes.post('/announcements', auth, checkRole(UserRole.INSTRUCTOR, UserRole.ADMIN), createAnnouncement);
communicationRoutes.patch('/announcements/:id', auth, checkRole(UserRole.INSTRUCTOR, UserRole.ADMIN), updateAnnouncement);
communicationRoutes.delete('/announcements/:id', auth, checkRole(UserRole.INSTRUCTOR, UserRole.ADMIN), deleteAnnouncement);
communicationRoutes.patch('/announcements/:id/read', auth, markAnnouncementRead);

// ------------------- FORUM CATEGORIES -------------------
communicationRoutes.get('/forum/categories', getCategories);
communicationRoutes.post('/forum/categories', auth, checkRole(UserRole.ADMIN), createCategory);

// ------------------- FORUM DISCUSSIONS -------------------
communicationRoutes.get('/forum/discussions', optAuth, getDiscussions);
communicationRoutes.get('/forum/discussions/:id', optAuth, getDiscussionById);
communicationRoutes.post('/forum/discussions', auth, createDiscussion);
communicationRoutes.patch('/forum/discussions/:id', auth, updateDiscussion);
communicationRoutes.delete('/forum/discussions/:id', auth, deleteDiscussion);
communicationRoutes.patch('/forum/discussions/:id/solve', auth, solveDiscussion);

// ------------------- FORUM COMMENTS -------------------
communicationRoutes.get('/forum/discussions/:id/comments', optAuth, getComments);
communicationRoutes.post('/forum/discussions/:id/comments', auth, addComment);
communicationRoutes.patch('/forum/comments/:id', auth, updateComment);
communicationRoutes.delete('/forum/comments/:id', auth, deleteComment);

// ------------------- NOTIFICATIONS -------------------
communicationRoutes.get('/notifications', auth, getNotifications);
communicationRoutes.get('/notifications/unread-count', auth, getUnreadCount);
communicationRoutes.patch('/notifications/read-all', auth, markAllNotificationsRead);
communicationRoutes.patch('/notifications/:id/read', auth, markNotificationRead);

// ------------------- AI ASSISTANT -------------------
communicationRoutes.post('/ai/chat', optAuth, handleAiChat);
