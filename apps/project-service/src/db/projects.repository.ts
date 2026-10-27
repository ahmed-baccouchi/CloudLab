import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  ProjectDto,
  ProjectStatus,
  ProjectMemberRole,
  ProjectApplicationStatus,
  ProjectTaskStatus,
  ProjectTaskDto,
  ProjectTaskSubmissionDto,
  ProjectMemberDto,
  ProjectApplicationDto,
  SkillDto,
  StudentSkillDto,
  SkillSourceType,
  ProjectActivityLogDto,
  ProjectNotificationDto,
  ProjectScheduleDto,
  TaskAssignmentRecommendationDto,
  AiProjectPlanResponse,
} from '@cloudlab/shared-types';
import { SchedulerService } from '../services/scheduler.service';

export class ProjectsRepository {
  private pool: mysql.Pool | null = null;
  private isConnected = false;

  // In-memory fallback stores for high resilience and local development
  private projects: Map<string, ProjectDto> = new Map();
  private members: Map<string, ProjectMemberDto> = new Map(); // key: `${projectId}_${userId}`
  private applications: Map<string, ProjectApplicationDto> = new Map(); // key: id
  private tasks: Map<string, ProjectTaskDto> = new Map(); // key: id
  private submissions: Map<string, ProjectTaskSubmissionDto[]> = new Map(); // key: taskId -> array of submissions
  private skills: Map<string, SkillDto> = new Map();
  private studentSkills: Map<string, StudentSkillDto> = new Map(); // key: `${studentId}_${skillId}`
  private activityLogs: Map<string, ProjectActivityLogDto[]> = new Map(); // key: projectId
  private notifications: Map<string, ProjectNotificationDto[]> = new Map(); // key: userId

  async initialize(): Promise<void> {
    try {
      // Step 1: Connect without selecting database to run CREATE DATABASE IF NOT EXISTS
      const bootstrapPool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        waitForConnections: true,
        connectionLimit: 2,
      });
      const bootstrapConn = await bootstrapPool.getConnection();
      await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      bootstrapConn.release();
      await bootstrapPool.end();
      console.log(`✅ [Project Service] Database "${config.database.database}" ready`);

      // Step 2: Connect to the project database
      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
      });

      const conn = await this.pool.getConnection();
      await this.createTables(conn);
      conn.release();
      this.isConnected = true;
      console.log('✅ [Project Service] Connected to MySQL and tables ready');
      await this.loadPersistedData();
    } catch (err: any) {
      console.warn('⚠️ [Project Service] MySQL unavailable (' + err.message + '). Operating with in-memory store.');
      this.isConnected = false;
    }

    await this.seedDefaultSkillsAndProjects();
  }

  private async createTables(conn: mysql.PoolConnection): Promise<void> {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) DEFAULT 'DevOps',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS student_skills (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        skill_id VARCHAR(36) NOT NULL,
        level INT DEFAULT 1,
        confidence FLOAT DEFAULT 0.5,
        source VARCHAR(50) DEFAULT 'COURSE',
        evidence_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_skill (student_id, skill_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        owner_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        objectives JSON,
        difficulty VARCHAR(50) DEFAULT 'INTERMEDIATE',
        technologies JSON,
        skills JSON,
        duration_days INT DEFAULT 14,
        deadline DATETIME NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        ai_plan_approved BOOLEAN DEFAULT FALSE,
        max_members INT DEFAULT 4,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role VARCHAR(50) DEFAULT 'MEMBER',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_project_member (project_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_applications (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        decided_at DATETIME NULL,
        UNIQUE KEY uq_project_app (project_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        phase VARCHAR(100) DEFAULT 'Phase 1: Setup',
        assigned_to VARCHAR(36) NULL,
        duration_days INT DEFAULT 3,
        start_date DATETIME NULL,
        deadline DATETIME NULL,
        status VARCHAR(50) DEFAULT 'TODO',
        prerequisite_task_ids JSON,
        required_skills JSON,
        technologies JSON,
        deliverables JSON,
        validation_criteria JSON,
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_task_submissions (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        student_name VARCHAR(255) NULL,
        files JSON,
        screenshots JSON,
        git_url VARCHAR(500) NULL,
        deployment_url VARCHAR(500) NULL,
        explanation TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        feedback TEXT NULL,
        reviewer_id VARCHAR(36) NULL,
        reviewer_name VARCHAR(255) NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255) NULL,
        action VARCHAR(100) NOT NULL,
        details JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        project_id VARCHAR(36) NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private async loadPersistedData(): Promise<void> {
    if (!this.pool) return;
    try {
      const [skillsRows]: any = await this.pool.query('SELECT * FROM skills');
      for (const row of skillsRows) {
        this.skills.set(row.id, {
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description,
          createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        });
      }

      const userMap = new Map<string, { id: string; firstName: string; lastName: string; email: string }>();
      try {
        const [authUsers]: any = await this.pool.query('SELECT id, first_name, last_name, email FROM cloudlab_auth.users');
        for (const u of authUsers) {
          userMap.set(u.id, {
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
          });
        }
      } catch (e) {}

      const [projectsRows]: any = await this.pool.query('SELECT * FROM projects');
      for (const row of projectsRows) {
        const ownerUser = userMap.get(row.owner_id);
        this.projects.set(row.id, {
          id: row.id,
          ownerUserId: row.owner_id,
          ownerId: row.owner_id,
          owner: ownerUser || {
            id: row.owner_id,
            firstName: 'Project',
            lastName: 'Owner',
            email: '',
          },
          title: row.title,
          description: row.description,
          objectives: typeof row.objectives === 'string' ? JSON.parse(row.objectives) : (row.objectives || []),
          difficulty: row.difficulty,
          technologies: typeof row.technologies === 'string' ? JSON.parse(row.technologies) : (row.technologies || []),
          skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills || []),
          durationDays: row.duration_days,
          deadline: row.deadline?.toISOString(),
          status: row.status,
          aiPlanApproved: Boolean(row.ai_plan_approved),
          maxMembers: row.max_members || 4,
          createdAt: row.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
        });
      }

      const [membersRows]: any = await this.pool.query('SELECT * FROM project_members');
      for (const row of membersRows) {
        const memberUser = userMap.get(row.user_id);
        this.members.set(`${row.project_id}_${row.user_id}`, {
          id: row.id,
          projectId: row.project_id,
          userId: row.user_id,
          role: row.role,
          user: memberUser || {
            id: row.user_id,
            firstName: 'Member',
            lastName: '',
            email: '',
          },
          joinedAt: row.joined_at?.toISOString() || new Date().toISOString(),
        });
      }

      const [appRows]: any = await this.pool.query('SELECT * FROM project_applications');
      for (const row of appRows) {
        const appUser = userMap.get(row.user_id);
        this.applications.set(row.id, {
          id: row.id,
          projectId: row.project_id,
          userId: row.user_id,
          message: row.message,
          status: row.status,
          user: appUser || {
            id: row.user_id,
            firstName: 'Applicant',
            lastName: '',
            email: '',
          },
          appliedAt: row.applied_at?.toISOString() || new Date().toISOString(),
          decidedAt: row.decided_at?.toISOString(),
        });
      }

      const [tasksRows]: any = await this.pool.query('SELECT * FROM project_tasks ORDER BY order_index ASC');
      for (const row of tasksRows) {
        this.tasks.set(row.id, {
          id: row.id,
          projectId: row.project_id,
          title: row.title,
          description: row.description,
          phase: row.phase,
          assignedTo: row.assigned_to,
          durationDays: row.duration_days,
          startDate: row.start_date?.toISOString(),
          deadline: row.deadline?.toISOString(),
          status: row.status,
          prerequisiteTaskIds: typeof row.prerequisite_task_ids === 'string' ? JSON.parse(row.prerequisite_task_ids) : (row.prerequisite_task_ids || []),
          requiredSkills: typeof row.required_skills === 'string' ? JSON.parse(row.required_skills) : (row.required_skills || []),
          technologies: typeof row.technologies === 'string' ? JSON.parse(row.technologies) : (row.technologies || []),
          deliverables: typeof row.deliverables === 'string' ? JSON.parse(row.deliverables) : (row.deliverables || []),
          validationCriteria: typeof row.validation_criteria === 'string' ? JSON.parse(row.validation_criteria) : (row.validation_criteria || []),
          orderIndex: row.order_index,
          createdAt: row.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
        });
      }

      const [subsRows]: any = await this.pool.query('SELECT * FROM project_task_submissions ORDER BY submitted_at ASC');
      for (const row of subsRows) {
        const list = this.submissions.get(row.task_id) || [];
        list.push({
          id: row.id,
          taskId: row.task_id,
          projectId: row.project_id || '',
          attemptIndex: row.attempt_index || 1,
          studentId: row.student_id,
          studentName: row.student_name,
          files: typeof row.files === 'string' ? JSON.parse(row.files) : (row.files || []),
          screenshots: typeof row.screenshots === 'string' ? JSON.parse(row.screenshots) : (row.screenshots || []),
          gitUrl: row.git_url,
          deploymentUrl: row.deployment_url,
          explanation: row.explanation,
          status: row.status,
          feedback: row.feedback,
          reviewerId: row.reviewer_id,
          reviewerName: row.reviewer_name,
          submittedAt: row.submitted_at?.toISOString() || new Date().toISOString(),
          reviewedAt: row.reviewed_at?.toISOString(),
        });
        this.submissions.set(row.task_id, list);
      }
    } catch (e: any) {
      console.warn('⚠️ [Projects Module] Failed to load data from MySQL:', e.message);
    }
  }

  private async seedDefaultSkillsAndProjects(): Promise<void> {
    const defaultSkills = [
      { name: 'Docker', category: 'Containers', description: 'Containerization, multi-stage builds, and Docker Compose' },
      { name: 'Kubernetes', category: 'Orchestration', description: 'Pods, Deployments, Services, Helm, and ingress' },
      { name: 'CI/CD Pipelines', category: 'Automation', description: 'GitHub Actions, GitLab CI, and automated testing' },
      { name: 'Terraform', category: 'Infrastructure as Code', description: 'Declarative cloud provisioning and state management' },
      { name: 'Linux Administration', category: 'Systems', description: 'Shell scripting, permissions, process management, and networking' },
      { name: 'Prometheus & Grafana', category: 'Observability', description: 'Metrics scraping, dashboards, alerting, and telemetry' },
      { name: 'AWS Cloud', category: 'Cloud Providers', description: 'EC2, S3, RDS, IAM, and VPC networking' },
      { name: 'Node.js & TypeScript', category: 'Backend', description: 'Fullstack backend services and REST APIs' },
    ];

    for (const s of defaultSkills) {
      const existing = Array.from(this.skills.values()).find((x) => x.name.toLowerCase() === s.name.toLowerCase());
      if (!existing) {
        const id = uuidv4();
        const skillObj: SkillDto = {
          id,
          name: s.name,
          category: s.category,
          description: s.description,
          createdAt: new Date().toISOString(),
        };
        this.skills.set(id, skillObj);
        if (this.pool) {
          try {
            await this.pool.query('INSERT IGNORE INTO skills (id, name, category, description) VALUES (?, ?, ?, ?)', [
              id,
              s.name,
              s.category,
              s.description,
            ]);
          } catch (e) {}
        }
      }
    }
  }

  // ==========================================
  // Skills Management
  // ==========================================
  async getSkills(): Promise<SkillDto[]> {
    return Array.from(this.skills.values());
  }

  async getStudentSkills(studentId: string): Promise<StudentSkillDto[]> {
    const list: StudentSkillDto[] = [];
    for (const [key, val] of this.studentSkills.entries()) {
      if (key.startsWith(`${studentId}_`)) {
        list.push(val);
      }
    }
    return list;
  }

  async recordStudentSkillEvidence(
    studentId: string,
    skillName: string,
    levelBoost: number,
    confidenceBoost: number,
    source: SkillSourceType,
    evidenceDetails: string
  ): Promise<StudentSkillDto> {
    // Find or create skill
    let skill = Array.from(this.skills.values()).find((s) => s.name.toLowerCase() === skillName.toLowerCase());
    if (!skill) {
      skill = {
        id: uuidv4(),
        name: skillName,
        category: 'General',
        createdAt: new Date().toISOString(),
      };
      this.skills.set(skill.id, skill);
      if (this.pool) {
        try {
          await this.pool.query('INSERT IGNORE INTO skills (id, name, category) VALUES (?, ?, ?)', [skill.id, skill.name, skill.category]);
        } catch (e) {}
      }
    }

    const key = `${studentId}_${skill.id}`;
    let record = this.studentSkills.get(key);
    const now = new Date().toISOString();

    if (!record) {
      record = {
        id: uuidv4(),
        studentId,
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        level: Math.min(5, Math.max(1, Math.round(levelBoost))),
        confidence: Math.min(1.0, Math.max(0.1, Number(confidenceBoost.toFixed(2)))),
        source,
        evidenceDetails,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      record.level = Math.min(5, Math.max(record.level, record.level + Math.round(levelBoost / 2)));
      record.confidence = Math.min(1.0, Number((record.confidence + confidenceBoost * 0.2).toFixed(2)));
      record.source = source;
      record.evidenceDetails = `${record.evidenceDetails ? record.evidenceDetails + ' | ' : ''}${evidenceDetails}`;
      record.updatedAt = now;
    }

    this.studentSkills.set(key, record);

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO student_skills (id, student_id, skill_id, level, confidence, source, evidence_details)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE level = ?, confidence = ?, source = ?, evidence_details = ?, updated_at = NOW()`,
          [
            record.id,
            studentId,
            skill.id,
            record.level,
            record.confidence,
            source,
            record.evidenceDetails,
            record.level,
            record.confidence,
            source,
            record.evidenceDetails,
          ]
        );
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to persist student skill:', e.message);
      }
    }

    return record;
  }

  // ==========================================
  // Projects Management
  // ==========================================
  async getProjects(filter?: { status?: string; search?: string }): Promise<ProjectDto[]> {
    let list = Array.from(this.projects.values());
    if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q)) ||
          p.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Attach counts & owner info
    return list.map((p) => {
      const members = this.getProjectMembersSync(p.id);
      return {
        ...p,
        currentMemberCount: members.length,
      };
    });
  }

  async getProjectById(id: string): Promise<ProjectDto | null> {
    const project = this.projects.get(id);
    if (!project) return null;

    const members = await this.getProjectMembers(id);
    const tasks = await this.getProjectTasks(id);
    const applications = await this.getProjectApplications(id);

    // Resolve owner info if missing
    let owner = project.owner;
    if (!owner || !owner.firstName) {
      const ownerMember = members.find((m) => m.userId === project.ownerId || m.role === ProjectMemberRole.OWNER);
      if (ownerMember?.user && ownerMember.user.firstName) {
        owner = ownerMember.user;
      }
    }

    return {
      ...project,
      owner,
      members,
      tasks,
      applications,
      currentMemberCount: members.length,
    };
  }

  async createProject(
    ownerId: string,
    ownerInfo: { firstName: string; lastName: string; email: string },
    data: {
      title: string;
      description: string;
      objectives: string[];
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      technologies: string[];
      skills: string[];
      durationDays: number;
      deadline?: string;
    }
  ): Promise<ProjectDto> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newProject: ProjectDto = {
      id,
      ownerUserId: ownerId,
      ownerId,
      owner: {
        id: ownerId,
        firstName: ownerInfo.firstName,
        lastName: ownerInfo.lastName,
        email: ownerInfo.email,
      },
      title: data.title,
      description: data.description,
      objectives: data.objectives || [],
      difficulty: data.difficulty || 'INTERMEDIATE',
      technologies: data.technologies || [],
      skills: data.skills || [],
      durationDays: data.durationDays || 14,
      deadline: data.deadline || new Date(Date.now() + (data.durationDays || 14) * 86400000).toISOString(),
      status: ProjectStatus.DRAFT,
      aiPlanApproved: false,
      maxMembers: 4,
      currentMemberCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, newProject);

    // Auto-add owner as first member
    const memberId = uuidv4();
    const ownerMember: ProjectMemberDto = {
      id: memberId,
      projectId: id,
      userId: ownerId,
      role: ProjectMemberRole.OWNER,
      joinedAt: now,
      user: {
        id: ownerId,
        firstName: ownerInfo.firstName,
        lastName: ownerInfo.lastName,
        email: ownerInfo.email,
      },
    };
    this.members.set(`${id}_${ownerId}`, ownerMember);

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO projects (id, owner_id, title, description, objectives, difficulty, technologies, skills, duration_days, deadline, status, ai_plan_approved, max_members)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newProject.id,
            ownerId,
            newProject.title,
            newProject.description,
            JSON.stringify(newProject.objectives),
            newProject.difficulty,
            JSON.stringify(newProject.technologies),
            JSON.stringify(newProject.skills),
            newProject.durationDays,
            newProject.deadline ? new Date(newProject.deadline) : null,
            newProject.status,
            newProject.aiPlanApproved,
            newProject.maxMembers,
          ]
        );

        await this.pool.query(
          `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
           VALUES (?, ?, ?, ?, ?)`,
          [memberId, id, ownerId, ProjectMemberRole.OWNER, new Date()]
        );
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to insert project to MySQL:', e.message);
      }
    }

    await this.logActivity(id, ownerId, `${ownerInfo.firstName} ${ownerInfo.lastName}`, 'PROJECT_CREATED', {
      title: data.title,
    });

    return newProject;
  }

  async updateProject(
    id: string,
    updates: Partial<ProjectDto>
  ): Promise<ProjectDto | null> {
    const project = this.projects.get(id);
    if (!project) return null;

    const updated = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updated);

    if (this.pool) {
      try {
        await this.pool.query(
          `UPDATE projects SET
            title = ?, description = ?, objectives = ?, difficulty = ?, technologies = ?,
            skills = ?, duration_days = ?, deadline = ?, status = ?, ai_plan_approved = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            updated.title,
            updated.description,
            JSON.stringify(updated.objectives),
            updated.difficulty,
            JSON.stringify(updated.technologies),
            JSON.stringify(updated.skills),
            updated.durationDays,
            updated.deadline ? new Date(updated.deadline) : null,
            updated.status,
            updated.aiPlanApproved,
            id,
          ]
        );
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to update project in MySQL:', e.message);
      }
    }

    return updated;
  }

  // ==========================================
  // Team Members & Applications (Max 4 students)
  // ==========================================
  private getProjectMembersSync(projectId: string): ProjectMemberDto[] {
    const list: ProjectMemberDto[] = [];
    for (const [key, val] of this.members.entries()) {
      if (key.startsWith(`${projectId}_`)) {
        list.push(val);
      }
    }
    return list;
  }

  async getProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
    const members = this.getProjectMembersSync(projectId);
    // Enrich with student skills
    for (const m of members) {
      if (m.user) {
        m.user.skills = await this.getStudentSkills(m.userId);
      }
    }
    return members;
  }

  async applyToProject(projectId: string, userId: string, message: string, userInfo: { firstName: string; lastName: string; email: string }): Promise<ProjectApplicationDto> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    if (project.status !== ProjectStatus.RECRUITING && project.status !== ProjectStatus.DRAFT) {
      throw new Error(`Project is not open for applications (Current status: ${project.status})`);
    }

    // Check if already a member
    if (this.members.has(`${projectId}_${userId}`)) {
      throw new Error('You are already a member of this project');
    }

    // Check for existing application
    const existing = Array.from(this.applications.values()).find(
      (a) => a.projectId === projectId && a.userId === userId
    );
    if (existing) {
      if (existing.status === ProjectApplicationStatus.PENDING) {
        throw new Error('You already have a pending application for this project');
      }
      if (existing.status === ProjectApplicationStatus.ACCEPTED) {
        throw new Error('You are already accepted into this project');
      }
    }

    // Check capacity
    const currentMembers = this.getProjectMembersSync(projectId);
    if (currentMembers.length >= 4) {
      throw new Error('This project has reached the maximum capacity of 4 members');
    }

    const appId = uuidv4();
    const app: ProjectApplicationDto = {
      id: appId,
      projectId,
      userId,
      message,
      status: ProjectApplicationStatus.PENDING,
      appliedAt: new Date().toISOString(),
      user: {
        id: userId,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        skills: await this.getStudentSkills(userId),
      },
    };

    this.applications.set(appId, app);

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO project_applications (id, project_id, user_id, message, status, applied_at)
           VALUES (?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE message = ?, status = 'PENDING', applied_at = NOW()`,
          [appId, projectId, userId, message, ProjectApplicationStatus.PENDING, message]
        );
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to save application in MySQL:', e.message);
      }
    }

    // Notify project owner
    await this.createNotification(
      project.ownerUserId,
      projectId,
      'APPLICATION_RECEIVED',
      'New Project Application',
      `${userInfo.firstName} ${userInfo.lastName} applied to join "${project.title}"`,
      { applicationId: appId, applicantId: userId }
    );

    await this.logActivity(projectId, userId, `${userInfo.firstName} ${userInfo.lastName}`, 'APPLICATION_SUBMITTED', {
      message,
    });

    return app;
  }

  async getProjectApplications(projectId: string): Promise<ProjectApplicationDto[]> {
    const list = Array.from(this.applications.values()).filter((a) => a.projectId === projectId);
    for (const a of list) {
      if (a.user) {
        a.user.skills = await this.getStudentSkills(a.userId);
      }
    }
    return list;
  }

  async reviewApplication(
    projectId: string,
    applicationId: string,
    decision: 'ACCEPT' | 'REJECT',
    ownerId: string
  ): Promise<{ application: ProjectApplicationDto; projectStatus: ProjectStatus }> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    if (project.ownerId !== ownerId) throw new Error('Only the project owner can review applications');

    const app = this.applications.get(applicationId);
    if (!app || app.projectId !== projectId) throw new Error('Application not found');

    const now = new Date().toISOString();

    if (decision === 'REJECT') {
      app.status = ProjectApplicationStatus.REJECTED;
      app.decidedAt = now;
      this.applications.set(applicationId, app);

      if (this.pool) {
        try {
          await this.pool.query('UPDATE project_applications SET status = ?, decided_at = NOW() WHERE id = ?', [
            ProjectApplicationStatus.REJECTED,
            applicationId,
          ]);
        } catch (e) {}
      }

      await this.createNotification(
        app.userId,
        projectId,
        'APPLICATION_DECISION',
        'Project Application Update',
        `Your application for "${project.title}" was not accepted at this time.`
      );

      return { application: app, projectStatus: project.status as ProjectStatus };
    }

    // ACCEPT Decision
    // Enforce 4 member cap strictly
    const currentMembers = this.getProjectMembersSync(projectId);
    if (currentMembers.length >= 4) {
      throw new Error('Project already has the maximum of 4 members');
    }

    app.status = ProjectApplicationStatus.ACCEPTED;
    app.decidedAt = now;
    this.applications.set(applicationId, app);

    // Add user as member
    const memberId = uuidv4();
    const newMember: ProjectMemberDto = {
      id: memberId,
      projectId,
      userId: app.userId,
      role: ProjectMemberRole.MEMBER,
      joinedAt: now,
      user: app.user,
    };
    this.members.set(`${projectId}_${app.userId}`, newMember);

    if (this.pool) {
      try {
        await this.pool.query('UPDATE project_applications SET status = ?, decided_at = NOW() WHERE id = ?', [
          ProjectApplicationStatus.ACCEPTED,
          applicationId,
        ]);
        await this.pool.query(
          `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [memberId, projectId, app.userId, ProjectMemberRole.MEMBER]
        );
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to accept member in MySQL:', e.message);
      }
    }

    const updatedMembers = this.getProjectMembersSync(projectId);
    let finalProjectStatus = project.status;

    // Requirement: When 4 members are accepted, applications close and the project starts automatically
    if (updatedMembers.length >= 4) {
      finalProjectStatus = ProjectStatus.IN_PROGRESS;
      project.status = ProjectStatus.IN_PROGRESS;
      project.updatedAt = now;
      this.projects.set(projectId, project);

      if (this.pool) {
        try {
          await this.pool.query('UPDATE projects SET status = ?, updated_at = NOW() WHERE id = ?', [
            ProjectStatus.IN_PROGRESS,
            projectId,
          ]);
        } catch (e) {}
      }

      // Notify all 4 team members that team is formed and project is started
      for (const m of updatedMembers) {
        await this.createNotification(
          m.userId,
          projectId,
          'TEAM_FORMED',
          'Team Formed & Project Started!',
          `Team of 4 formed for "${project.title}"! Applications closed and work is now in progress.`
        );
      }
    } else {
      await this.createNotification(
        app.userId,
        projectId,
        'APPLICATION_DECISION',
        'Application Accepted!',
        `Congratulations! You were accepted into project "${project.title}". (${updatedMembers.length}/4 members)`
      );
    }

    await this.logActivity(projectId, ownerId, 'Owner', 'APPLICATION_ACCEPTED', {
      acceptedUserId: app.userId,
      newMemberCount: updatedMembers.length,
      projectStarted: updatedMembers.length >= 4,
    });

    return { application: app, projectStatus: finalProjectStatus as ProjectStatus };
  }

  // ==========================================
  // Tasks, Dependencies & Auto-Locking
  // ==========================================
  async getProjectTasks(projectId: string): Promise<ProjectTaskDto[]> {
    let list = Array.from(this.tasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // If no tasks exist for this project, auto-generate standard agile roadmap tasks
    if (list.length === 0) {
      const project = this.projects.get(projectId);
      if (project) {
        const plan = SchedulerService.generateAiProjectPlan({
          title: project.title,
          description: project.description,
          objectives: project.objectives || [],
          difficulty: project.difficulty || 'INTERMEDIATE',
          technologies: project.technologies || [],
          skills: project.skills || [],
          durationDays: project.durationDays || 14,
        });

        const flattenedTasks: any[] = [];
        let globalIdx = 0;
        plan.phases.forEach((phase) => {
          phase.tasks.forEach((task) => {
            flattenedTasks.push({
              id: `task_${projectId}_${globalIdx}`,
              title: task.title,
              description: task.description,
              phase: phase.name,
              durationDays: task.durationDays,
              requiredSkills: task.skills,
              technologies: task.technologies,
              deliverables: task.deliverables,
              validationCriteria: task.validationCriteria,
              prerequisiteTaskIds: task.prerequisiteIndices.map((i) => `task_${projectId}_${i}`),
              orderIndex: globalIdx,
            });
            globalIdx++;
          });
        });

        await this.saveTasksForProject(projectId, flattenedTasks);
        list = Array.from(this.tasks.values())
          .filter((t) => t.projectId === projectId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      }
    }

    // Refresh lock statuses based on prerequisites
    const validatedIds = new Set(
      list.filter((t) => t.status === ProjectTaskStatus.VALIDATED).map((t) => t.id)
    );

    return list.map((task) => {
      // Check submissions
      const subs = this.submissions.get(task.id) || [];
      const latestSub = subs.length > 0 ? subs[subs.length - 1] : undefined;

      // Lock evaluation: If prerequisites exist and not all are VALIDATED, status must be LOCKED
      let currentStatus = task.status;
      if (task.status !== ProjectTaskStatus.VALIDATED) {
        const hasUnmetPrereqs = task.prerequisiteTaskIds.some((id) => !validatedIds.has(id));
        if (hasUnmetPrereqs) {
          currentStatus = ProjectTaskStatus.LOCKED;
        } else if (task.status === ProjectTaskStatus.LOCKED) {
          // Prerequisites are now met, unlock to TODO
          currentStatus = ProjectTaskStatus.TODO;
        }
      }

      const isOverdue =
        task.deadline && currentStatus !== ProjectTaskStatus.VALIDATED
          ? new Date(task.deadline).getTime() < Date.now()
          : false;

      return {
        ...task,
        status: currentStatus,
        submissions: subs,
        latestSubmission: latestSub,
        isOverdue,
      };
    });
  }

  async saveTasksForProject(projectId: string, tasksToSave: Partial<ProjectTaskDto>[]): Promise<ProjectTaskDto[]> {
    const saved: ProjectTaskDto[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < tasksToSave.length; i++) {
      const item = tasksToSave[i];
      const id = item.id || uuidv4();
      const existing = this.tasks.get(id);

      const taskObj: ProjectTaskDto = {
        id,
        projectId,
        title: item.title || `Task ${i + 1}`,
        description: item.description || '',
        phase: item.phase || 'Phase 1',
        assignedTo: item.assignedTo || null,
        durationDays: item.durationDays || 3,
        startDate: item.startDate || now,
        deadline: item.deadline || new Date(Date.now() + (item.durationDays || 3) * 86400000).toISOString(),
        status: item.status || ProjectTaskStatus.TODO,
        prerequisiteTaskIds: item.prerequisiteTaskIds || [],
        requiredSkills: item.requiredSkills || [],
        technologies: item.technologies || [],
        deliverables: item.deliverables || [],
        validationCriteria: item.validationCriteria || [],
        orderIndex: i,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      this.tasks.set(id, taskObj);
      saved.push(taskObj);

      if (this.pool) {
        try {
          await this.pool.query(
            `INSERT INTO project_tasks (
              id, project_id, title, description, phase, assigned_to, duration_days, start_date, deadline,
              status, prerequisite_task_ids, required_skills, technologies, deliverables, validation_criteria, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              title = ?, description = ?, phase = ?, assigned_to = ?, duration_days = ?, start_date = ?, deadline = ?,
              status = ?, prerequisite_task_ids = ?, required_skills = ?, technologies = ?, deliverables = ?, validation_criteria = ?, order_index = ?, updated_at = NOW()`,
            [
              id,
              projectId,
              taskObj.title,
              taskObj.description,
              taskObj.phase,
              taskObj.assignedTo,
              taskObj.durationDays,
              taskObj.startDate ? new Date(taskObj.startDate) : null,
              taskObj.deadline ? new Date(taskObj.deadline) : null,
              taskObj.status,
              JSON.stringify(taskObj.prerequisiteTaskIds),
              JSON.stringify(taskObj.requiredSkills),
              JSON.stringify(taskObj.technologies),
              JSON.stringify(taskObj.deliverables),
              JSON.stringify(taskObj.validationCriteria),
              i,
              // Update values
              taskObj.title,
              taskObj.description,
              taskObj.phase,
              taskObj.assignedTo,
              taskObj.durationDays,
              taskObj.startDate ? new Date(taskObj.startDate) : null,
              taskObj.deadline ? new Date(taskObj.deadline) : null,
              taskObj.status,
              JSON.stringify(taskObj.prerequisiteTaskIds),
              JSON.stringify(taskObj.requiredSkills),
              JSON.stringify(taskObj.technologies),
              JSON.stringify(taskObj.deliverables),
              JSON.stringify(taskObj.validationCriteria),
              i,
            ]
          );
        } catch (e: any) {
          console.warn('⚠️ [Projects Module] Failed to save task in MySQL:', e.message);
        }
      }
    }

    const project = this.projects.get(projectId);
    if (project && saved.length > 0) {
      const members = this.getProjectMembersSync(projectId);
      for (const m of members) {
        await this.createNotification(
          m.userId,
          projectId,
          'PHASE_UNLOCKED',
          'Project Steps Roadmap Updated 🗺️',
          `Roadmap for "${project.title}" has ${saved.length} development steps scheduled.`,
          { taskCount: saved.length }
        );
      }
    }

    return saved;
  }

  async assignTask(projectId: string, taskId: string, assignedTo: string | null, assignerId: string): Promise<ProjectTaskDto> {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) throw new Error('Task not found');

    task.assignedTo = assignedTo;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    if (this.pool) {
      try {
        await this.pool.query('UPDATE project_tasks SET assigned_to = ?, updated_at = NOW() WHERE id = ?', [
          assignedTo,
          taskId,
        ]);
      } catch (e) {}
    }

    if (assignedTo) {
      await this.createNotification(
        assignedTo,
        projectId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned to task: "${task.title}"`,
        { taskId }
      );
    }

    await this.logActivity(projectId, assignerId, 'Member', 'TASK_ASSIGNED', {
      taskId,
      taskTitle: task.title,
      assignedTo,
    });

    return task;
  }

  // ==========================================
  // Submissions & Strict Append-Only History
  // ==========================================
  async submitTaskEvidence(
    projectId: string,
    taskId: string,
    studentId: string,
    studentName: string,
    evidence: {
      files: string[];
      screenshots: string[];
      gitUrl?: string;
      deploymentUrl?: string;
      explanation: string;
    }
  ): Promise<ProjectTaskSubmissionDto> {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) throw new Error('Task not found');

    if (task.status === ProjectTaskStatus.LOCKED) {
      throw new Error('Cannot submit evidence for a locked task. Prerequisites must be completed first.');
    }

    const submissionId = uuidv4();
    const now = new Date().toISOString();
    const submission: ProjectTaskSubmissionDto = {
      id: submissionId,
      taskId,
      projectId,
      attemptIndex: (this.submissions.get(taskId) || []).length + 1,
      studentId,
      studentName,
      files: evidence.files || [],
      screenshots: evidence.screenshots || [],
      gitUrl: evidence.gitUrl,
      deploymentUrl: evidence.deploymentUrl,
      explanation: evidence.explanation,
      status: 'PENDING',
      submittedAt: now,
    };

    // Append to history - NEVER overwrite
    const history = this.submissions.get(taskId) || [];
    history.push(submission);
    this.submissions.set(taskId, history);

    // Update task status to IN_REVIEW
    task.status = ProjectTaskStatus.IN_REVIEW;
    task.updatedAt = now;
    this.tasks.set(taskId, task);

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO project_task_submissions (
            id, task_id, student_id, student_name, files, screenshots, git_url, deployment_url, explanation, status, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
          [
            submissionId,
            taskId,
            studentId,
            studentName,
            JSON.stringify(evidence.files || []),
            JSON.stringify(evidence.screenshots || []),
            evidence.gitUrl || null,
            evidence.deploymentUrl || null,
            evidence.explanation,
          ]
        );

        await this.pool.query('UPDATE project_tasks SET status = ?, updated_at = NOW() WHERE id = ?', [
          ProjectTaskStatus.IN_REVIEW,
          taskId,
        ]);
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to append task submission:', e.message);
      }
    }

    // Notify project owner and squad members
    const project = this.projects.get(projectId);
    if (project) {
      await this.createNotification(
        project.ownerUserId,
        projectId,
        'TASK_SUBMISSION',
        'Task Step Submitted for Review',
        `${studentName} submitted evidence for "${task.title}".`,
        { taskId, submissionId }
      );

      const members = this.getProjectMembersSync(projectId);
      for (const m of members) {
        if (m.userId !== studentId && m.userId !== project.ownerUserId) {
          await this.createNotification(
            m.userId,
            projectId,
            'TASK_SUBMISSION',
            'Squad Task Progress Update',
            `${studentName} submitted step "${task.title}" for review.`,
            { taskId, submissionId }
          );
        }
      }
    }

    await this.logActivity(projectId, studentId, studentName, 'TASK_SUBMITTED', {
      taskId,
      taskTitle: task.title,
      submissionId,
    });

    return submission;
  }

  async validateOrRejectSubmission(
    projectId: string,
    taskId: string,
    submissionId: string,
    decision: 'VALIDATE' | 'REJECT',
    reviewerId: string,
    reviewerName: string,
    feedback: string
  ): Promise<{ task: ProjectTaskDto; isProjectCompleted: boolean }> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) throw new Error('Task not found');

    const history = this.submissions.get(taskId) || [];
    const submission = history.find((s) => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');

    const now = new Date().toISOString();
    submission.reviewedAt = now;
    submission.reviewerId = reviewerId;
    submission.reviewerName = reviewerName;
    submission.feedback = feedback;

    let isProjectCompleted = false;

    if (decision === 'VALIDATE') {
      submission.status = 'VALIDATED';
      task.status = ProjectTaskStatus.VALIDATED;
      task.updatedAt = now;
      this.tasks.set(taskId, task);

      // Boost student skill levels & confidence from validated task
      if (submission.studentId && task.requiredSkills.length > 0) {
        for (const skill of task.requiredSkills) {
          await this.recordStudentSkillEvidence(
            submission.studentId,
            skill,
            1, // level boost
            0.15, // confidence boost
            SkillSourceType.PROJECT_TASK,
            `Validated task "${task.title}" on project "${project.title}"`
          );
        }
      }

      await this.createNotification(
        submission.studentId,
        projectId,
        'TASK_VALIDATED',
        'Step Validated & Approved! 🌟',
        `Your submission for "${task.title}" was approved by ${reviewerName}. Skills updated!`,
        { taskId, feedback }
      );

      const members = this.getProjectMembersSync(projectId);
      for (const m of members) {
        if (m.userId !== submission.studentId) {
          await this.createNotification(
            m.userId,
            projectId,
            'TASK_VALIDATED',
            'Project Step Completed ✅',
            `Step "${task.title}" was approved and validated.`,
            { taskId }
          );
        }
      }

      // Check if subsequent downstream tasks/steps are unlocked by this validation
      const allProjectTasks = Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
      const validatedIds = new Set(
        allProjectTasks.filter((t) => t.status === ProjectTaskStatus.VALIDATED).map((t) => t.id)
      );
      for (const t of allProjectTasks) {
        if (t.status === ProjectTaskStatus.LOCKED) {
          const hasUnmet = t.prerequisiteTaskIds.some((pid) => !validatedIds.has(pid));
          if (!hasUnmet) {
            t.status = ProjectTaskStatus.TODO;
            t.updatedAt = now;
            this.tasks.set(t.id, t);
            if (this.pool) {
              await this.pool.query('UPDATE project_tasks SET status = ?, updated_at = NOW() WHERE id = ?', [
                ProjectTaskStatus.TODO,
                t.id,
              ]).catch(() => {});
            }
            for (const m of members) {
              await this.createNotification(
                m.userId,
                projectId,
                'PHASE_UNLOCKED',
                'Next Step Unlocked! 🚀',
                `Prerequisites met for step "${t.title}". The step is now ready to begin!`,
                { taskId: t.id }
              );
            }
          }
        }
      }

      // Check if all tasks in project are validated -> project completion
      const allTasks = Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
      const allCompleted = allTasks.length > 0 && allTasks.every((t) => t.status === ProjectTaskStatus.VALIDATED);

      if (allCompleted) {
        project.status = ProjectStatus.COMPLETED;
        project.updatedAt = now;
        this.projects.set(projectId, project);
        isProjectCompleted = true;

        if (this.pool) {
          try {
            await this.pool.query('UPDATE projects SET status = ?, updated_at = NOW() WHERE id = ?', [
              ProjectStatus.COMPLETED,
              projectId,
            ]);
          } catch (e) {}
        }

        const members = this.getProjectMembersSync(projectId);
        for (const m of members) {
          await this.createNotification(
            m.userId,
            projectId,
            'PROJECT_COMPLETED',
            '🎉 Project Completed!',
            `Congratulations! All tasks for "${project.title}" have been validated. Project is completed!`
          );
        }
      }
    } else {
      // REJECTED: Resubmission is permitted; history is never overwritten
      submission.status = 'REJECTED';
      task.status = ProjectTaskStatus.REJECTED;
      task.updatedAt = now;
      this.tasks.set(taskId, task);

      await this.createNotification(
        submission.studentId,
        projectId,
        'TASK_REJECTED',
        'Task Submission Needs Revision',
        `Your submission for "${task.title}" was rejected: ${feedback}. You can revise and resubmit.`,
        { taskId, feedback }
      );
    }

    if (this.pool) {
      try {
        await this.pool.query(
          `UPDATE project_task_submissions SET
            status = ?, feedback = ?, reviewer_id = ?, reviewer_name = ?, reviewed_at = NOW()
           WHERE id = ?`,
          [submission.status, feedback, reviewerId, reviewerName, submissionId]
        );
        await this.pool.query('UPDATE project_tasks SET status = ?, updated_at = NOW() WHERE id = ?', [
          task.status,
          taskId,
        ]);
      } catch (e: any) {
        console.warn('⚠️ [Projects Module] Failed to update submission in MySQL:', e.message);
      }
    }

    await this.logActivity(projectId, reviewerId, reviewerName, `TASK_${decision}D`, {
      taskId,
      taskTitle: task.title,
      studentId: submission.studentId,
      feedback,
    });

    return { task, isProjectCompleted };
  }

  // ==========================================
  // Project Activity Logs & Notifications
  // ==========================================
  async logActivity(projectId: string, userId: string, userName: string, action: string, details?: Record<string, any>): Promise<void> {
    const id = uuidv4();
    const entry: ProjectActivityLogDto = {
      id,
      projectId,
      userId,
      userName,
      action,
      details,
      createdAt: new Date().toISOString(),
    };

    const logs = this.activityLogs.get(projectId) || [];
    logs.unshift(entry);
    this.activityLogs.set(projectId, logs.slice(0, 100));

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO project_activity_logs (id, project_id, user_id, user_name, action, details)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, projectId, userId, userName, action, details ? JSON.stringify(details) : null]
        );
      } catch (e) {}
    }
  }

  async getProjectActivity(projectId: string): Promise<ProjectActivityLogDto[]> {
    return this.activityLogs.get(projectId) || [];
  }

  async createNotification(
    userId: string,
    projectId: string | undefined,
    type: ProjectNotificationDto['type'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<ProjectNotificationDto> {
    const notif: ProjectNotificationDto = {
      id: uuidv4(),
      userId,
      projectId,
      type,
      title,
      message,
      read: false,
      metadata,
      createdAt: new Date().toISOString(),
    };

    const list = this.notifications.get(userId) || [];
    list.unshift(notif);
    this.notifications.set(userId, list.slice(0, 50));

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO project_notifications (id, user_id, project_id, type, title, message, is_read, metadata)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          [notif.id, userId, projectId || null, type, title, message, metadata ? JSON.stringify(metadata) : null]
        );
      } catch (e) {}

      try {
        await this.pool.query(
          `INSERT INTO notifications (id, user_id, type, title, message, reference_id, link_url, is_read, created_at)
           VALUES (?, ?, 'PROJECT_EVENT', ?, ?, ?, ?, 0, NOW())`,
          [
            notif.id,
            userId,
            title,
            message,
            projectId || null,
            projectId ? `/projects/${projectId}` : '/projects',
          ]
        );
      } catch (e) {}
    }

    return notif;
  }

  async getUserNotifications(userId: string): Promise<ProjectNotificationDto[]> {
    return this.notifications.get(userId) || [];
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    const list = this.notifications.get(userId) || [];
    const target = list.find((n) => n.id === id);
    if (target) target.read = true;

    if (this.pool) {
      try {
        await this.pool.query('UPDATE project_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
          id,
          userId,
        ]);
      } catch (e) {}
    }
  }
}

export const projectsRepository = new ProjectsRepository();
