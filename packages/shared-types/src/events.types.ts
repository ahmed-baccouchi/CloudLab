import { UserRole } from './auth.types';
import { ChallengeCategory, ChallengeDifficulty } from './challenge.types';

export enum CloudLabEventName {
  USER_REGISTERED = 'user.registered',
  LESSON_COMPLETED = 'lesson.completed',
  QUIZ_PASSED = 'quiz.passed',
  CHALLENGE_STARTED = 'challenge.started',
  CHALLENGE_COMPLETED = 'challenge.completed',
  CHALLENGE_FAILED = 'challenge.failed',
  ACHIEVEMENT_UNLOCKED = 'achievement.unlocked',

  PROJECT_APPLICATION_CREATED = 'project.application_created',
  PROJECT_APPLICATION_ACCEPTED = 'project.application_accepted',
  PROJECT_APPLICATION_REJECTED = 'project.application_rejected',
  PROJECT_STARTED = 'project.started',
  PROJECT_TASK_ASSIGNED = 'project.task_assigned',
  PROJECT_TASK_REASSIGNED = 'project.task_reassigned',
  PROJECT_SUBMISSION_MADE = 'project.submission_made',
  PROJECT_SUBMISSION_VALIDATED = 'project.submission_validated',
  PROJECT_SUBMISSION_REJECTED = 'project.submission_rejected',
  PROJECT_DEADLINE_UPCOMING = 'project.deadline_upcoming',
  PROJECT_TASK_OVERDUE = 'project.task_overdue',
  PROJECT_COMPLETED = 'project.completed',
  PROJECT_PLAN_GENERATED = 'project.plan_generated',
  PROJECT_PLAN_APPROVED = 'project.plan_approved',
}

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  role: UserRole;
  timestamp: string;
}

export interface LessonCompletedEvent {
  userId: string;
  lessonId: string;
  courseId: string;
  xpEarned: number;
  timestamp: string;
}

export interface QuizPassedEvent {
  userId: string;
  quizId: string;
  lessonId: string;
  score: number;
  xpEarned: number;
  timestamp: string;
}

export interface ChallengeStartedEvent {
  userId: string;
  challengeId: string;
  attemptId: string;
  timestamp: string;
}

export interface ChallengeCompletedEvent {
  userId: string;
  challengeId: string;
  attemptId: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  score: number;
  timeTakenSeconds: number;
  xpEarned: number;
  timestamp: string;
}

export interface ChallengeFailedEvent {
  userId: string;
  challengeId: string;
  attemptId: string;
  reason: string;
  timestamp: string;
}

export interface AchievementUnlockedEvent {
  userId: string;
  achievementKey: string;
  title: string;
  timestamp: string;
}

export interface ProjectApplicationCreatedEvent {
  projectId: string;
  actorUserId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName?: string;
  message?: string;
  timestamp: string;
}

export interface ProjectApplicationAcceptedEvent {
  projectId: string;
  actorUserId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName?: string;
  teamMemberCountAfter: number;
  projectStateAfter: string;
  timestamp: string;
}

export interface ProjectApplicationRejectedEvent {
  projectId: string;
  actorUserId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName?: string;
  rejectionReason?: string;
  timestamp: string;
}

export interface ProjectStartedEvent {
  projectId: string;
  actorUserId: string;
  totalTasksCount: number;
  teamMemberCount: number;
  projectStartDate: string;
  targetEndDate?: string;
  scheduleSyncStatus?: string;
  timestamp: string;
}

export interface ProjectTaskAssignedEvent {
  projectId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  assigneeUserId: string;
  assigneeName?: string;
  recommendedScore?: number;
  isOverride?: boolean;
  timestamp: string;
}

export interface ProjectTaskReassignedEvent {
  projectId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  previousAssigneeUserId?: string;
  previousAssigneeName?: string;
  newAssigneeUserId: string;
  newAssigneeName?: string;
  isOverride?: boolean;
  timestamp: string;
}

export interface ProjectSubmissionMadeEvent {
  projectId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  submissionId: string;
  submitterUserId: string;
  submitterName?: string;
  attemptIndex: number;
  evidenceFileCount?: number;
  hasGitUrl?: boolean;
  hasDeploymentUrl?: boolean;
  timestamp: string;
}

export interface ProjectSubmissionValidatedEvent {
  projectId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  submissionId: string;
  submitterUserId: string;
  submitterName?: string;
  attemptIndex: number;
  validatorUserId: string;
  validatorName?: string;
  feedback?: string;
  skillGains?: Array<{ skillName: string; levelIncrease: number; confidenceIncrease: number }>;
  xpEarned?: number;
  requiredTasksRemainingAfter?: number;
  projectStateAfter?: string;
  timestamp: string;
}

export interface ProjectSubmissionRejectedEvent {
  projectId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  submissionId: string;
  submitterUserId: string;
  submitterName?: string;
  attemptIndex: number;
  validatorUserId: string;
  validatorName?: string;
  feedback?: string;
  timestamp: string;
}

export interface ProjectDeadlineUpcomingEvent {
  projectId: string;
  actorUserId?: string;
  taskId?: string;
  taskTitle?: string;
  deadline: string;
  hoursUntilDeadline: number;
  affectedUserIds: string[];
  timestamp: string;
}

export interface ProjectTaskOverdueEvent {
  projectId: string;
  actorUserId?: string;
  taskId: string;
  taskTitle: string;
  deadline: string;
  overdueHours: number;
  assigneeUserId?: string;
  assigneeName?: string;
  affectedUserIds: string[];
  timestamp: string;
}

export interface ProjectCompletedEvent {
  projectId: string;
  actorUserId?: string;
  ownerUserId: string;
  memberUserIds: string[];
  totalTasksCompleted: number;
  totalDurationDays?: number;
  startedAt?: string;
  completedAt: string;
  xpRewards?: Record<string, number>;
  skillGains?: Record<string, Array<{ skillName: string; levelIncrease: number }>>;
  timestamp: string;
}

export interface ProjectPlanGeneratedEvent {
  projectId: string;
  actorUserId: string;
  phasesCount: number;
  tasksCount: number;
  usedFallbackGenerator: boolean;
  suggestedDurationDays?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface ProjectPlanApprovedEvent {
  projectId: string;
  actorUserId: string;
  phasesCount: number;
  tasksCount: number;
  ownerUserId: string;
  projectStateAfter: string;
  timestamp: string;
}

export type CloudLabProjectEvent =
  | ProjectApplicationCreatedEvent
  | ProjectApplicationAcceptedEvent
  | ProjectApplicationRejectedEvent
  | ProjectStartedEvent
  | ProjectTaskAssignedEvent
  | ProjectTaskReassignedEvent
  | ProjectSubmissionMadeEvent
  | ProjectSubmissionValidatedEvent
  | ProjectSubmissionRejectedEvent
  | ProjectDeadlineUpcomingEvent
  | ProjectTaskOverdueEvent
  | ProjectCompletedEvent
  | ProjectPlanGeneratedEvent
  | ProjectPlanApprovedEvent;
