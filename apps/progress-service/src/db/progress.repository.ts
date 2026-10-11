import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  SkillName,
  LeaderboardEntryDto,
  UserGamificationDto,
  AchievementDto,
} from '@cloudlab/shared-types';
import { GamificationEngine } from '../engine/gamification-engine';
import { ReadinessCalculator } from '../engine/readiness-calculator';

export interface UserProgressRecord {
  userId: string;
  totalXp: number;
  streakDays: number;
  lastActiveDate: string;
  skills: Map<SkillName, number>;
  completedLessons: Set<string>;
  completedChallenges: Set<string>;
  unlockedAchievementKeys: Set<string>;
}

export class ProgressRepository {
  private pool: mysql.Pool | null = null;
  private isConnected = false;

  private userProgress: Map<string, UserProgressRecord> = new Map();
  private mockLeaderboard: LeaderboardEntryDto[] = [];

  async initialize(): Promise<void> {
    try {
      const bootstrapConn = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
      });
      await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\`;`);
      await bootstrapConn.end();

      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
      });

      const conn = await this.pool.getConnection();
      conn.release();
      this.isConnected = true;
      console.log('✅ [Progress Service] Connected to MySQL database:', config.database.database);

      await this.createTables();
      await this.hydrateFromDb();
    } catch (err: any) {
      console.warn('⚠️ [Progress Service] MySQL unavailable (' + err.message + '). Using in-memory progress store for development.');
      this.isConnected = false;
    }

    this.seedLeaderboard();
  }

  private async createTables(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      // Note: All tables are now in cloudlab_learning, created by LearningService
      // This service is read-only and doesn't create its own tables
      console.log('✅ [Progress Service] Using tables from cloudlab_learning (created by LearningService)');
    } catch (err: any) {
      console.error('❌ [Progress Service] Failed to verify tables:', err.message);
    }
  }

  private async hydrateFromDb(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      const [profiles]: any = await this.pool.query('SELECT * FROM user_progress_profiles');
      for (const p of profiles) {
        const [skills]: any = await this.pool.query('SELECT * FROM student_skills WHERE user_id = ?', [p.user_id]);
        const skillsMap = new Map<SkillName, number>();
        for (const s of skills) {
          skillsMap.set(s.skill_name as SkillName, s.points);
        }

        const [lessons]: any = await this.pool.query('SELECT lesson_id FROM user_lesson_completions WHERE user_id = ?', [p.user_id]);
        const [challenges]: any = await this.pool.query('SELECT challenge_id FROM user_challenge_completions WHERE user_id = ?', [p.user_id]);

        this.userProgress.set(p.user_id, {
          userId: p.user_id,
          totalXp: p.total_xp,
          streakDays: p.streak_days,
          lastActiveDate: p.last_active_date.toISOString(),
          skills: skillsMap,
          completedLessons: new Set(lessons.map((l: any) => l.lesson_id)),
          completedChallenges: new Set(challenges.map((c: any) => c.challenge_id)),
          unlockedAchievementKeys: new Set(), // TODO: persist achievements
        });
      }
      console.log(`✅ [Progress Service] Hydrated ${this.userProgress.size} user profiles from MySQL`);
    } catch (err: any) {
      console.error('❌ [Progress Service] Failed to hydrate from MySQL:', err.message);
    }
  }

  private seedLeaderboard(): void {
    this.mockLeaderboard = [
      {
        rank: 1,
        userId: 'lead-1',
        fullName: 'Elena Rostova',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        level: 8,
        totalXp: 5400,
        streakDays: 14,
        readinessScore: 92,
      },
      {
        rank: 2,
        userId: 'lead-2',
        fullName: 'Marcus Vance',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        level: 6,
        totalXp: 3200,
        streakDays: 9,
        readinessScore: 78,
      },
      {
        rank: 3,
        userId: 'lead-3',
        fullName: 'Priya Patel',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        level: 5,
        totalXp: 2100,
        streakDays: 6,
        readinessScore: 68,
      },
    ];

    // Seed default progress for demo student
    const defaultSkills = new Map<SkillName, number>([
      [SkillName.LINUX, 120],
      [SkillName.DOCKER, 90],
      [SkillName.KUBERNETES, 150],
      [SkillName.NETWORKING, 60],
      [SkillName.CICD, 40],
      [SkillName.DEVSECOPS, 30],
    ]);

    this.userProgress.set('11111111-1111-1111-1111-111111111111', {
      userId: '11111111-1111-1111-1111-111111111111',
      totalXp: 490,
      streakDays: 3,
      lastActiveDate: new Date().toISOString(),
      skills: defaultSkills,
      completedLessons: new Set(['lesson-linux-1']),
      completedChallenges: new Set(['chal-k8s-crashloop']),
      unlockedAchievementKeys: new Set(['FIRST_INCIDENT_SOLVED']),
    });
  }

  async getOrCreateUserProgress(userId: string): Promise<UserProgressRecord> {
    let rec = this.userProgress.get(userId);
    if (!rec) {
      rec = {
        userId,
        totalXp: 0,
        streakDays: 1,
        lastActiveDate: new Date().toISOString(),
        skills: new Map<SkillName, number>(),
        completedLessons: new Set(),
        completedChallenges: new Set(),
        unlockedAchievementKeys: new Set(),
      };
      this.userProgress.set(userId, rec);
    }
    return rec;
  }

  async addXpAndSkills(
    userId: string,
    xpToAdd: number,
    skill?: SkillName,
    skillPoints: number = 0,
    sourceType: 'MODULE_QUIZ' | 'COURSE_QUIZ' | 'CHALLENGE' | 'LESSON' | 'QUIZ' = 'LESSON',
    sourceId: string = 'unknown'
  ): Promise<void> {
    const rec = await this.getOrCreateUserProgress(userId);
    rec.totalXp += xpToAdd;

    if (skill) {
      const current = rec.skills.get(skill) || 0;
      rec.skills.set(skill, current + skillPoints);
    }

    rec.lastActiveDate = new Date().toISOString();

    // Persist to MySQL
    if (this.isConnected && this.pool) {
      try {
        // 1. Update Profile
        await this.pool.query(`
          INSERT INTO user_progress_profiles (user_id, total_xp, last_active_date)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE total_xp = total_xp + ?, last_active_date = CURRENT_TIMESTAMP
        `, [userId, xpToAdd, xpToAdd]);

        // 2. Update Skills if applicable
        if (skill) {
          const skillId = `${userId}_${skill}`;
          await this.pool.query(`
            INSERT INTO student_skills (id, user_id, skill_name, points)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE points = points + ?, last_updated_at = CURRENT_TIMESTAMP
          `, [skillId, userId, skill, skillPoints, skillPoints]);

          // 3. Record Skill Gain History
          const historyId = uuidv4();
          await this.pool.query(`
            INSERT INTO skill_gain_history (id, user_id, skill_name, points_gained, source_type, source_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [historyId, userId, skill, skillPoints, sourceType, sourceId]);
        }
      } catch (err: any) {
        console.error('❌ [Progress Repository] MySQL persistence failed:', err.message);
      }
    }
  }

  async markLessonCompleted(userId: string, courseId: string, lessonId: string, xpEarned: number): Promise<void> {
    const rec = await this.getOrCreateUserProgress(userId);
    if (rec.completedLessons.has(lessonId)) return;

    rec.completedLessons.add(lessonId);
    rec.totalXp += xpEarned;

    // Persist to MySQL
    if (this.isConnected && this.pool) {
      try {
        const id = uuidv4();
        await this.pool.query(`
          INSERT IGNORE INTO user_lesson_completions (id, user_id, lesson_id, course_id, xp_earned)
          VALUES (?, ?, ?, ?, ?)
        `, [id, userId, lessonId, courseId, xpEarned]);

        await this.pool.query(`
          INSERT INTO user_progress_profiles (user_id, total_xp, last_active_date)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE total_xp = total_xp + ?, last_active_date = CURRENT_TIMESTAMP
        `, [userId, xpEarned, xpEarned]);
      } catch (err: any) {
        console.error('❌ [Progress Repository] markLessonCompleted MySQL persistence failed:', err.message);
      }
    }
  }

  async markChallengeCompleted(
    userId: string,
    challengeId: string,
    category: SkillName,
    xpEarned: number,
  ): Promise<void> {
    const rec = await this.getOrCreateUserProgress(userId);
    if (rec.completedChallenges.has(challengeId)) return;

    rec.completedChallenges.add(challengeId);
    rec.totalXp += xpEarned;

    const currentSkillPts = rec.skills.get(category) || 0;
    rec.skills.set(category, currentSkillPts + 80);

    // Unlock first incident badge
    rec.unlockedAchievementKeys.add('FIRST_INCIDENT_SOLVED');

    // Persist to MySQL
    if (this.isConnected && this.pool) {
      try {
        const id = uuidv4();
        await this.pool.query(`
          INSERT IGNORE INTO user_challenge_completions (id, user_id, challenge_id, xp_earned)
          VALUES (?, ?, ?, ?)
        `, [id, userId, challengeId, xpEarned]);

        await this.addXpAndSkills(userId, xpEarned, category, 80, 'CHALLENGE', challengeId);
      } catch (err: any) {
        console.error('❌ [Progress Repository] markChallengeCompleted MySQL persistence failed:', err.message);
      }
    }
  }

  async markQuizCompleted(
    userId: string,
    courseId: string,
    lessonId: string,
    score: number,
    xpEarned: number
  ): Promise<void> {
    // For now, we just award XP. In the future, we'll link this to module/course quizzes.
    await this.addXpAndSkills(userId, xpEarned, undefined, 0, 'QUIZ', lessonId);
  }

  async getUserGamification(userId: string): Promise<UserGamificationDto> {
    const rec = await this.getOrCreateUserProgress(userId);
    const levelInfo = GamificationEngine.calculateLevel(rec.totalXp);
    const readiness = ReadinessCalculator.calculate(
      rec.skills,
      rec.completedChallenges.size,
      rec.completedLessons.size,
    );

    const catalogAchievements = GamificationEngine.getCatalogAchievements();
    const achievements: AchievementDto[] = catalogAchievements.map((a) => ({
      ...a,
      isUnlocked: rec.unlockedAchievementKeys.has(a.key),
      unlockedAt: rec.unlockedAchievementKeys.has(a.key) ? rec.lastActiveDate : undefined,
    }));

    return {
      userId,
      totalXp: rec.totalXp,
      level: levelInfo.level,
      currentLevelBaseXp: levelInfo.currentLevelBaseXp,
      nextLevelThresholdXp: levelInfo.nextLevelThresholdXp,
      progressPercentage: levelInfo.progressPercentage,
      streakDays: rec.streakDays,
      lastActiveDate: rec.lastActiveDate,
      achievements,
      skills: readiness.skills,
      cloudReadiness: readiness,
    };
  }

  async getLeaderboard(): Promise<LeaderboardEntryDto[]> {
    return this.mockLeaderboard;
  }
}

export const progressRepository = new ProgressRepository();
