import { Router } from 'express';
import { LearningController, resourceUpload } from '../controllers/learning.controller';
import { internalAuthMiddleware, authenticateJwt, requireRole } from '@cloudlab/shared-auth';
import { UserRole } from '@cloudlab/shared-types';
import { config } from '../config';

const router = Router();

// Middleware to authenticate either through API gateway forwarded headers or directly with JWT
const auth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticateJwt(config.jwtSecret)(req, res, next);
  }
  return internalAuthMiddleware({ required: false, internalSecret: config.internalSecret })(req, res, next);
};

// Require instructor or admin role for mutations
const requireAuthor = requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN);
// Track structure is admin-only
const requireAdmin = requireRole(UserRole.ADMIN);

// ==========================================
// Reads (Tracks, Courses, Lessons)
// ==========================================
router.get('/tracks', auth, LearningController.getTracks);
router.get('/tracks/id/:id', auth, LearningController.getTrackById);
router.get('/tracks/:slug', auth, LearningController.getTrackBySlug);
router.get('/courses', auth, LearningController.getAllCourses);
router.get('/courses/id/:id', auth, LearningController.getCourseById);
router.get('/courses/:slug', auth, LearningController.getCourseBySlug);
router.get('/lessons/:id', auth, LearningController.getLessonById);
router.post('/lessons/:id/quiz', auth, LearningController.submitQuiz);

// Module & Course Quizzes + Gating
router.get('/modules/:id/access', auth, LearningController.checkModuleAccess);
router.get('/modules/:id/quiz', auth, LearningController.getModuleQuiz);
router.post('/modules/:id/quiz', auth, LearningController.submitModuleQuiz);
router.put('/modules/:id/quiz', auth, requireAuthor, LearningController.saveModuleQuiz);
router.post('/modules/:id/quiz/save', auth, requireAuthor, LearningController.saveModuleQuiz);
router.post('/modules/:id/quiz/generate', auth, requireAuthor, LearningController.generateAIModuleQuiz);
router.get('/courses/:id/quiz', auth, LearningController.getCourseQuiz);
router.post('/courses/:id/quiz', auth, LearningController.submitCourseQuiz);
router.put('/courses/:id/quiz', auth, requireAuthor, LearningController.saveCourseQuiz);
router.post('/courses/:id/quiz/save', auth, requireAuthor, LearningController.saveCourseQuiz);
router.post('/courses/:id/quiz/generate', auth, requireAuthor, LearningController.generateAICourseQuiz);

// ==========================================
// Student Enrollment & Progress Tracking
// ==========================================
router.post('/courses/:id/enroll', auth, LearningController.enrollInCourse);
router.get('/courses/:id/enrollment', auth, LearningController.getEnrollment);
router.get('/enrollments/my', auth, LearningController.getMyEnrollments);
router.post('/lessons/complete', auth, LearningController.completeLesson);

// ==========================================
// Instructor Analytics
// ==========================================
router.get('/courses/:id/analytics', auth, requireAuthor, LearningController.getCourseAnalytics);

// ==========================================
// PDF / Resource File Upload (multipart)
// ==========================================
router.post('/resources/upload', auth, requireAuthor, resourceUpload.single('file'), LearningController.uploadResource);

// ==========================================
// Track Authoring CRUD
// ==========================================
router.post('/tracks', auth, requireAdmin, LearningController.createTrack);
router.put('/tracks/:id', auth, requireAdmin, LearningController.updateTrack);
router.delete('/tracks/:id', auth, requireAdmin, LearningController.deleteTrack);

// ==========================================
// Course Authoring CRUD & Publishing
// ==========================================
router.post('/courses', auth, requireAuthor, LearningController.createCourse);
router.put('/courses/:id', auth, requireAuthor, LearningController.updateCourse);
router.patch('/courses/:id/publish', auth, requireAuthor, LearningController.setCoursePublishStatus);
router.delete('/courses/:id', auth, requireAuthor, LearningController.deleteCourse);

// ==========================================
// Module Authoring CRUD & Reordering
// ==========================================
router.post('/modules', auth, requireAuthor, LearningController.createModule);
router.put('/modules/:id', auth, requireAuthor, LearningController.updateModule);
router.post('/modules/reorder', auth, requireAuthor, LearningController.reorderModules);
router.delete('/modules/:id', auth, requireAuthor, LearningController.deleteModule);

// ==========================================
// Lesson Authoring CRUD & Reordering
// ==========================================
router.post('/lessons', auth, requireAuthor, LearningController.createLesson);
router.put('/lessons/:id', auth, requireAuthor, LearningController.updateLesson);
router.post('/lessons/reorder', auth, requireAuthor, LearningController.reorderLessons);
router.delete('/lessons/:id', auth, requireAuthor, LearningController.deleteLesson);

export const learningRoutes = router;
