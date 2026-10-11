import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';

export const handleAiChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'A non-empty messages array is required for AI chat',
      });
      return;
    }

    const response = await aiService.handleChat({ messages, context });
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'AI Provider Error',
      message: err.message || 'Failed to process AI chat query',
    });
  }
};
