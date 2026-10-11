import { Request, Response } from 'express';
import { ProgressService } from '../services/progress.service';
import { SkillName } from '@cloudlab/shared-types';
import { AuthenticatedRequest } from '@cloudlab/shared-auth';

export class ProgressController {
  static async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || '11111111-1111-1111-1111-111111111111'; // Default to demo student if local
      const profile = await ProgressService.getUserProfile(userId);
      res.json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getLeaderboard(_req: Request, res: Response): Promise<void> {
    try {
      const leaderboard = await ProgressService.getLeaderboard();
      res.json({ success: true, data: leaderboard });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async recordEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventName, payload } = req.body;
      const userId = payload?.userId || req.user?.id;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId required' });
        return;
      }

      if (eventName === 'challenge.completed') {
        const updated = await ProgressService.recordChallengeSuccess(
          userId,
          payload.challengeId,
          (payload.category as SkillName) || SkillName.KUBERNETES,
          payload.xpEarned || 100,
        );
        res.json({ success: true, data: updated });
        return;
      }

      if (eventName === 'lesson.completed') {
        const updated = await ProgressService.recordLessonSuccess(
          userId,
          payload.courseId || 'unknown',
          payload.lessonId,
          payload.xpEarned || 20,
        );
        res.json({ success: true, data: updated });
        return;
      }

      if (eventName === 'quiz.passed') {
        const updated = await ProgressService.recordQuizSuccess(
          userId,
          payload.courseId || 'unknown',
          payload.lessonId,
          payload.score,
          payload.xpEarned || 50
        );
        res.json({ success: true, data: updated });
        return;
      }

      if (eventName === 'module.passed') {
        const updated = await ProgressService.recordModuleSuccess(
          userId,
          payload.courseId,
          payload.moduleId,
          payload.skill,
          payload.skillPoints || 40,
          payload.xpEarned || 100
        );
        res.json({ success: true, data: updated });
        return;
      }

      if (eventName === 'course.completed') {
        const updated = await ProgressService.recordCourseSuccess(
          userId,
          payload.courseId,
          payload.skill,
          payload.skillPoints || 100,
          payload.xpEarned || 500
        );
        res.json({ success: true, data: updated });
        return;
      }

      res.status(400).json({ success: false, error: 'Unsupported event type' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
