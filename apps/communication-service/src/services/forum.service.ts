import { communicationRepository } from '../db/communication.repository';
import {
  ForumCategoryDto,
  DiscussionDto,
  CreateDiscussionDto,
  UpdateDiscussionDto,
  CommentDto,
  CreateCommentDto,
  UpdateCommentDto,
} from '@cloudlab/shared-types';
import { notificationsService } from './notifications.service';

export class ForumService {
  async getCategories(): Promise<ForumCategoryDto[]> {
    return communicationRepository.getForumCategories();
  }

  async createCategory(name: string, description: string, icon?: string): Promise<ForumCategoryDto> {
    return communicationRepository.createForumCategory(name, description, icon);
  }

  async getDiscussions(filters?: { categoryId?: string; status?: string; search?: string }): Promise<DiscussionDto[]> {
    return communicationRepository.getDiscussions(filters);
  }

  async getDiscussionById(id: string, incrementViews = false): Promise<DiscussionDto | null> {
    return communicationRepository.getDiscussionById(id, incrementViews);
  }

  async createDiscussion(
    dto: CreateDiscussionDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<DiscussionDto> {
    if (!dto.categoryId || !dto.title || !dto.content) {
      throw new Error('Category, title, and content are required');
    }
    return communicationRepository.createDiscussion(dto, author);
  }

  async updateDiscussion(
    id: string,
    dto: UpdateDiscussionDto,
    user: { id: string; role: string }
  ): Promise<DiscussionDto> {
    const existing = await communicationRepository.getDiscussionById(id);
    if (!existing) {
      throw new Error('Discussion not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only edit your own discussion');
    }

    const updated = await communicationRepository.updateDiscussion(id, dto);
    if (!updated) {
      throw new Error('Failed to update discussion');
    }
    return updated;
  }

  async deleteDiscussion(id: string, user: { id: string; role: string }): Promise<boolean> {
    const existing = await communicationRepository.getDiscussionById(id);
    if (!existing) {
      throw new Error('Discussion not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only delete your own discussion');
    }

    return communicationRepository.deleteDiscussion(id);
  }

  async getComments(discussionId: string): Promise<CommentDto[]> {
    return communicationRepository.getCommentsByDiscussionId(discussionId);
  }

  async addComment(
    discussionId: string,
    dto: CreateCommentDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<CommentDto> {
    const discussion = await communicationRepository.getDiscussionById(discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    if (!dto.content || !dto.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    const comment = await communicationRepository.createComment(discussionId, dto, author);

    // Send notification to the discussion author if it's someone else replying!
    if (discussion.authorId !== author.id) {
      await notificationsService.createNotification({
        userId: discussion.authorId,
        type: 'FORUM_REPLY',
        title: `New reply on "${discussion.title.substring(0, 40)}..."`,
        message: `${author.name} replied: "${comment.content.substring(0, 100)}..."`,
        referenceId: discussion.id,
        linkUrl: `/communication/forum/discussions/${discussion.id}`,
      });
    }

    return comment;
  }

  async updateComment(
    id: string,
    dto: UpdateCommentDto,
    user: { id: string; role: string }
  ): Promise<CommentDto> {
    const existing = await communicationRepository.getCommentById(id);
    if (!existing) {
      throw new Error('Comment not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only edit your own comment');
    }

    const updated = await communicationRepository.updateComment(id, dto);
    if (!updated) {
      throw new Error('Failed to update comment');
    }
    return updated;
  }

  async deleteComment(id: string, user: { id: string; role: string }): Promise<boolean> {
    const existing = await communicationRepository.getCommentById(id);
    if (!existing) {
      throw new Error('Comment not found');
    }

    if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
      throw new Error('Forbidden: You can only delete your own comment');
    }

    return communicationRepository.deleteComment(id);
  }

  async markSolved(discussionId: string, acceptedCommentId: string | null, user: { id: string; role: string }): Promise<DiscussionDto> {
    const discussion = await communicationRepository.getDiscussionById(discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    if (user.role !== 'ADMIN' && discussion.authorId !== user.id) {
      throw new Error('Forbidden: Only the discussion author or admin can mark it solved');
    }

    await communicationRepository.setAcceptedComment(discussionId, acceptedCommentId);
    const updated = await communicationRepository.getDiscussionById(discussionId);
    if (!updated) {
      throw new Error('Failed to update discussion solved status');
    }

    // Notify comment author if their answer was accepted!
    if (acceptedCommentId) {
      const comment = await communicationRepository.getCommentById(acceptedCommentId);
      if (comment && comment.authorId !== user.id) {
        await notificationsService.createNotification({
          userId: comment.authorId,
          type: 'FORUM_SOLVED',
          title: `Answer accepted on "${discussion.title.substring(0, 40)}..."`,
          message: `Your reply was marked as the accepted answer!`,
          referenceId: discussion.id,
          linkUrl: `/communication/forum/discussions/${discussion.id}`,
        });
      }
    }

    return updated;
  }
}

export const forumService = new ForumService();
