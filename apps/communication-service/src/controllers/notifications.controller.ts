import { Response } from 'express';
import { notificationsService } from '../services/notifications.service';

export const getNotifications = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const list = await notificationsService.getUserNotifications(req.user.id);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const getUnreadCount = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const data = await notificationsService.getUnreadCount(req.user.id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const markNotificationRead = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const success = await notificationsService.markAsRead(id, req.user.id);
    res.json({ success, message: success ? 'Notification marked read' : 'Notification not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const markAllNotificationsRead = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const data = await notificationsService.markAllAsRead(req.user.id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};
