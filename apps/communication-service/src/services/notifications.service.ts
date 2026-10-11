import { communicationRepository } from '../db/communication.repository';
import { CreateNotificationDto, NotificationDto } from '@cloudlab/shared-types';
import { notificationSocketServer } from '../websocket/socket.server';

export class NotificationsService {
  async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    return communicationRepository.getNotifications(userId);
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await communicationRepository.getUnreadCount(userId);
    return { count };
  }

  async createNotification(dto: CreateNotificationDto): Promise<NotificationDto> {
    const notification = await communicationRepository.createNotification(dto);
    notificationSocketServer.sendToUser(dto.userId, notification);
    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    return communicationRepository.markNotificationRead(id, userId);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await communicationRepository.markAllNotificationsRead(userId);
    return { count };
  }
}

export const notificationsService = new NotificationsService();
