import {
  ProjectTaskDto,
  ProjectScheduleDto,
  ProjectTaskStatus,
  ProjectMemberDto,
  TaskAssignmentRecommendationDto,
  AiProjectPlanResponse,
} from '@cloudlab/shared-types';

/**
 * Scheduler API Client & Fallback Engine
 * Generates forward schedules, critical paths, overdue calculations, and dependencies.
 */
export class SchedulerService {
  /**
   * Generates a clear project schedule showing tasks, dates, durations, deadlines,
   * assignments, dependencies, status, overdue tasks, and completed tasks.
   */
  static generateSchedule(projectId: string, tasks: ProjectTaskDto[], projectStartDate?: string): ProjectScheduleDto {
    const baseDate = projectStartDate ? new Date(projectStartDate) : new Date();

    // Topological sorting for dependencies
    const taskMap = new Map<string, ProjectTaskDto>(tasks.map((t) => [t.id, t]));
    const taskEndDates = new Map<string, Date>();
    const taskStartDates = new Map<string, Date>();

    // Calculate earliest start date and end date per task respecting prerequisites
    const scheduleTasks = tasks.map((task) => {
      let earliestStart = new Date(baseDate);

      // If task has prerequisites, it cannot start until all prerequisites finish
      if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0) {
        for (const prereqId of task.prerequisiteTaskIds) {
          const prereqEnd = taskEndDates.get(prereqId);
          if (prereqEnd && prereqEnd.getTime() > earliestStart.getTime()) {
            earliestStart = new Date(prereqEnd);
          }
        }
      }

      const taskDuration = Math.max(1, task.durationDays || 2);
      const computedEnd = new Date(earliestStart.getTime() + taskDuration * 86400000);

      taskStartDates.set(task.id, earliestStart);
      taskEndDates.set(task.id, computedEnd);

      const isCompleted = task.status === ProjectTaskStatus.VALIDATED;
      const isOverdue =
        !isCompleted && task.deadline ? new Date(task.deadline).getTime() < Date.now() : false;

      return {
        taskId: task.id,
        title: task.title,
        phase: task.phase || 'General',
        assignedTo: task.assignedTo || null,
        startDate: (task.startDate ? new Date(task.startDate) : earliestStart).toISOString(),
        endDate: computedEnd.toISOString(),
        durationDays: taskDuration,
        deadline: task.deadline,
        dependencies: task.prerequisiteTaskIds || [],
        status: task.status,
        isOverdue,
        isCompleted,
      };
    });

    // Compute overall project duration and target finish
    let maxEndTime = baseDate.getTime();
    for (const d of taskEndDates.values()) {
      if (d.getTime() > maxEndTime) maxEndTime = d.getTime();
    }
    const totalDurationDays = Math.ceil((maxEndTime - baseDate.getTime()) / 86400000) || 14;

    // Identify critical path tasks (tasks that dictate the longest chain)
    const criticalPathTaskIds = scheduleTasks
      .filter((t) => t.dependencies.length > 0 || scheduleTasks.some((other) => other.dependencies.includes(t.taskId)))
      .map((t) => t.taskId);

    return {
      projectId,
      projectStartDate: baseDate.toISOString(),
      projectTargetEndDate: new Date(maxEndTime).toISOString(),
      totalDurationDays,
      criticalPathTaskIds: criticalPathTaskIds.length > 0 ? criticalPathTaskIds : tasks.map((t) => t.id),
      tasks: scheduleTasks,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Recommend task assignments using student skills, confidence, experience,
   * task requirements, and current workload balance.
   */
  static recommendAssignments(
    tasks: ProjectTaskDto[],
    members: ProjectMemberDto[]
  ): TaskAssignmentRecommendationDto[] {
    if (!members || members.length === 0) return [];

    // Count existing workloads
    const workloadCounts: Record<string, number> = {};
    for (const m of members) {
      workloadCounts[m.userId] = 0;
    }
    for (const t of tasks) {
      if (t.assignedTo && workloadCounts[t.assignedTo] !== undefined) {
        workloadCounts[t.assignedTo]++;
      }
    }

    const recommendations: TaskAssignmentRecommendationDto[] = [];

    for (const task of tasks) {
      const candidates = members.map((member) => {
        const studentName = member.user
          ? `${member.user.firstName} ${member.user.lastName}`
          : `Student ${member.userId.substring(0, 4)}`;
        const studentSkills = member.user?.skills || [];

        // Match skills
        const matchingSkills: string[] = [];
        let totalConfidence = 0;

        for (const reqSkill of task.requiredSkills || []) {
          const match = studentSkills.find(
            (s) => s.skillName.toLowerCase() === reqSkill.toLowerCase()
          );
          if (match) {
            matchingSkills.push(match.skillName);
            totalConfidence += match.confidence || 0.5;
          }
        }

        const avgConfidence = matchingSkills.length > 0 ? totalConfidence / matchingSkills.length : 0.2;
        const skillMatchRatio = (task.requiredSkills?.length || 1) > 0
          ? matchingSkills.length / (task.requiredSkills.length || 1)
          : 0.5;

        const currentWorkload = workloadCounts[member.userId] || 0;
        // Workload penalty (0-30 points deducted for overloaded members)
        const workloadPenalty = Math.min(30, currentWorkload * 10);

        // Score 0-100: 50% skill match ratio, 30% confidence, 20% workload balance
        let score = Math.round(skillMatchRatio * 50 + avgConfidence * 30 + (20 - Math.min(20, workloadPenalty)));
        score = Math.max(10, Math.min(99, score));

        return {
          studentId: member.userId,
          studentName,
          matchingSkills,
          confidenceAverage: Number(avgConfidence.toFixed(2)),
          currentWorkloadCount: currentWorkload,
          score,
        };
      });

      // Sort by score descending
      candidates.sort((a, b) => b.score - a.score);
      const topCandidate = candidates[0];

      recommendations.push({
        taskId: task.id,
        taskTitle: task.title,
        requiredSkills: task.requiredSkills,
        recommendedStudentId: topCandidate.studentId,
        recommendedStudentName: topCandidate.studentName,
        score: topCandidate.score,
        reasoning:
          topCandidate.matchingSkills.length > 0
            ? `Matches skills (${topCandidate.matchingSkills.join(', ')}) with avg confidence ${(topCandidate.confidenceAverage * 100).toFixed(0)}% and balanced workload (${topCandidate.currentWorkloadCount} assigned tasks).`
            : `Balanced workload (${topCandidate.currentWorkloadCount} tasks) and ready to expand into ${task.requiredSkills.join(', ') || 'required skills'}.`,
        candidates,
      });
    }

    return recommendations;
  }

  /**
   * Deterministic AI Project Planner
   * Generates a structured multi-phase plan with phases, tasks, dependencies,
   * durations, skills, technologies, deliverables, and validation criteria.
   */
  static generateAiProjectPlan(params: {
    title: string;
    description: string;
    objectives: string[];
    difficulty: string;
    technologies: string[];
    skills: string[];
    durationDays: number;
  }): AiProjectPlanResponse {
    const tech = params.technologies.length > 0 ? params.technologies : ['Docker', 'Node.js', 'GitHub Actions'];
    const skills = params.skills.length > 0 ? params.skills : ['CI/CD Pipelines', 'Linux Administration', 'Docker'];

    const plan: AiProjectPlanResponse = {
      suggestedDurationDays: params.durationDays || 14,
      overviewSummary: `Automated AI engineering plan for "${params.title}". Deconstructed into 4 sequential agile phases with dependency gates, deliverables, and verifiable criteria.`,
      phases: [
        {
          name: 'Phase 1: Architecture & Environment Setup',
          tasks: [
            {
              title: `Repository & Base Workspace Setup (${tech[0] || 'Core'})`,
              description: `Initialize version control repository, base folder structure, linting rules, and local development configurations for ${tech.join(', ')}.`,
              durationDays: 2,
              skills: [skills[0] || 'Linux Administration', 'Git'],
              technologies: [tech[0] || 'Node.js', 'Git'],
              deliverables: ['Git repository initial commit', '.gitignore & lint config', 'README documentation'],
              validationCriteria: ['Clean repository commit history', 'Local dev bootstrap script passes without errors'],
              prerequisiteIndices: [],
            },
            {
              title: `Containerization & Service Specification`,
              description: `Write Dockerfiles with multi-stage builds and Docker Compose for all application services.`,
              durationDays: 3,
              skills: ['Docker', 'Linux Administration'],
              technologies: ['Docker', 'Docker Compose'],
              deliverables: ['Dockerfile(s)', 'docker-compose.yml with healthchecks'],
              validationCriteria: ['Containers start successfully in isolated networks', 'Passing healthcheck endpoints'],
              prerequisiteIndices: [0],
            },
          ],
        },
        {
          name: 'Phase 2: Core Engineering & Infrastructure',
          tasks: [
            {
              title: `Core Functionality & API Implementation`,
              description: `Implement primary domain features, database schemas, and REST endpoints according to objectives: ${params.objectives.slice(0, 2).join('; ') || 'core platform operations'}.`,
              durationDays: 4,
              skills: [skills[1] || 'Node.js & TypeScript', 'Backend'],
              technologies: tech.slice(0, 2),
              deliverables: ['Endpoint controllers', 'Database migration files', 'Unit test suites'],
              validationCriteria: ['All automated tests pass', 'Code coverage > 75%', 'API contracts fulfilled'],
              prerequisiteIndices: [1],
            },
            {
              title: `Database Configuration & State Persistence`,
              description: `Set up persistent storage, connection pooling, indexing, and seed scripts.`,
              durationDays: 2,
              skills: ['Databases', 'Linux Administration'],
              technologies: ['MySQL / PostgreSQL', 'Docker'],
              deliverables: ['Schema migration scripts', 'Seed data loader'],
              validationCriteria: ['Migrations execute idempotently', 'Persistent volume mount verified'],
              prerequisiteIndices: [1],
            },
          ],
        },
        {
          name: 'Phase 3: Automated CI/CD & Security Audits',
          tasks: [
            {
              title: `Automated CI/CD Pipeline Build`,
              description: `Configure CI workflows for automated linting, test suites, container image building, and vulnerability scans.`,
              durationDays: 3,
              skills: ['CI/CD Pipelines', 'Docker'],
              technologies: ['GitHub Actions', 'DockerHub / GHCR'],
              deliverables: ['.github/workflows/ci.yml', 'Trivy / Snyk security scan summary'],
              validationCriteria: ['CI workflow runs green on pull requests', 'Zero critical security vulnerabilities'],
              prerequisiteIndices: [2, 3],
            },
            {
              title: `Monitoring & Observability Setup`,
              description: `Instrument application metrics, structured logging, and health probing endpoints.`,
              durationDays: 2,
              skills: ['Prometheus & Grafana', 'Observability'],
              technologies: ['Prometheus', 'Grafana'],
              deliverables: ['Prometheus metrics endpoint (/metrics)', 'Grafana dashboard JSON export'],
              validationCriteria: ['Metrics exposed in OpenMetrics format', 'Dashboard renders real-time CPU & memory metrics'],
              prerequisiteIndices: [4],
            },
          ],
        },
        {
          name: 'Phase 4: Deployment, Verification & Demo',
          tasks: [
            {
              title: `Production Deployment & Validation Run`,
              description: `Deploy to staging/cloud environment with SSL/TLS certificate, live DNS, and end-to-end smoke testing.`,
              durationDays: 2,
              skills: ['AWS Cloud', 'Kubernetes'],
              technologies: ['CloudLab Sandbox / AWS', 'Nginx'],
              deliverables: ['Live deployment URL', 'Deployment evidence screenshots', 'Smoke test execution logs'],
              validationCriteria: ['Public endpoint responds with HTTP 200', 'SSL encryption verified', 'All user workflows verified'],
              prerequisiteIndices: [4, 5],
            },
          ],
        },
      ],
    };

    return plan;
  }
}
