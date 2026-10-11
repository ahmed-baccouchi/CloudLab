export type AnnouncementType = 'GENERAL' | 'COURSE' | 'PROJECT' | 'EVENT' | 'IMPORTANT';
export type AnnouncementTargetAudience = 'ALL' | 'STUDENTS' | 'INSTRUCTORS' | 'COURSE' | 'PROJECT';

export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  type: AnnouncementType;
  targetAudience: AnnouncementTargetAudience;
  targetId?: string;
  isPublished: boolean;
  publicationDate: string;
  attachmentUrl?: string;
  readByUserIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: AnnouncementType;
  targetAudience: AnnouncementTargetAudience;
  targetId?: string;
  isPublished?: boolean;
  attachmentUrl?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  targetAudience?: AnnouncementTargetAudience;
  targetId?: string;
  isPublished?: boolean;
  attachmentUrl?: string;
}

export interface ForumCategoryDto {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
  createdAt: string;
}

export type DiscussionStatus = 'OPEN' | 'SOLVED' | 'CLOSED';

export interface DiscussionDto {
  id: string;
  categoryId: string;
  categoryName?: string;
  authorId: string;
  authorName: string;
  authorRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  title: string;
  content: string;
  status: DiscussionStatus;
  acceptedCommentId?: string;
  viewsCount: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscussionDto {
  categoryId: string;
  title: string;
  content: string;
}

export interface UpdateDiscussionDto {
  title?: string;
  content?: string;
  status?: DiscussionStatus;
  acceptedCommentId?: string;
}

export interface CommentDto {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  authorRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  content: string;
  isAcceptedAnswer: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  content: string;
}

export interface UpdateCommentDto {
  content: string;
}

export type NotificationType = 'ANNOUNCEMENT' | 'FORUM_REPLY' | 'FORUM_SOLVED' | 'PROJECT_EVENT' | 'SYSTEM';

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  linkUrl?: string;
}

export interface AiChatMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AiChatRequestDto {
  messages: AiChatMessageDto[];
  context?: {
    courseId?: string;
    projectId?: string;
  };
}

export interface AiChatResponseDto {
  message: AiChatMessageDto;
}
