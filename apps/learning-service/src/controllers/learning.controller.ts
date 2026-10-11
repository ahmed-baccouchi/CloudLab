import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { LearningService } from '../services/learning.service';
import { config } from '../config';
import {
  CreateTrackDto,
  UpdateTrackDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  ResourceAttachmentDto,
} from '@cloudlab/shared-types';

// Multer storage configuration for PDF/resource uploads
const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      if (!fs.existsSync(config.uploadsDir)) {
        fs.mkdirSync(config.uploadsDir, { recursive: true });
      }
    } catch (e) {}
    cb(null, config.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeName = file.originalname
      .replace(/[^a-z0-9._-]/gi, '_')
      .substring(0, 80);
    const id = uuidv4().substring(0, 8);
    cb(null, `${id}_${Date.now()}_${safeName || 'file'}${safeExt || '.bin'}`);
  },
});

export const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max per PDF
  fileFilter: (_req, file, cb) => {
    const lowerName = file.originalname.toLowerCase();
    if (
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.zip') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, MD, ZIP, PNG, JPG, JPEG'));
    }
  },
});

export class LearningController {
  // Helper to extract user info from gateway headers or auth middleware
  private static getUserFromReq(req: Request) {
    const userId = (req.headers['x-user-id'] as string) || (req as any).user?.sub;
    const role = (req.headers['x-user-role'] as string) || (req as any).user?.role;
    const email = (req.headers['x-user-email'] as string) || (req as any).user?.email;
    const firstName = req.headers['x-user-firstname']
      ? decodeURIComponent(req.headers['x-user-firstname'] as string)
      : (req as any).user?.firstName;
    const lastName = req.headers['x-user-lastname']
      ? decodeURIComponent(req.headers['x-user-lastname'] as string)
      : (req as any).user?.lastName;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || email || 'User';
    return { userId, role, email, fullName };
  }

  // ==========================================
  // Public & Role-Filtered Reads
  // ==========================================
  static async getTracks(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      const tracks = await LearningService.getAllTracks(role);
      res.json({ success: true, data: tracks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTrackById(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      const track = await LearningService.getTrackById(req.params.id, role);
      res.json({ success: true, data: track });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getTrackBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      const track = await LearningService.getTrackBySlug(req.params.slug, role);
      res.json({ success: true, data: track });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getAllCourses(req: Request, res: Response): Promise<void> {
    try {
      const { role, userId } = LearningController.getUserFromReq(req);
      const courses = await LearningService.getAllCourses(role, userId);
      res.json({ success: true, data: courses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getCourseById(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      const course = await LearningService.getCourseById(req.params.id, role);
      res.json({ success: true, data: course });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getCourseBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      const course = await LearningService.getCourseBySlug(req.params.slug, role);
      res.json({ success: true, data: course });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getLessonById(req: Request, res: Response): Promise<void> {
    try {
      const lesson = await LearningService.getLessonById(req.params.id);
      res.json({ success: true, data: lesson });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async submitQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { answers, courseId } = req.body;
      const lessonId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);

      if (!answers || !Array.isArray(answers)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'answers array required with questionId and selectedIndex',
        });
        return;
      }

      const result = await LearningService.evaluateQuiz(
        {
          lessonId,
          answers,
        },
        userId,
        courseId
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async submitModuleQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { answers } = req.body;
      const moduleId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);

      console.log('📥 [Learning Controller] submitModuleQuiz received:', { userId, moduleId, answerCount: answers?.length });

      if (!userId) {
        console.error('   ❌ No userId');
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!answers || !Array.isArray(answers)) {
        console.error('   ❌ Invalid answers format');
        res.status(400).json({ success: false, error: 'answers array required' });
        return;
      }

      console.log('   📝 Calling evaluateModuleQuiz...');
      const result = await LearningService.evaluateModuleQuiz(userId, moduleId, answers);
      console.log('   ✅ Quiz evaluated successfully:', { score: result.score, passed: result.passed });
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('❌ [Learning Controller] submitModuleQuiz error:', err.message);
      console.error('   Stack:', err.stack);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async submitCourseQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { answers } = req.body;
      const courseId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!answers || !Array.isArray(answers)) {
        res.status(400).json({ success: false, error: 'answers array required' });
        return;
      }

      const result = await LearningService.evaluateCourseQuiz(userId, courseId, answers);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getModuleQuiz(req: Request, res: Response): Promise<void> {
    try {
      const moduleId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check access gating
      const access = await LearningService.checkModuleAccess(userId, moduleId);
      if (access.locked) {
        res.status(403).json({ success: false, error: 'Locked', message: access.reason });
        return;
      }

      const quiz = await LearningService.getModuleQuiz(moduleId);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'No quiz found for this module' });
        return;
      }

      // Hide correct answers for students
      const sanitizedQuiz = {
        ...quiz,
        questions: quiz.questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options
        }))
      };

      res.json({ success: true, data: sanitizedQuiz });
    } catch (err: any) {
      console.error('❌ [Learning Controller] getModuleQuiz error:', err.message);
      console.error('Stack:', err.stack);
      res.status(500).json({ success: false, error: 'Failed to fetch quiz', details: err.message });
    }
  }

  static async getCourseQuiz(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const quiz = await LearningService.getCourseQuiz(courseId);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'No final exam found for this course' });
        return;
      }

      // Hide correct answers
      const sanitizedQuiz = {
        ...quiz,
        questions: quiz.questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options
        }))
      };

      res.json({ success: true, data: sanitizedQuiz });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async checkModuleAccess(req: Request, res: Response): Promise<void> {
    try {
      const moduleId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      const access = await LearningService.checkModuleAccess(userId, moduleId);
      res.json({ success: true, data: access });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async generateAIModuleQuiz(req: Request, res: Response): Promise<void> {
    try {
      const moduleId = req.params.id;
      const { role } = LearningController.getUserFromReq(req);

      if (role !== 'INSTRUCTOR' && role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Only instructors can generate AI quizzes' });
        return;
      }

      const quiz = await LearningService.generateAIModuleQuiz(moduleId);
      res.json({ success: true, data: quiz, message: 'AI Module Quiz generated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async generateAICourseQuiz(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const { role } = LearningController.getUserFromReq(req);

      if (role !== 'INSTRUCTOR' && role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Only instructors can generate AI quizzes' });
        return;
      }

      const quiz = await LearningService.generateAICourseQuiz(courseId);
      res.json({ success: true, data: quiz, message: 'AI Course Final Exam generated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Track Mutations
  // ==========================================
  static async createTrack(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateTrackDto = req.body;
      const created = await LearningService.createTrack(dto);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateTrack(req: Request, res: Response): Promise<void> {
    try {
      const dto: UpdateTrackDto = req.body;
      const updated = await LearningService.updateTrack(req.params.id, dto);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteTrack(req: Request, res: Response): Promise<void> {
    try {
      await LearningService.deleteTrack(req.params.id);
      res.json({ success: true, message: `Track ${req.params.id} deleted` });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Course Mutations & Publishing
  // ==========================================
  static async createCourse(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateCourseDto = req.body;
      const { userId, fullName } = LearningController.getUserFromReq(req);
      const created = await LearningService.createCourse(dto, userId, fullName);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateCourse(req: Request, res: Response): Promise<void> {
    try {
      const dto: UpdateCourseDto = req.body;
      const updated = await LearningService.updateCourse(req.params.id, dto);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async setCoursePublishStatus(req: Request, res: Response): Promise<void> {
    try {
      const { isPublished } = req.body;
      if (typeof isPublished !== 'boolean') {
        res.status(400).json({ success: false, error: 'isPublished boolean is required' });
        return;
      }
      const updated = await LearningService.setCoursePublishStatus(req.params.id, isPublished);
      res.json({
        success: true,
        data: updated,
        message: isPublished ? 'Course published successfully' : 'Course moved to draft status',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteCourse(req: Request, res: Response): Promise<void> {
    try {
      await LearningService.deleteCourse(req.params.id);
      res.json({ success: true, message: `Course ${req.params.id} deleted` });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Module Mutations & Reordering
  // ==========================================
  static async createModule(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateModuleDto = req.body;
      const created = await LearningService.createModule(dto);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateModule(req: Request, res: Response): Promise<void> {
    try {
      const dto: UpdateModuleDto = req.body;
      const updated = await LearningService.updateModule(req.params.id, dto);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteModule(req: Request, res: Response): Promise<void> {
    try {
      await LearningService.deleteModule(req.params.id);
      res.json({ success: true, message: `Module ${req.params.id} deleted` });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async reorderModules(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, moduleIds } = req.body;
      if (!courseId || !Array.isArray(moduleIds)) {
        res.status(400).json({ success: false, error: 'courseId and moduleIds array required' });
        return;
      }
      const updated = await LearningService.reorderModules(courseId, moduleIds);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Lesson Mutations & Reordering
  // ==========================================
  static async createLesson(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateLessonDto = req.body;
      const created = await LearningService.createLesson(dto);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateLesson(req: Request, res: Response): Promise<void> {
    try {
      const dto: UpdateLessonDto = req.body;
      const updated = await LearningService.updateLesson(req.params.id, dto);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteLesson(req: Request, res: Response): Promise<void> {
    try {
      await LearningService.deleteLesson(req.params.id);
      res.json({ success: true, message: `Lesson ${req.params.id} deleted` });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async reorderLessons(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId, lessonIds } = req.body;
      if (!moduleId || !Array.isArray(lessonIds)) {
        res.status(400).json({ success: false, error: 'moduleId and lessonIds array required' });
        return;
      }
      const updated = await LearningService.reorderLessons(moduleId, lessonIds);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Student Enrollment & Progress Tracking
  // ==========================================
  static async enrollInCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const { userId, email, fullName } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required to enroll' });
        return;
      }
      const enrollment = await LearningService.enrollStudent(userId, courseId, email, fullName);
      res.status(201).json({ success: true, data: enrollment, message: 'Successfully enrolled in course' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getEnrollment(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      const enrollment = await LearningService.getEnrollment(userId, courseId);
      res.json({ success: true, data: enrollment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getMyEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      const enrollments = await LearningService.getUserEnrollments(userId);
      res.json({ success: true, data: enrollments });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async completeLesson(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId, courseId } = req.body;
      const { userId } = LearningController.getUserFromReq(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      const updated = await LearningService.markLessonCompleted(userId, courseId, lessonId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Instructor Course Analytics
  // ==========================================
  static async getCourseAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const analytics = await LearningService.getCourseAnalytics(courseId);
      res.json({ success: true, data: analytics });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // PDF / Resource File Upload
  // ==========================================
  static async uploadResource(req: Request, res: Response): Promise<void> {
    try {
      const { role } = LearningController.getUserFromReq(req);
      if (role !== 'INSTRUCTOR' && role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only instructors and admins may upload course resources',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No file uploaded. Attach a file under the "file" field.',
        });
        return;
      }

      const file = req.file;
      const lowerName = file.originalname.toLowerCase();
      const fileType: ResourceAttachmentDto['fileType'] =
        lowerName.endsWith('.pdf') ? 'PDF'
        : lowerName.endsWith('.doc') || lowerName.endsWith('.docx') ? 'DOCUMENT'
        : 'FILE';

      const gatewayBase =
        process.env.GATEWAY_URL ||
        `http://localhost:${process.env.GATEWAY_PORT || '4000'}`;
      const publicUrl = `${gatewayBase}/uploads/learning-resources/${encodeURIComponent(file.filename)}`;

      const attachment: ResourceAttachmentDto = {
        id: `res-${uuidv4()}`,
        title: file.originalname,
        fileUrl: publicUrl,
        fileType,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      };

      console.log(`📄 [Learning Service] Resource uploaded: ${file.originalname} (${file.size} bytes) by role=${role}`);
      res.status(201).json({
        success: true,
        data: attachment,
        message: `${fileType} uploaded successfully`,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'Upload Failed',
        message: err.message || 'Unknown upload error',
      });
    }
  }
}
