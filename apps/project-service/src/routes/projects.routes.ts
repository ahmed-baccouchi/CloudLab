import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { config } from '../config';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * Flexible auth middleware for project-service.
 *
 * Priority order:
 * 1. If gateway has already verified the JWT and forwarded x-user-id header → use those headers (no re-verification needed)
 * 2. If a raw Bearer token is present (e.g. direct Postman calls) → verify JWT directly
 * 3. Otherwise → anonymous (req.user is undefined; controllers that need auth will return 401)
 */
const auth = (req: any, res: any, next: any) => {
  // Case 1: Gateway already authenticated — trust forwarded headers
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    req.user = {
      id: gatewayUserId,
      userId: gatewayUserId,
      email: req.headers['x-user-email'] || '',
      role: req.headers['x-user-role'] || 'STUDENT',
      firstName: decodeURIComponent(req.headers['x-user-firstname'] || ''),
      lastName: decodeURIComponent(req.headers['x-user-lastname'] || ''),
    };
    return next();
  }

  // Case 2: Direct Bearer token (Postman / direct calls)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      req.user = {
        id: decoded.sub || decoded.id,
        userId: decoded.sub || decoded.id,
        email: decoded.email || '',
        role: decoded.role || 'STUDENT',
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
      };
      return next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      });
    }
  }

  // Case 3: Anonymous — pass through (controllers decide if auth required)
  next();
};

// ─── Skills ────────────────────────────────────────────────────────────────
router.get('/skills', auth, ProjectsController.getSkills);
router.get('/skills/my', auth, ProjectsController.getMySkills);

// ─── Notifications (must be before /:id wildcard!) ─────────────────────────
router.get('/user/notifications', auth, ProjectsController.getNotifications);
router.post('/user/notifications/:id/read', auth, ProjectsController.markNotificationRead);

// ─── AI Planning (must be before /:id wildcard!) ───────────────────────────
router.post('/ai-plan', auth, ProjectsController.generateAiPlan);

// ─── Projects CRUD ─────────────────────────────────────────────────────────
router.get('/', auth, ProjectsController.listProjects);
router.post('/', auth, ProjectsController.createProject);
router.get('/:id', auth, ProjectsController.getProject);

// ─── AI Plan Approval ──────────────────────────────────────────────────────
router.post('/:id/approve-plan', auth, ProjectsController.approveAiPlan);

// ─── Team Applications ─────────────────────────────────────────────────────
router.post('/:id/apply', auth, ProjectsController.applyToProject);
router.post('/:id/applications/:applicationId/review', auth, ProjectsController.reviewApplication);

// ─── Schedule & Recommendations ────────────────────────────────────────────
router.get('/:id/schedule', auth, ProjectsController.getProjectSchedule);
router.get('/:id/recommendations', auth, ProjectsController.getAssignmentRecommendations);
router.post('/:id/tasks/:taskId/assign', auth, ProjectsController.assignTask);

// ─── Task Submissions & Validation ─────────────────────────────────────────
router.post('/:id/tasks/:taskId/submit', auth, ProjectsController.submitTask);
router.post('/:id/tasks/:taskId/submissions/:submissionId/review', auth, ProjectsController.reviewTaskSubmission);

// ─── Activity Stream ────────────────────────────────────────────────────────
router.get('/:id/activity', auth, ProjectsController.getActivity);

export const projectRoutes = router;
