export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum LessonType {
  READING = 'READING',
  VIDEO = 'VIDEO',
  QUIZ = 'QUIZ',
  LAB_PROMPT = 'LAB_PROMPT',
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizDto {
  id: string;
  lessonId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizSubmissionDto {
  lessonId: string;
  answers: { questionId: string; selectedIndex: number }[];
}

export interface QuizQuestionFeedback {
  questionId: string;
  correct: boolean;
  explanation: string;
  selectedOption: number;
  correctOption: number;
}

export interface QuizResultDto {
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  feedback: QuizQuestionFeedback[];
}

export interface ResourceAttachmentDto {
  id: string;
  title: string;
  fileUrl: string;
  fileType: 'PDF' | 'DOCUMENT' | 'DIAGRAM' | 'CODE_SNIPPET' | 'FILE';
  fileSizeBytes?: number;
  uploadedAt: string;
}

export interface LessonDto {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  contentMarkdown: string;
  type: LessonType;
  orderIndex: number;
  durationMinutes: number;
  quiz?: QuizDto;
  challengeId?: string; // Optional attached DevOps challenge
  resources?: ResourceAttachmentDto[];
  isCompleted?: boolean;
}

export interface ModuleDto {
  id: string;
  courseId: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonDto[];
  targetSkill?: string;
  skillPointsOnPass?: number;
}

export interface CourseDto {
  id: string;
  trackId: string;
  instructorId?: string;
  instructorName?: string;
  slug: string;
  title: string;
  summary: string;
  difficultyLevel: CourseDifficulty;
  estimatedHours: number;
  isPublished: boolean;
  orderIndex: number;
  resources?: ResourceAttachmentDto[];
  attachedChallengeIds?: string[];
  modules?: ModuleDto[];
  totalLessons?: number;
  completedLessons?: number;
  enrolledStudentsCount?: number;
  targetSkill?: string;
}

export interface ModuleQuizDto {
  id: string;
  moduleId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseQuizDto {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  aiGenerated: boolean;
  xpOnPass: number;
  skillPointsOnPass: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserModuleProgressDto {
  id: string;
  userId: string;
  courseId: string;
  moduleId: string;
  allLessonsRead: boolean;
  quizPassed: boolean;
  quizBestScore: number;
  completedAt?: string;
}

export interface UserLessonCompletionDto {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  completedAt: string;
  xpEarned: number;
}

export interface QuizSubmissionHistoryDto {
  id: string;
  userId: string;
  quizType: 'MODULE' | 'COURSE' | 'LESSON';
  quizId: string;
  courseId?: string;
  moduleId?: string;
  score: number;
  passed: boolean;
  answers: { questionId: string; selectedIndex: number }[];
  submittedAt: string;
}

export interface TrackDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  orderIndex: number;
  isPublished: boolean;
  courses?: CourseDto[];
}

export interface CourseEnrollmentDto {
  id: string;
  userId: string;
  courseId: string;
  userEmail?: string;
  userName?: string;
  enrolledAt: string;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: string;
  completedLessonIds?: string[];
  quizzesCompletedCount: number;
  challengesCompletedCount: number;
}

export interface CourseAnalyticsDto {
  courseId: string;
  courseTitle: string;
  isPublished: boolean;
  enrolledCount: number;
  completionRate: number;
  averageQuizScore: number;
  students: {
    userId: string;
    userName: string;
    userEmail: string;
    enrolledAt: string;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    quizResults: {
      lessonTitle: string;
      score: number;
      passed: boolean;
    }[];
    challengesCompleted: string[];
  }[];
}

export interface CreateTrackDto {
  slug: string;
  title: string;
  description: string;
  icon: string;
  orderIndex?: number;
  isPublished?: boolean;
}

export interface UpdateTrackDto {
  slug?: string;
  title?: string;
  description?: string;
  icon?: string;
  orderIndex?: number;
  isPublished?: boolean;
}

export interface CreateCourseDto {
  trackId: string;
  instructorId?: string;
  instructorName?: string;
  slug: string;
  title: string;
  summary: string;
  difficultyLevel: CourseDifficulty;
  estimatedHours: number;
  orderIndex?: number;
  isPublished?: boolean;
  resources?: ResourceAttachmentDto[];
  attachedChallengeIds?: string[];
}

export interface UpdateCourseDto {
  trackId?: string;
  instructorId?: string;
  instructorName?: string;
  slug?: string;
  title?: string;
  summary?: string;
  difficultyLevel?: CourseDifficulty;
  estimatedHours?: number;
  orderIndex?: number;
  isPublished?: boolean;
  resources?: ResourceAttachmentDto[];
  attachedChallengeIds?: string[];
}

export interface CreateModuleDto {
  courseId: string;
  title: string;
  description: string;
  orderIndex?: number;
}

export interface UpdateModuleDto {
  courseId?: string;
  title?: string;
  description?: string;
  orderIndex?: number;
}

export interface CreateLessonDto {
  moduleId: string;
  slug: string;
  title: string;
  contentMarkdown: string;
  type: LessonType;
  orderIndex?: number;
  durationMinutes: number;
  quiz?: QuizDto;
  challengeId?: string;
  resources?: ResourceAttachmentDto[];
}

export interface UpdateLessonDto {
  moduleId?: string;
  slug?: string;
  title?: string;
  contentMarkdown?: string;
  type?: LessonType;
  orderIndex?: number;
  durationMinutes?: number;
  quiz?: QuizDto;
  challengeId?: string;
  resources?: ResourceAttachmentDto[];
}
