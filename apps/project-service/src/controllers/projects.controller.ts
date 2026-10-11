import { Request, Response } from 'express';
import { projectsRepository } from '../db/projects.repository';
import { SchedulerService } from '../services/scheduler.service';
import { ProjectStatus, ProjectTaskStatus, ProjectMemberRole } from '@cloudlab/shared-types';

export class ProjectsController {
  // ==========================================
  // Skills
  // ==========================================
  static async getSkills(_req: Request, res: Response) {
    try {
      const skills = await projectsRepository.getSkills();
      return res.json({ success: true, data: skills });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getMySkills(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const skills = await projectsRepository.getStudentSkills(userId);
      return res.json({ success: true, data: skills });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Project CRUD & AI Plan
  // ==========================================
  static async listProjects(req: Request, res: Response) {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const list = await projectsRepository.getProjects({ status, search });
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      // Generate dynamic schedule if project has tasks
      if (project.tasks && project.tasks.length > 0) {
        project.schedule = SchedulerService.generateSchedule(project.id, project.tasks, project.createdAt);
      }

      return res.json({ success: true, data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createProject(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const userInfo = {
        firstName: req.user?.firstName || 'Student',
        lastName: req.user?.lastName || 'Engineer',
        email: req.user?.email || 'student@cloudlab.io',
      };

      const { title, description, objectives, difficulty, technologies, skills, durationDays, deadline } = req.body;
      if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Title and description are required' });
      }

      const project = await projectsRepository.createProject(userId, userInfo, {
        title,
        description,
        objectives: Array.isArray(objectives) ? objectives : [objectives].filter(Boolean),
        difficulty: difficulty || 'INTERMEDIATE',
        technologies: Array.isArray(technologies) ? technologies : [],
        skills: Array.isArray(skills) ? skills : [],
        durationDays: durationDays ? parseInt(durationDays, 10) : 14,
        deadline,
      });

      return res.status(201).json({ success: true, data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async generateAiPlan(req: any, res: Response) {
    try {
      const { title, description, objectives, difficulty, technologies, skills, durationDays } = req.body;
      const plan = SchedulerService.generateAiProjectPlan({
        title: title || 'Untitled CloudLab Project',
        description: description || '',
        objectives: objectives || [],
        difficulty: difficulty || 'INTERMEDIATE',
        technologies: technologies || [],
        skills: skills || [],
        durationDays: durationDays || 14,
      });

      return res.json({ success: true, data: plan });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async approveAiPlan(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;
      const { tasks, startRecruiting } = req.body;

      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      if (project.ownerId !== userId) {
        return res.status(403).json({ success: false, error: 'Only the project owner can approve the project plan' });
      }

      // Save initial tasks
      if (tasks && Array.isArray(tasks)) {
        await projectsRepository.saveTasksForProject(id, tasks);
      }

      const updatedStatus = startRecruiting ? ProjectStatus.RECRUITING : project.status;
      const updated = await projectsRepository.updateProject(id, {
        aiPlanApproved: true,
        status: updatedStatus,
      });

      await projectsRepository.logActivity(id, userId, 'Owner', 'AI_PLAN_APPROVED', {
        taskCount: tasks?.length || 0,
        status: updatedStatus,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Applications & Team (Max 4 students)
  // ==========================================
  static async applyToProject(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const userInfo = {
        firstName: req.user?.firstName || 'Student',
        lastName: req.user?.lastName || 'Member',
        email: req.user?.email || 'student@cloudlab.io',
      };

      const { id } = req.params;
      const { message } = req.body;

      const application = await projectsRepository.applyToProject(id, userId, message || '', userInfo);
      return res.status(201).json({ success: true, data: application });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async reviewApplication(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id, applicationId } = req.params;
      const { decision } = req.body; // 'ACCEPT' | 'REJECT'

      if (decision !== 'ACCEPT' && decision !== 'REJECT') {
        return res.status(400).json({ success: false, error: 'Decision must be ACCEPT or REJECT' });
      }

      const result = await projectsRepository.reviewApplication(id, applicationId, decision, userId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Schedule & Assignment Recommendations
  // ==========================================
  static async getProjectSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const schedule = SchedulerService.generateSchedule(id, project.tasks || [], project.createdAt);
      return res.json({ success: true, data: schedule });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAssignmentRecommendations(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const recommendations = SchedulerService.recommendAssignments(project.tasks || [], project.members || []);
      return res.json({ success: true, data: recommendations });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async assignTask(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id, taskId } = req.params;
      const { assignedTo } = req.body;

      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      // Only owner or instructors can assign tasks
      const isOwner = project.ownerId === userId;
      const isInstructor = req.user?.role === 'INSTRUCTOR' || req.user?.role === 'ADMIN';
      if (!isOwner && !isInstructor) {
        return res.status(403).json({ success: false, error: 'Only the project owner or instructor can modify task assignments' });
      }

      const task = await projectsRepository.assignTask(id, taskId, assignedTo, userId);
      return res.json({ success: true, data: task });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Task Submissions & Reviews
  // ==========================================
  static async submitTask(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const studentName = `${req.user?.firstName || 'Student'} ${req.user?.lastName || ''}`.trim();
      const { id, taskId } = req.params;
      const { files, screenshots, gitUrl, deploymentUrl, explanation } = req.body;

      if (!explanation && !gitUrl && !deploymentUrl && (!files || files.length === 0)) {
        return res.status(400).json({ success: false, error: 'Please provide at least one deliverable or explanation' });
      }

      const submission = await projectsRepository.submitTaskEvidence(id, taskId, userId, studentName, {
        files: files || [],
        screenshots: screenshots || [],
        gitUrl,
        deploymentUrl,
        explanation: explanation || 'Evidence submission for task completion',
      });

      return res.status(201).json({ success: true, data: submission });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async reviewTaskSubmission(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const reviewerName = `${req.user?.firstName || 'Project'} ${req.user?.lastName || 'Lead'}`.trim();
      const { id, taskId, submissionId } = req.params;
      const { decision, feedback } = req.body; // 'VALIDATE' | 'REJECT'

      if (decision !== 'VALIDATE' && decision !== 'REJECT') {
        return res.status(400).json({ success: false, error: 'Decision must be VALIDATE or REJECT' });
      }

      const project = await projectsRepository.getProjectById(id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      // Owner or Instructor can review submissions
      const isOwner = project.ownerId === userId;
      const isInstructor = req.user?.role === 'INSTRUCTOR' || req.user?.role === 'ADMIN';
      if (!isOwner && !isInstructor) {
        return res.status(403).json({ success: false, error: 'Only the project owner or instructors can review task evidence' });
      }

      const result = await projectsRepository.validateOrRejectSubmission(
        id,
        taskId,
        submissionId,
        decision,
        userId,
        reviewerName,
        feedback || (decision === 'VALIDATE' ? 'Approved & validated' : 'Needs revision')
      );

      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // ==========================================
  // Activity Stream & Notifications
  // ==========================================
  static async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const logs = await projectsRepository.getProjectActivity(id);
      return res.json({ success: true, data: logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getNotifications(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const notifs = await projectsRepository.getUserNotifications(userId);
      return res.json({ success: true, data: notifs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async markNotificationRead(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;
      await projectsRepository.markNotificationRead(id, userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
