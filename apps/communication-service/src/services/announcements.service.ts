import { communicationRepository } from '../db/communication.repository';
import {
  AnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@cloudlab/shared-types';
import { notificationsService } from './notifications.service';

export class AnnouncementsService {
  async getAnnouncements(filters?: { targetAudience?: string; targetId?: string; isPublished?: boolean }): Promise<AnnouncementDto[]> {
    return communicationRepository.getAnnouncements(filters);
  }

  async getAnnouncementById(id: string): Promise<AnnouncementDto | null> {
    return communicationRepository.getAnnouncementById(id);
  }

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<AnnouncementDto> {
    const ann = await communicationRepository.createAnnouncement(dto, author);

    // If published, trigger a notification for users (or sample notification)
    if (ann.isPublished) {
      // In production/monorepo, notification can be triggered for target users
      await notificationsService.createNotification({
        userId: author.id, // Self confirmation notification
        type: 'ANNOUNCEMENT',
        title: `Announcement Published: ${ann.title}`,
        message: ann.content.substring(0, 120) + (ann.content.length > 120 ? '...' : ''),
        referenceId: ann.id,
        linkUrl: `/communication/announcements/${ann.id}`,
      });
    }

    return ann;
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    user: { id: string; role: string }
  ): Promise<AnnouncementDto> {
    const existing = await communicationRepository.getAnnouncementById(id);
    if (!existing) {
      throw new Error('Announcement not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only edit your own announcements');
    }

    const updated = await communicationRepository.updateAnnouncement(id, dto);
    if (!updated) {
      throw new Error('Failed to update announcement');
    }
    return updated;
  }

  async deleteAnnouncement(id: string, user: { id: string; role: string }): Promise<boolean> {
    const existing = await communicationRepository.getAnnouncementById(id);
    if (!existing) {
      throw new Error('Announcement not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only delete your own announcements');
    }

    return communicationRepository.deleteAnnouncement(id);
  }

  async markAsRead(id: string, userId: string): Promise<AnnouncementDto> {
    const res = await communicationRepository.markAnnouncementRead(id, userId);
    if (!res) {
      throw new Error('Announcement not found');
    }
    return res;
  }
}

export const announcementsService = new AnnouncementsService();
