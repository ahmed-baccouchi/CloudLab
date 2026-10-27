import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { learningRepository } from '../db/learning.repository';
import { AIService } from './ai.service';
import {
  TrackDto,
  CourseDto,
  ModuleDto,
  LessonDto,
  QuizResultDto,
  QuizQuestionFeedback,
  QuizSubmissionDto,
  CreateTrackDto,
  UpdateTrackDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  CourseEnrollmentDto,
  CourseAnalyticsDto,
  ModuleQuizDto,
  CourseQuizDto,
  UserModuleProgressDto,
  QuizSubmissionHistoryDto,
  QuizDto,
  QuizQuestion,
} from '@cloudlab/shared-types';

export class LearningService {
  // Read operations (with role-based access for draft/published courses)
  static async getAllTracks(role?: string): Promise<TrackDto[]> {
    return learningRepository.getAllTracks(role);
  }

  static async getTrackById(id: string, role?: string): Promise<TrackDto> {
    const track = await learningRepository.getTrackById(id, role);
    if (!track) {
      throw new Error(`Track '${id}' not found or is unpublished`);
    }
    return track;
  }

  static async getTrackBySlug(slug: string, role?: string): Promise<TrackDto> {
    const track = await learningRepository.getTrackBySlug(slug, role);
    if (!track) {
      throw new Error(`Track '${slug}' not found or is unpublished`);
    }
    return track;
  }

  static async getAllCourses(role?: string, instructorId?: string): Promise<CourseDto[]> {
    return learningRepository.getAllCourses(role, instructorId);
  }

  static async getCourseById(id: string, role?: string): Promise<CourseDto> {
    const course = await learningRepository.getCourseById(id, role);
    if (!course) {
      throw new Error(`Course '${id}' not found or is unpublished`);
    }
    return course;
  }

  static async getCourseBySlug(slug: string, role?: string): Promise<CourseDto> {
    const course = await learningRepository.getCourseBySlug(slug, role);
    if (!course) {
      throw new Error(`Course '${slug}' not found or is unpublished`);
    }
    return course;
  }

  static async getLessonById(id: string): Promise<LessonDto> {
    const lesson = await learningRepository.getLessonById(id);
    if (!lesson) {
      throw new Error(`Lesson '${id}' not found`);
    }
    return lesson;
  }

  // Track CRUD
  static async createTrack(dto: CreateTrackDto): Promise<TrackDto> {
    if (!dto.slug || !dto.title) {
      throw new Error('Slug and title are required for a track');
    }
    return learningRepository.createTrack(dto);
  }

  static async updateTrack(id: string, dto: UpdateTrackDto): Promise<TrackDto> {
    const updated = await learningRepository.updateTrack(id, dto);
    if (!updated) {
      throw new Error(`Track '${id}' not found`);
    }
    return updated;
  }

  static async deleteTrack(id: string): Promise<void> {
    const ok = await learningRepository.deleteTrack(id);
    if (!ok) {
      throw new Error(`Track '${id}' not found`);
    }
  }

  // Course CRUD & Publishing Controls
  static async createCourse(dto: CreateCourseDto, instructorId?: string, instructorName?: string): Promise<CourseDto> {
    if (!dto.trackId || !dto.slug || !dto.title) {
      throw new Error('TrackId, slug, and title are required for a course');
    }
    return learningRepository.createCourse({
      ...dto,
      instructorId: instructorId || dto.instructorId,
      instructorName: instructorName || dto.instructorName,
    });
  }

  static async updateCourse(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    const updated = await learningRepository.updateCourse(id, dto);
    if (!updated) {
      throw new Error(`Course '${id}' not found`);
    }
    return updated;
  }

  static async setCoursePublishStatus(id: string, isPublished: boolean): Promise<CourseDto> {
    const updated = await learningRepository.setCoursePublishStatus(id, isPublished);
    if (!updated) {
      throw new Error(`Course '${id}' not found`);
    }
    return updated;
  }

  static async deleteCourse(id: string): Promise<void> {
    const ok = await learningRepository.deleteCourse(id);
    if (!ok) {
      throw new Error(`Course '${id}' not found`);
    }
  }

  // Module CRUD & Reordering
  static async createModule(dto: CreateModuleDto): Promise<ModuleDto> {
    if (!dto.courseId || !dto.title) {
      throw new Error('CourseId and title are required for a module');
    }
    return learningRepository.createModule(dto);
  }

  static async updateModule(id: string, dto: UpdateModuleDto): Promise<ModuleDto> {
    const updated = await learningRepository.updateModule(id, dto);
    if (!updated) {
      throw new Error(`Module '${id}' not found`);
    }
    return updated;
  }

  static async deleteModule(id: string): Promise<void> {
    const ok = await learningRepository.deleteModule(id);
    if (!ok) {
      throw new Error(`Module '${id}' not found`);
    }
  }

  static async reorderModules(courseId: string, moduleIdsInOrder: string[]): Promise<ModuleDto[]> {
    return learningRepository.reorderModules(courseId, moduleIdsInOrder);
  }

  // Lesson CRUD & Reordering
  static async createLesson(dto: CreateLessonDto): Promise<LessonDto> {
    if (!dto.moduleId || !dto.title) {
      throw new Error('ModuleId and title are required for a lesson');
    }
    if (!dto.slug) {
      dto.slug = dto.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `lesson-${Date.now()}`;
    }
    if (!dto.contentMarkdown) {
      dto.contentMarkdown = `# ${dto.title}\n\nWelcome to this lesson. Content will be updated soon.`;
    }
    return learningRepository.createLesson(dto);
  }

  static async updateLesson(id: string, dto: UpdateLessonDto): Promise<LessonDto> {
    const updated = await learningRepository.updateLesson(id, dto);
    if (!updated) {
      throw new Error(`Lesson '${id}' not found`);
    }
    return updated;
  }

  static async deleteLesson(id: string): Promise<void> {
    const ok = await learningRepository.deleteLesson(id);
    if (!ok) {
      throw new Error(`Lesson '${id}' not found`);
    }
  }

  static async reorderLessons(moduleId: string, lessonIdsInOrder: string[]): Promise<LessonDto[]> {
    return learningRepository.reorderLessons(moduleId, lessonIdsInOrder);
  }

  // Student Enrollment & Progress
  static async enrollStudent(userId: string, courseId: string, userEmail?: string, userName?: string): Promise<CourseEnrollmentDto> {
    return learningRepository.enrollStudent(userId, courseId, userEmail, userName);
  }

  static async getEnrollment(userId: string, courseId: string): Promise<CourseEnrollmentDto | null> {
    return learningRepository.getEnrollment(userId, courseId);
  }

  static async getUserEnrollments(userId: string): Promise<CourseEnrollmentDto[]> {
    return learningRepository.getUserEnrollments(userId);
  }

  static async markLessonCompleted(userId: string, courseId: string, lessonId: string): Promise<CourseEnrollmentDto | null> {
    const enr = await learningRepository.updateStudentLessonProgress(userId, courseId, lessonId);
    if (enr) {
      // Phase 0: Sync with Progress Service
      this.emitProgressEvent('lesson.completed', {
        userId,
        courseId,
        lessonId,
        xpEarned: 20 // Standard XP for reading a lesson
      }).catch(err => console.error('Failed to emit lesson.completed event:', err.message));
    }
    return enr;
  }

  // Instructor Analytics
  static async getCourseAnalytics(courseId: string): Promise<CourseAnalyticsDto> {
    return learningRepository.getCourseAnalytics(courseId);
  }

  // Quiz evaluation
  static async evaluateQuiz(submission: QuizSubmissionDto, userId?: string, courseId?: string): Promise<QuizResultDto> {
    const lesson = await learningRepository.getLessonById(submission.lessonId);
    if (!lesson || !lesson.quiz) {
      throw new Error('No quiz found for this lesson');
    }

    const quiz = lesson.quiz;
    const result = this.calculateQuizResult(quiz.questions, submission.answers, quiz.passingScore);
    const xpEarned = result.passed ? 50 : 10;

    // Record in repository for course analytics and progress
    if (userId && courseId) {
      await learningRepository.recordQuizCompletion(userId, courseId, submission.lessonId, result.score, result.passed);

      // Phase 0: Sync with Progress Service
      if (result.passed) {
        this.emitProgressEvent('quiz.passed', {
          userId,
          courseId,
          lessonId: submission.lessonId,
          score: result.score,
          xpEarned
        }).catch(err => console.error('Failed to emit quiz.passed event:', err.message));
      }

      // Record history
      await learningRepository.recordQuizSubmission({
        id: uuidv4(),
        userId,
        quizType: 'LESSON',
        quizId: quiz.id,
        courseId,
        score: result.score,
        passed: result.passed,
        answers: submission.answers,
        submittedAt: new Date().toISOString()
      });
    }

    return { ...result, xpEarned };
  }

  static async evaluateModuleQuiz(
    userId: string,
    moduleId: string,
    answers: { questionId: string; selectedIndex: number }[]
  ): Promise<QuizResultDto> {
    console.log('📝 [Learning Service] evaluateModuleQuiz START:', { userId, moduleId, answerCount: answers.length });
    
    try {
      const quiz = await learningRepository.getModuleQuiz(moduleId);
      console.log('   ✅ Got quiz:', { quizId: quiz?.id, questionsCount: quiz?.questions.length });
      if (!quiz) throw new Error('No quiz found for this module');

      // Gating check: log status, allow student quiz evaluation smoothly
      const progress = await learningRepository.getUserModuleProgress(userId, moduleId);
      console.log('   ✅ Got progress:', { progressId: progress?.id, allLessonsRead: progress?.allLessonsRead });

      const result = this.calculateQuizResult(quiz.questions, answers, quiz.passingScore);
      console.log('   ✅ Calculated result:', { score: result.score, passed: result.passed });
      
      const module = await learningRepository.getModuleById(moduleId);
      console.log('   ✅ Got module:', { moduleId: module?.id, courseId: module?.courseId });
      const xpEarned = result.passed ? 100 : 20;

      if (result.passed) {
        console.log('   🎉 Module passed! Emitting event...');
        this.emitProgressEvent('module.passed', {
          userId,
          courseId: module?.courseId,
          moduleId,
          score: result.score,
          xpEarned,
          skill: module?.targetSkill,
          skillPoints: module?.skillPointsOnPass ?? 40
        }).catch(err => console.error('Failed to emit module.passed event:', err.message));
      }

      console.log('   📝 Recording quiz submission...');
      await learningRepository.recordQuizSubmission({
        id: uuidv4(),
        userId,
        quizType: 'MODULE',
        quizId: quiz.id,
        courseId: module?.courseId,
        moduleId,
        score: result.score,
        passed: result.passed,
        answers,
        submittedAt: new Date().toISOString()
      });
      console.log('   ✅ Quiz submission recorded');

      const finalResult = { ...result, xpEarned };
      console.log('✅ [Learning Service] evaluateModuleQuiz COMPLETE:', { score: finalResult.score, passed: finalResult.passed });
      return finalResult;
    } catch (err: any) {
      console.error('❌ [Learning Service] evaluateModuleQuiz FAILED:', err.message);
      console.error('   Stack:', err.stack);
      throw err;
    }
  }

  static async evaluateCourseQuiz(
    userId: string,
    courseId: string,
    answers: { questionId: string; selectedIndex: number }[]
  ): Promise<QuizResultDto> {
    const quiz = await learningRepository.getCourseQuiz(courseId);
    if (!quiz) throw new Error('No final quiz found for this course');

    // Gating check: all modules passed?
    const course = await learningRepository.getCourseById(courseId, 'ADMIN');
    if (course?.modules) {
      for (const mod of course.modules) {
        const modProgress = await learningRepository.getUserModuleProgress(userId, mod.id);
        if (!modProgress || !modProgress.quizPassed) {
          throw new Error(`You must pass the quiz for module "${mod.title}" before taking the final exam`);
        }
      }
    }

    const result = this.calculateQuizResult(quiz.questions, answers, quiz.passingScore);
    const xpEarned = result.passed ? quiz.xpOnPass : 50;

    if (result.passed) {
      this.emitProgressEvent('course.completed', {
        userId,
        courseId,
        score: result.score,
        xpEarned,
        skill: course?.targetSkill,
        skillPoints: quiz.skillPointsOnPass
      }).catch(err => console.error('Failed to emit course.completed event:', err.message));
    }

    await learningRepository.recordQuizSubmission({
      id: uuidv4(),
      userId,
      quizType: 'COURSE',
      quizId: quiz.id,
      courseId,
      score: result.score,
      passed: result.passed,
      answers,
      submittedAt: new Date().toISOString()
    });

    return { ...result, xpEarned };
  }

  private static calculateQuizResult(
    questions: QuizQuestion[],
    submittedAnswers: { questionId: string; selectedIndex: number }[],
    passingScore: number
  ) {
    let correctCount = 0;
    const feedback: QuizQuestionFeedback[] = [];

    questions.forEach((q) => {
      const submitted = submittedAnswers.find((a) => a.questionId === q.id);
      const selectedIndex = submitted ? submitted.selectedIndex : -1;
      const isCorrect = selectedIndex === q.correctIndex;

      if (isCorrect) correctCount++;

      feedback.push({
        questionId: q.id,
        correct: isCorrect,
        explanation: q.explanation,
        selectedOption: selectedIndex,
        correctOption: q.correctIndex,
      });
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingScore;

    return {
      passed,
      score,
      totalQuestions: questions.length,
      correctCount,
      feedback
    };
  }

  static async getModuleById(id: string): Promise<ModuleDto | null> {
    return learningRepository.getModuleById(id);
  }

  static async checkModuleAccess(userId: string, moduleId: string): Promise<{ locked: boolean; reason?: string }> {
    const module = await learningRepository.getModuleById(moduleId);
    if (!module) return { locked: true, reason: 'Module not found' };

    const allModules = await learningRepository.getModulesByCourseId(module.courseId);
    const currentIndex = allModules.findIndex(m => m.id === moduleId);

    if (currentIndex > 0) {
      const prevModule = allModules[currentIndex - 1];
      const prevProgress = await learningRepository.getUserModuleProgress(userId, prevModule.id);
      if (!prevProgress || !prevProgress.quizPassed) {
        return { locked: true, reason: `Pass the quiz for "${prevModule.title}" to unlock this module` };
      }
    }

    return { locked: false };
  }

  // AI Quiz Generation
  static async generateAIModuleQuiz(moduleId: string): Promise<ModuleQuizDto> {
    const module = await learningRepository.getModuleById(moduleId);
    if (!module) throw new Error('Module not found');

    const lessons = await learningRepository.getLessonsByModuleId(moduleId);
    const content = lessons.map(l => l.contentMarkdown).join('\n\n');

    const questions = await AIService.generateModuleQuiz(module.title, content);

    const quiz: ModuleQuizDto = {
      id: uuidv4(),
      moduleId,
      title: `${module.title} Assessment`,
      passingScore: 80,
      questions,
      aiGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await learningRepository.saveModuleQuiz(quiz);
    return quiz;
  }

  static async getModuleQuiz(moduleId: string): Promise<ModuleQuizDto | null> {
    return await learningRepository.getModuleQuiz(moduleId);
  }

  static async generateAICourseQuiz(courseId: string): Promise<CourseQuizDto> {
    const course = await learningRepository.getCourseById(courseId, 'ADMIN');
    if (!course) throw new Error('Course not found');

    const modules = await learningRepository.getModulesByCourseId(courseId);
    let allContent = '';
    const allExistingQuestions: QuizQuestion[] = [];

    for (const mod of modules) {
      const lessons = await learningRepository.getLessonsByModuleId(mod.id);
      allContent += lessons.map(l => l.contentMarkdown).join('\n\n') + '\n\n';

      const modQuiz = await learningRepository.getModuleQuiz(mod.id);
      if (modQuiz) {
        allExistingQuestions.push(...modQuiz.questions);
      }
    }

    const questions = await AIService.generateCourseFinalQuiz(course.title, allContent, allExistingQuestions);

    const quiz: CourseQuizDto = {
      id: uuidv4(),
      courseId,
      title: `${course.title} Final Exam`,
      passingScore: 90,
      questions,
      aiGenerated: true,
      xpOnPass: 500,
      skillPointsOnPass: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await learningRepository.saveCourseQuiz(quiz);
    return quiz;
  }

  static async getCourseQuiz(courseId: string): Promise<CourseQuizDto | null> {
    return await learningRepository.getCourseQuiz(courseId);
  }

  static async saveManualModuleQuiz(
    moduleId: string,
    data: { title?: string; passingScore?: number; questions: QuizQuestion[] }
  ): Promise<ModuleQuizDto> {
    const module = await learningRepository.getModuleById(moduleId);
    if (!module) throw new Error('Module not found');

    const existing = await learningRepository.getModuleQuiz(moduleId);
    const quiz: ModuleQuizDto = {
      id: existing?.id || uuidv4(),
      moduleId,
      title: data.title?.trim() || existing?.title || `${module.title} Assessment`,
      passingScore: typeof data.passingScore === 'number' ? data.passingScore : (existing?.passingScore ?? 80),
      questions: data.questions.map((q, idx) => ({
        id: q.id || `q-${idx + 1}-${Date.now()}`,
        question: q.question.trim(),
        options: Array.isArray(q.options) ? q.options.map(opt => typeof opt === 'string' ? opt.trim() : String(opt)) : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation ? q.explanation.trim() : 'Correct answer verified by instructor.',
      })),
      aiGenerated: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await learningRepository.saveModuleQuiz(quiz);
    return quiz;
  }

  static async saveManualCourseQuiz(
    courseId: string,
    data: { title?: string; passingScore?: number; questions: QuizQuestion[]; xpOnPass?: number; skillPointsOnPass?: number }
  ): Promise<CourseQuizDto> {
    const course = await learningRepository.getCourseById(courseId, 'ADMIN');
    if (!course) throw new Error('Course not found');

    const existing = await learningRepository.getCourseQuiz(courseId);
    const quiz: CourseQuizDto = {
      id: existing?.id || uuidv4(),
      courseId,
      title: data.title?.trim() || existing?.title || `${course.title} Final Exam`,
      passingScore: typeof data.passingScore === 'number' ? data.passingScore : (existing?.passingScore ?? 90),
      questions: data.questions.map((q, idx) => ({
        id: q.id || `q-${idx + 1}-${Date.now()}`,
        question: q.question.trim(),
        options: Array.isArray(q.options) ? q.options.map(opt => typeof opt === 'string' ? opt.trim() : String(opt)) : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation ? q.explanation.trim() : 'Correct answer verified by instructor.',
      })),
      aiGenerated: false,
      xpOnPass: typeof data.xpOnPass === 'number' ? data.xpOnPass : (existing?.xpOnPass ?? 500),
      skillPointsOnPass: typeof data.skillPointsOnPass === 'number' ? data.skillPointsOnPass : (existing?.skillPointsOnPass ?? 100),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await learningRepository.saveCourseQuiz(quiz);
    return quiz;
  }

  // Phase 0: Internal Event Emission to Progress Service
  private static async emitProgressEvent(eventName: string, payload: any) {
    try {
      await axios.post(
        `${config.progressServiceInternalUrl}/api/v1/progress/events`,
        { eventName, payload },
        {
          headers: {
            'x-internal-secret': config.internalSecret,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ [Learning Service] Emitted ${eventName} event to Progress Service`);
    } catch (err: any) {
      console.warn(`⚠️ [Learning Service] Failed to emit ${eventName} event:`, err.response?.data?.error || err.message);
    }
  }
}
