import { Response } from 'express';
import { forumService } from '../services/forum.service';

export const getCategories = async (_req: any, res: Response): Promise<void> => {
  try {
    const list = await forumService.getCategories();
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const createCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !description) {
      res.status(400).json({ success: false, error: 'Bad Request', message: 'Name and description are required' });
      return;
    }
    const cat = await forumService.createCategory(name, description, icon);
    res.status(201).json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const getDiscussions = async (req: any, res: Response): Promise<void> => {
  try {
    const { categoryId, status, search } = req.query;
    const list = await forumService.getDiscussions({
      categoryId: categoryId as string,
      status: status as string,
      search: search as string,
    });
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const getDiscussionById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const discussion = await forumService.getDiscussionById(id, true);
    if (!discussion) {
      res.status(404).json({ success: false, error: 'Not Found', message: 'Discussion not found' });
      return;
    }
    res.json({ success: true, data: discussion });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const createDiscussion = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { categoryId, title, content } = req.body;
    const name = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;

    const disc = await forumService.createDiscussion(
      { categoryId, title, content },
      { id: req.user.id, name, role: req.user.role as any }
    );
    res.status(201).json({ success: true, data: disc });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Bad Request', message: err.message });
  }
};

export const updateDiscussion = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const disc = await forumService.updateDiscussion(id, req.body, req.user);
    res.json({ success: true, data: disc });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const deleteDiscussion = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    await forumService.deleteDiscussion(id, req.user);
    res.json({ success: true, message: 'Discussion deleted successfully' });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const getComments = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // discussionId
    const comments = await forumService.getComments(id);
    res.json({ success: true, data: comments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
  }
};

export const addComment = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params; // discussionId
    const { content } = req.body;
    const name = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;

    const comment = await forumService.addComment(
      id,
      { content },
      { id: req.user.id, name, role: req.user.role as any }
    );
    res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Bad Request', message: err.message });
  }
};

export const updateComment = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params; // commentId
    const comment = await forumService.updateComment(id, req.body, req.user);
    res.json({ success: true, data: comment });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const deleteComment = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params; // commentId
    await forumService.deleteComment(id, req.user);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};

export const solveDiscussion = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const { id } = req.params; // discussionId
    const { acceptedCommentId } = req.body;
    const disc = await forumService.markSolved(id, acceptedCommentId || null, req.user);
    res.json({ success: true, data: disc });
  } catch (err: any) {
    const status = err.message.startsWith('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: 'Error', message: err.message });
  }
};
