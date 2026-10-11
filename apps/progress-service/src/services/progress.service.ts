import { progressRepository } from '../db/progress.repository';
import {
  UserGamificationDto,
  LeaderboardEntryDto,
  SkillName,
} from '@cloudlab/shared-types';

export class ProgressService {
  static async getUserProfile(userId: string): Promise<UserGamificationDto> {
    return progressRepository.getUserGamification(userId);
  }

  static async getLeaderboard(): Promise<LeaderboardEntryDto[]> {
    return progressRepository.getLeaderboard();
  }

  static async recordChallengeSuccess(
    userId: string,
    challengeId: string,
    category: SkillName,
    xpEarned: number,
  ): Promise<UserGamificationDto> {
    await progressRepository.markChallengeCompleted(userId, challengeId, category, xpEarned);
    return progressRepository.getUserGamification(userId);
  }

  static async recordLessonSuccess(
    userId: string,
    courseId: string,
    lessonId: string,
    xpEarned: number,
  ): Promise<UserGamificationDto> {
    await progressRepository.markLessonCompleted(userId, courseId, lessonId, xpEarned);
    return progressRepository.getUserGamification(userId);
  }

  static async recordQuizSuccess(
    userId: string,
    courseId: string,
    lessonId: string,
    score: number,
    xpEarned: number
  ): Promise<UserGamificationDto> {
    await progressRepository.markQuizCompleted(userId, courseId, lessonId, score, xpEarned);
    return progressRepository.getUserGamification(userId);
  }

  static async recordModuleSuccess(
    userId: string,
    courseId: string,
    moduleId: string,
    skill?: SkillName,
    skillPoints: number = 40,
    xpEarned: number = 100
  ): Promise<UserGamificationDto> {
    await progressRepository.addXpAndSkills(
      userId,
      xpEarned,
      skill,
      skillPoints,
      'MODULE_QUIZ',
      moduleId
    );
    return progressRepository.getUserGamification(userId);
  }

  static async recordCourseSuccess(
    userId: string,
    courseId: string,
    skill?: SkillName,
    skillPoints: number = 100,
    xpEarned: number = 500
  ): Promise<UserGamificationDto> {
    await progressRepository.addXpAndSkills(
      userId,
      xpEarned,
      skill,
      skillPoints,
      'COURSE_QUIZ',
      courseId
    );
    return progressRepository.getUserGamification(userId);
  }
}
