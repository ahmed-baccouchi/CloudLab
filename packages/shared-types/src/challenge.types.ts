export enum ChallengeCategory {
  LINUX = 'LINUX',
  DOCKER = 'DOCKER',
  KUBERNETES = 'KUBERNETES',
  NETWORKING = 'NETWORKING',
  CICD = 'CICD',
  DEVSECOPS = 'DEVSECOPS',
}

export enum ChallengeDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum ChallengeAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum VerificationType {
  HTTP_STATUS = 'HTTP_STATUS',
  PORT_OPEN = 'PORT_OPEN',
  PROCESS_RUNNING = 'PROCESS_RUNNING',
  FILE_CONTENT = 'FILE_CONTENT',
  COMMAND_OUTPUT = 'COMMAND_OUTPUT',
  K8S_DEPLOYMENT_READY = 'K8S_DEPLOYMENT_READY',
  CONTAINER_STATUS = 'CONTAINER_STATUS',
}

export interface ObjectiveRule {
  id: string;
  description: string;
  weight: number; // e.g. 25 points out of 100
  type: VerificationType;
  spec: Record<string, any>;
}

export interface ValidationCheckResult {
  ruleId: string;
  description: string;
  passed: boolean;
  scoreEarned: number;
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationSummaryDto {
  passed: boolean;
  score: number; // 0 - 100
  totalChecks: number;
  passedChecks: number;
  xpEarned: number;
  checks: ValidationCheckResult[];
  timestamp: string;
}

export interface ChallengeHintDto {
  id: string;
  orderIndex: number;
  hintText: string;
  xpPenaltyPercentage: number;
}

export interface ChallengeAttemptDto {
  id: string;
  userId: string;
  challengeId: string;
  status: ChallengeAttemptStatus;
  startedAt: string;
  completedAt?: string;
  score?: number;
  xpAwarded?: number;
  hintsRevealedCount: number;
  latestValidation?: ValidationSummaryDto;
}

export interface ChallengeDto {
  id: string;
  slug: string;
  title: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  description: string;
  scenarioDetails: string;
  objectives: ObjectiveRule[];
  baseXp: number;
  timeLimitMinutes: number;
  isPublished: boolean;
  hints?: ChallengeHintDto[];
  userAttempt?: ChallengeAttemptDto;
}

export interface StartChallengeResponseDto {
  attempt: ChallengeAttemptDto;
  challenge: ChallengeDto;
  timeRemainingSeconds: number;
}

export interface ValidateChallengeRequestDto {
  attemptId: string;
  environmentState?: Record<string, any>;
}
