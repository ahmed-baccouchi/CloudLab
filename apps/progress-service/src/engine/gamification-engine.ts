import { AchievementDto } from '@cloudlab/shared-types';

export class GamificationEngine {
  /**
   * Calculates level based on quadratic XP curve:
   * Level 1: 0 - 99 XP
   * Level 2: 100 - 399 XP
   * Level 3: 400 - 899 XP
   * Level 4: 900 - 1599 XP
   */
  static calculateLevel(totalXp: number): {
    level: number;
    currentLevelBaseXp: number;
    nextLevelThresholdXp: number;
    progressPercentage: number;
  } {
    const safeXp = Math.max(0, totalXp);
    const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLevelThresholdXp = Math.pow(level, 2) * 100;

    const span = nextLevelThresholdXp - currentLevelBaseXp;
    const progressInLevel = safeXp - currentLevelBaseXp;
    const progressPercentage = Math.min(100, Math.round((progressInLevel / span) * 100));

    return {
      level,
      currentLevelBaseXp,
      nextLevelThresholdXp,
      progressPercentage,
    };
  }

  static getCatalogAchievements(): AchievementDto[] {
    return [
      {
        id: 'ach-first-step',
        key: 'FIRST_INCIDENT_SOLVED',
        title: 'Incident Responder',
        description: 'Successfully diagnosed and restored your first broken cloud environment.',
        icon: 'zap',
        category: 'CHALLENGE',
        isUnlocked: false,
      },
      {
        id: 'ach-k8s-ninja',
        key: 'K8S_TRIAGE_MASTER',
        title: 'Pod Whisperer',
        description: 'Fixed a Kubernetes deployment suffering from CrashLoopBackOff.',
        icon: 'kubernetes',
        category: 'MASTERY',
        isUnlocked: false,
      },
      {
        id: 'ach-docker-captain',
        key: 'DOCKER_PORT_PRO',
        title: 'Network Navigator',
        description: 'Resolved a Docker port binding conflict without interrupting host services.',
        icon: 'docker',
        category: 'CHALLENGE',
        isUnlocked: false,
      },
      {
        id: 'ach-streak-3',
        key: 'STREAK_3_DAYS',
        title: 'DevOps Habit',
        description: 'Maintained a 3-day troubleshooting practice streak.',
        icon: 'flame',
        category: 'STREAK',
        isUnlocked: false,
      },
    ];
  }
}
