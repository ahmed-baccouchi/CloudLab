export enum SkillName {
  LINUX = 'LINUX',
  DOCKER = 'DOCKER',
  KUBERNETES = 'KUBERNETES',
  NETWORKING = 'NETWORKING',
  CICD = 'CICD',
  DEVSECOPS = 'DEVSECOPS',
}

export type ReadinessTier = 'NOVICE' | 'ASSOCIATE' | 'PROFESSIONAL' | 'SPECIALIST' | 'LEAD_ARCHITECT';

export interface SkillLevelDto {
  skill: SkillName;
  score: number; // 0 - 100%
  points: number;
  levelTitle: string; // e.g., 'Novice', 'Practitioner', 'Expert'
}

export interface CloudReadinessDto {
  overallScore: number; // 0 - 100
  tier: ReadinessTier;
  skills: SkillLevelDto[];
  solvedChallengesCount: number;
  completedLessonsCount: number;
  recommendations: string[];
}

export type AchievementCategory = 'CHALLENGE' | 'LEARNING' | 'STREAK' | 'MASTERY';

export interface AchievementDto {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  unlockedAt?: string;
  isUnlocked: boolean;
}

export interface UserGamificationDto {
  userId: string;
  totalXp: number;
  level: number;
  currentLevelBaseXp: number;
  nextLevelThresholdXp: number;
  progressPercentage: number;
  streakDays: number;
  lastActiveDate: string;
  achievements: AchievementDto[];
  skills: SkillLevelDto[];
  cloudReadiness: CloudReadinessDto;
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  level: number;
  totalXp: number;
  streakDays: number;
  readinessScore: number;
}
