export enum ProjectState {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PLANNING_FULL_TEAM = 'PLANNING_FULL_TEAM',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  RECRUITING = 'RECRUITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum ProjectApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ProjectTaskStatus {
  LOCKED = 'LOCKED',
  READY = 'READY',
  TODO = 'TODO',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

export enum EvidenceKind {
  FILE = 'FILE',
  SCREENSHOT = 'SCREENSHOT',
  GIT_URL = 'GIT_URL',
  DEPLOYMENT_URL = 'DEPLOYMENT_URL',
  EXPLANATION = 'EXPLANATION',
}

export enum EvidenceSource {
  STUDENT_UPLOAD = 'STUDENT_UPLOAD',
  GIT_REPO = 'GIT_REPO',
  DEPLOYMENT = 'DEPLOYMENT',
  INLINE = 'INLINE',
}

export enum SkillSourceType {
  COURSE = 'COURSE',
  ASSESSMENT = 'ASSESSMENT',
  EXERCISE = 'EXERCISE',
  PROJECT_TASK = 'PROJECT_TASK',
}

export enum ScheduleSyncStatus {
  OK = 'OK',
  FAILED_GRACEFUL = 'FAILED_GRACEFUL',
  SKIPPED_NO_CONFIG = 'SKIPPED_NO_CONFIG',
}

export interface SkillDto {
  id: string;
  name: string;
  category?: string;
  description?: string;
  createdAt: string;
}

export interface ProjectRequirementSkillDto {
  id: string;
  projectId: string;
  skillName: string;
  minimumLevel: number;
  createdAt: string;
}

export interface StudentSkillDto {
  id: string;
  studentId: string;
  skillId: string;
  skillName: string;
  category?: string;
  level: number;
  confidence: number;
  source: SkillSourceType;
  evidenceDetails?: string;
  evidenceRefId?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectPhaseDto {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  orderIndex: number;
  tasks?: ProjectTaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskDto {
  id: string;
  projectId: string;
  phaseId?: string;
  phase?: string;
  title: string;
  description: string;
  durationHours?: number;
  durationDays: number;
  startDate?: string;
  deadline?: string;
  status: ProjectTaskStatus;
  prerequisiteTaskIds: string[];
  requiredSkills: string[];
  technologies: string[];
  deliverables: string[];
  validationCriteria: string[];
  isRequired?: boolean;
  assignedTo?: string | null;
  assignedStudent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  submissions?: ProjectTaskSubmissionDto[];
  latestSubmission?: ProjectTaskSubmissionDto;
  isOverdue?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
  scheduleRef?: string;
  scheduleSyncStatus?: ScheduleSyncStatus;
  lockedReason?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskSubmissionDto {
  id: string;
  taskId: string;
  projectId: string;
  studentId: string;
  attemptIndex: number;
  studentName?: string;
  files: string[];
  screenshots: string[];
  gitUrl?: string;
  deploymentUrl?: string;
  explanation: string;
  status: 'SUBMITTED' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  feedback?: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface ProjectTeamMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string;
  isOwner?: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    skills?: StudentSkillDto[];
  };
}

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    skills?: StudentSkillDto[];
  };
}

export interface ProjectApplicationDto {
  id: string;
  projectId: string;
  userId: string;
  applicantName?: string;
  message?: string;
  status: ProjectApplicationStatus;
  appliedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    skills?: StudentSkillDto[];
  };
}

export interface ProjectDto {
  id: string;
  ownerUserId: string;
  ownerId?: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  ownerName?: string;
  title: string;
  slug?: string;
  description: string;
  objectives: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  technologies: string[];
  skills: string[];
  requirementSkills?: ProjectRequirementSkillDto[];
  durationDays: number;
  deadline?: string;
  state?: ProjectState;
  status: ProjectState | ProjectStatus;
  aiPlanApproved: boolean;
  planApprovedBy?: string;
  planGeneratedAt?: string;
  planApprovedAt?: string;
  startedAt?: string;
  completedAt?: string;
  maxMembers: number;
  currentMemberCount?: number;
  members?: ProjectMemberDto[] | ProjectTeamMemberDto[];
  phases?: ProjectPhaseDto[];
  tasks?: ProjectTaskDto[];
  applications?: ProjectApplicationDto[];
  schedule?: ProjectScheduleDto;
  activityLog?: ProjectActivityLogEntryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScheduleEntryDto {
  projectId: string;
  projectStartDate: string;
  projectTargetEndDate: string;
  totalDurationDays: number;
  criticalPathTaskIds: string[];
  tasks: {
    taskId: string;
    title: string;
    phase: string;
    assignedTo?: string | null;
    startDate: string;
    endDate: string;
    durationDays: number;
    deadline?: string;
    dependencies: string[];
    status: ProjectTaskStatus;
    isOverdue: boolean;
    isCompleted: boolean;
  }[];
  generatedAt: string;
}

export interface ProjectScheduleDto {
  projectId: string;
  projectStartDate: string;
  projectTargetEndDate: string;
  totalDurationDays: number;
  criticalPathTaskIds: string[];
  tasks: {
    taskId: string;
    title: string;
    phase: string;
    assignedTo?: string | null;
    startDate: string;
    endDate: string;
    durationDays: number;
    deadline?: string;
    dependencies: string[];
    status: ProjectTaskStatus;
    isOverdue: boolean;
    isCompleted: boolean;
  }[];
  generatedAt: string;
}

export interface TaskAssignmentRecommendationDto {
  taskId: string;
  taskTitle: string;
  requiredSkills: string[];
  recommendedStudentId: string;
  recommendedStudentName: string;
  score: number;
  reasoning: string;
  candidates: {
    studentId: string;
    studentName: string;
    matchingSkills: string[];
    confidenceAverage: number;
    currentWorkloadCount: number;
    score: number;
  }[];
}

export interface ProjectActivityLogEntryDto {
  id: string;
  projectId: string;
  actorUserId: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  createdAt: string;
}

export interface ProjectActivityLogDto {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  action: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface ProjectNotificationDto {
  id: string;
  userId: string;
  projectId?: string;
  type:
    | 'APPLICATION_RECEIVED'
    | 'APPLICATION_DECISION'
    | 'TEAM_FORMED'
    | 'TASK_ASSIGNED'
    | 'TASK_SUBMISSION'
    | 'TASK_VALIDATED'
    | 'TASK_REJECTED'
    | 'PROJECT_COMPLETED'
    | 'DEADLINE_WARNING'
    | 'PHASE_UNLOCKED'
    | 'STEP_UPDATE';
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TechnologyDto {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
}

export interface CreateProjectDto {
  title: string;
  description: string;
  objectives: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  technologies: string[];
  skills: string[];
  durationDays: number;
  deadline?: string;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  objectives: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  technologies: string[];
  skills: string[];
  durationDays: number;
  deadline?: string;
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  objectives?: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  technologies?: string[];
  skills?: string[];
  durationDays?: number;
  deadline?: string;
}

export interface SubmitApplicationDto {
  message?: string;
}

export interface DecideApplicationDto {
  accept: boolean;
  rejectionReason?: string;
}

export interface ApproveProjectPlanDto {
  approve: boolean;
  taskUpdates?: Array<{
    taskId: string;
    title?: string;
    description?: string;
    durationHours?: number;
    durationDays?: number;
    deadline?: string;
    prerequisiteTaskIds?: string[];
    requiredSkills?: string[];
    technologies?: string[];
    deliverables?: string[];
    validationCriteria?: string[];
  }>;
}

export interface UpdateAssignmentsDto {
  assignments: Array<{
    taskId: string;
    userId: string | null;
  }>;
}

export interface SubmitTaskEvidenceDto {
  explanation: string;
  files?: string[];
  screenshots?: string[];
  gitUrl?: string;
  deploymentUrl?: string;
}

export interface ValidateSubmissionDto {
  accept: boolean;
  feedback: string;
}

export interface GeneratePlanDto {
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  focusAreas?: string[];
  overridePhaseCount?: number;
}

export interface AiProjectPlanPhase {
  name: string;
  tasks: {
    title: string;
    description: string;
    durationDays: number;
    skills: string[];
    technologies: string[];
    deliverables: string[];
    validationCriteria: string[];
    prerequisiteIndices: number[];
  }[];
}

export interface AiProjectPlanResponse {
  phases: AiProjectPlanPhase[];
  suggestedDurationDays: number;
  overviewSummary: string;
}
