import { apiClient } from './client';
import type {

  AnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  ForumCategoryDto,
  DiscussionDto,
  CreateDiscussionDto,
  UpdateDiscussionDto,
  CommentDto,
  CreateCommentDto,
  NotificationDto,
  AiChatRequestDto,
  AiChatResponseDto,
} from '@cloudlab/shared-types';


export const communicationApi = {
  // Announcements
  getAnnouncements: async (filters?: { targetAudience?: string; targetId?: string }) => {
    const res = await apiClient.get<{ success: boolean; data: AnnouncementDto[] }>('/communication/announcements', { params: filters });
    return res.data.data;
  },

  getAnnouncementById: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: AnnouncementDto }>(`/communication/announcements/${id}`);
    return res.data.data;
  },

  createAnnouncement: async (dto: CreateAnnouncementDto) => {
    const res = await apiClient.post<{ success: boolean; data: AnnouncementDto }>('/communication/announcements', dto);
    return res.data.data;
  },

  updateAnnouncement: async (id: string, dto: UpdateAnnouncementDto) => {
    const res = await apiClient.patch<{ success: boolean; data: AnnouncementDto }>(`/communication/announcements/${id}`, dto);
    return res.data.data;
  },

  deleteAnnouncement: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/communication/announcements/${id}`);
    return res.data;
  },

  markAnnouncementRead: async (id: string) => {
    const res = await apiClient.patch<{ success: boolean; data: AnnouncementDto }>(`/communication/announcements/${id}/read`);
    return res.data.data;
  },

  // Forum Categories
  getForumCategories: async () => {
    const res = await apiClient.get<{ success: boolean; data: ForumCategoryDto[] }>('/communication/forum/categories');
    return res.data.data;
  },

  // Forum Discussions
  getDiscussions: async (filters?: { categoryId?: string; status?: string; search?: string }) => {
    const res = await apiClient.get<{ success: boolean; data: DiscussionDto[] }>('/communication/forum/discussions', { params: filters });
    return res.data.data;
  },

  getDiscussionById: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: DiscussionDto }>(`/communication/forum/discussions/${id}`);
    return res.data.data;
  },

  createDiscussion: async (dto: CreateDiscussionDto) => {
    const res = await apiClient.post<{ success: boolean; data: DiscussionDto }>('/communication/forum/discussions', dto);
    return res.data.data;
  },

  updateDiscussion: async (id: string, dto: UpdateDiscussionDto) => {
    const res = await apiClient.patch<{ success: boolean; data: DiscussionDto }>(`/communication/forum/discussions/${id}`, dto);
    return res.data.data;
  },

  deleteDiscussion: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/communication/forum/discussions/${id}`);
    return res.data;
  },

  markDiscussionSolved: async (id: string, acceptedCommentId?: string) => {
    const res = await apiClient.patch<{ success: boolean; data: DiscussionDto }>(`/communication/forum/discussions/${id}/solve`, {
      acceptedCommentId,
    });
    return res.data.data;
  },

  // Forum Comments
  getComments: async (discussionId: string) => {
    const res = await apiClient.get<{ success: boolean; data: CommentDto[] }>(`/communication/forum/discussions/${discussionId}/comments`);
    return res.data.data;
  },

  addComment: async (discussionId: string, dto: CreateCommentDto) => {
    const res = await apiClient.post<{ success: boolean; data: CommentDto }>(`/communication/forum/discussions/${discussionId}/comments`, dto);
    return res.data.data;
  },

  updateComment: async (commentId: string, content: string) => {
    const res = await apiClient.patch<{ success: boolean; data: CommentDto }>(`/communication/forum/comments/${commentId}`, { content });
    return res.data.data;
  },

  deleteComment: async (commentId: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/communication/forum/comments/${commentId}`);
    return res.data;
  },

  // Notifications
  getNotifications: async () => {
    const res = await apiClient.get<{ success: boolean; data: NotificationDto[] }>('/communication/notifications');
    return res.data.data;
  },

  getUnreadCount: async () => {
    const res = await apiClient.get<{ success: boolean; data: { count: number } }>('/communication/notifications/unread-count');
    return res.data.data.count;
  },

  markNotificationRead: async (id: string) => {
    const res = await apiClient.patch<{ success: boolean }>(`/communication/notifications/${id}/read`);
    return res.data;
  },

  markAllNotificationsRead: async () => {
    const res = await apiClient.patch<{ success: boolean; data: { count: number } }>('/communication/notifications/read-all');
    return res.data.data;
  },

  // AI Assistant
  sendAiChatMessage: async (dto: AiChatRequestDto) => {
    const res = await apiClient.post<{ success: boolean; data: AiChatResponseDto }>('/communication/ai/chat', dto);
    return res.data.data;
  },
};
