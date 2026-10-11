import { Response } from 'express';
import { announcementsService } from '../services/announcements.service';

export const getAnnouncements = async (req: any, res: Response): Promise<void> => {
  try {
    const { targetAudience, targetId, isPublished } = req.query;
    const filterPublished = isPublished !== undefined ? isPublished === 'true' : req.user?.role === 'STUDENT' ? true : undefined;

    const list = await announcementsService.getAnnouncements({
      targetAudience: targetAudience as string,
      targetId: targetId as string,
      isPublished: filterPublished,
    });

    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const getAnnouncementById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ann = await announcementsService.getAnnouncementById(id);
    if (!ann) {
      res.status(404).json({ success: false, error: 'Not Found', message: 'Announcement not found' });
      return;
    }
    res.json({ success: true, data: ann });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const createAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { title, content, type, targetAudience, targetId, isPublished, attachmentUrl } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, error: 'Bad Request', message: 'Title and content are required' });
      return;
    }

    const name = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    const ann = await announcementsService.createAnnouncement(
      { title, content, type, targetAudience, targetId, isPublished, attachmentUrl },
      { id: req.user.id, name, role: req.user.role as any }
    );

    res.status(201).json({ success: true, data: ann });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const updateAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const ann = await announcementsService.updateAnnouncement(id, req.body, req.user);
    res.json({ success: true, data: ann });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const deleteAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    await announcementsService.deleteAnnouncement(id, req.user);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const markAnnouncementRead = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const ann = await announcementsService.markAsRead(id, req.user.id);
    res.json({ success: true, data: ann });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};
