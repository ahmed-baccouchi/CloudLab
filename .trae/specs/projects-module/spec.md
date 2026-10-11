# Spec: CloudLab Projects Module

## 1. Problem

CloudLab currently supports courses/tracks, lessons, challenges, and gamification, but it lacks a collaborative, team-based project layer that would let students practice real-world, multi-phase, group-deliverable DevOps work. Without it, instructors cannot assign realistic group projects, and students cannot build team-tracked portfolios inside the platform.

## 2. Users & Goals

### Primary users
- **Student** — Creates a project (becomes Owner), applies to open projects, works on assigned tasks, submits evidence, collaborates with up to 3 teammates (total 4).
- **Project Owner (a Student, NOT a new role)** — Approves AI-generated plan, accepts/rejects applicants, modifies recommended task assignments, validates/rejects submissions with feedback, monitors progress and schedule.
- **Instructor / Admin** — Can validate submissions, view projects, review activity, and act as fallback validators.

### Secondary users
- **Recommendation engine (future, not built here)** — Must have stable types & a Skill/StudentSkill foundation so future work can recommend courses and projects based on skill gaps and project requirements.

## 3. Goals

1. Deliver a **Projects Module** that reuses the existing auth, users, courses, challenges, file uploads, role middleware, gamification/progress engine, UI styling, and MySQL + in-memory dual-store patterns.
2. Students can create, browse, apply to, join, and complete collaborative projects of up to 4 members.
3. AI generates a structured plan (phases/tasks/dependencies/deliverables/validation criteria), but deterministic backend rules always enforce business constraints.
4. Task workflow is lockable by dependencies, supports immutable submission history, and produces a final completed state.
5. A reusable Skill / StudentSkill foundation records skill level, confidence, source, and evidence for future recommendations.
6. Scheduling uses an external Scheduler API securely, not a custom Gantt chart.
7. Notifications fire for every lifecycle event; a separate project activity log never loses important actions.
8. All permissions are enforced server-side; no role beyond STUDENT/INSTRUCTOR/ADMIN is introduced.

## 4. Non-Goals

- No new global user role (Owner = Student with project-level permission only).
- No custom Gantt chart / drag-and-drop scheduler UI.
- No recommendation engine implementation (only types + Skill/StudentSkill foundation).
- No real-time WebSocket collaboration (polling + page reload acceptable).
- No billing or payments.
- No rewriting of existing auth, learning, challenge, or progress features unrelated to projects.
- No new Python/ML services (AI plan generation is a deterministic fallback helper, with graceful failures).

## 5. Functional Requirements

### 5.1 Project Lifecycle & Team Management
- **FR-1** A Student can create a project with: title, description, objectives, difficulty, technologies, skills, duration (days), deadline (optional).
- **FR-2** The creator becomes the project **Owner**. Owner permission is per-project, not a global role.
- **FR-3** On creation, the backend invokes an "AI" project plan generator (with deterministic fallback) that returns a structured plan with phases, tasks, dependencies, durations, skills, technologies, deliverables, and validation criteria.
- **FR-4** The Owner can **edit/approve** the plan before starting the project; projects stay in `DRAFT` state until plan is approved.
- **FR-5** While `OPEN`, other students can apply (submit application). A student cannot apply twice to the same project.
- **FR-6** Owner can accept or reject each application. Rejected applicants have no team membership.
- **FR-7** Max team size = 4 (Owner counts). When 4 members are ACCEPTED, applications close and project auto-transitions to `IN_PROGRESS` (if plan already approved; otherwise to `PLANNING_FULL_TEAM`).
- **FR-8** Owner can manually start the project when >= 2 members total (Owner + 1 accepted) and plan approved.
- **FR-9** Valid project states: `DRAFT`, `OPEN`, `PLANNING_FULL_TEAM`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`, `CANCELLED`.

### 5.2 Tasks, Dependencies & Submissions
- **FR-10** Each task belongs to a phase, and has: title, description, duration_hours, deadline, required_skills[], required_technologies[], deliverable_description[], validation_criteria[], depends_on_task_ids[], status.
- **FR-11** Task statuses: `LOCKED`, `READY`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `VALIDATED`, `REJECTED`. A task with any non-validated dependency is `LOCKED`; it becomes `READY` when all deps are `VALIDATED`.
- **FR-12** On project start, the backend computes deterministic **task assignment recommendations** by scoring students (skill level, confidence, experience, task requirements, workload) and assigning to minimize gaps. Owner may override assignments.
- **FR-13** Assigned student submits evidence: file uploads (reuse `multer`/uploads pattern), screenshot URLs, Git URLs, deployment URLs, explanation text.
- **FR-14** Owner or Instructor/Admin validates/rejects submission with feedback. Rejected tasks can be resubmitted.
- **FR-15** Submission history is **immutable** — never overwritten; each submission is a new row with `attempt_index`.
- **FR-16** When every task marked required has status `VALIDATED`, the project status transitions to `COMPLETED`.

### 5.3 Skills Foundation (reusable)
- **FR-17** A `SkillName` enumeration exists (reuse the existing one in progress.types.ts).
- **FR-18** A `StudentSkill` entity stores per-user-per-skill: `level_score` (0-100), `confidence_score` (0-100), `evidence_source` (COURSE|ASSESSMENT|EXERCISE|PROJECT_TASK), `evidence_ref_id`, `created_at`, `updated_at`.
- **FR-19** On task validation, the student completing the task gains skill points proportionate to task difficulty and required skills (reuse progress gamification's `addXpAndSkills` pattern).
- **FR-20** A `ProjectRequirementSkill` entity lists required skills and minimum levels for a project, so future recommendation engines can compute skill gaps.

### 5.4 Scheduling (Scheduler API)
- **FR-21** On project start, the backend calls an external Scheduler API (configurable URL + key from `.env`) with tasks, durations, assignments, and project deadline. The call is authenticated, wrapped in retries with jitter/backoff, and failure degrades gracefully (schedules stored as null + flag; operation never blocks project start).
- **FR-22** The backend stores the returned schedule per task: `scheduled_start_date`, `scheduled_end_date`, `schedule_external_ref`.
- **FR-23** The schedule view returns tasks with dates, duration, deadline, assignee, dependencies, status, overdue flag (if now > deadline and not VALIDATED), and completed flag.

### 5.5 Notifications & Activity History
- **FR-24** Notification events are emitted for: project application received, application accepted, application rejected, team full / project started, task assigned (or re-assigned), submission made, submission validated, submission rejected, deadline upcoming (24h), overdue, project completed.
- **FR-25** Notifications reuse the existing events/CloudLabEventName style; project-specific event names and payload shapes are added to `@cloudlab/shared-types` events.types.ts (in-memory push only; no new queue required for MVP).
- **FR-26** A dedicated `project_activity_log` records every important action (owner, actor_user_id, action, target_type, target_id, metadata JSON, timestamp). It is append-only.
- **FR-27** Any project-detail endpoint returns the latest activity log entries (paginated or last 50).

### 5.6 Security & Architecture
- **FR-28** All project mutations require a valid JWT; middleware reused from `@cloudlab/shared-auth`.
- **FR-29** Project-level permissions enforced server-side:
  - Owner can edit, approve plan, accept/reject applications, modify assignments, validate or reject submissions.
  - Team members can submit evidence for tasks assigned to them, browse their projects.
  - Instructor/Admin can validate or reject submissions, view any project, cancel a project.
  - Other students can only browse published/OPEN projects and apply.
- **FR-30** No duplicate applications, no teams >4, no invalid self-dependencies or cycles in task dependency graph, no unauthorized submit/validate.
- **FR-31** All MySQL writes that span more than one logical mutation (e.g. accept application + if team-full transition + notification + activity log) use a pool transaction when a real MySQL connection is available, with an in-memory multi-step fallback when offline.
- **FR-32** Database tables are created with `CREATE TABLE IF NOT EXISTS` + idempotent ALTER migrations, matching the existing learning.repository.ts pattern.
- **FR-33** AI is only advisory; all state transitions and rules are computed deterministically on the backend. AI/LLM failures return a deterministic fallback plan generated by rule-based heuristics.

## 6. Non-Functional Requirements

- **NFR-1** Code reuse and structural consistency with existing services. Every new service file follows: `server.ts → routes.ts → controller.ts → service.ts → db/*.repository.ts → config.ts`, matching auth/learning/progress services.
- **NFR-2** TypeScript strict types; DTOs, enums, and event payloads live in `@cloudlab/shared-types` so both frontend and services import them.
- **NFR-3** Dual-store resilience: every repository has a MySQL path and a pure in-memory Map fallback, identical to LearningRepository / ProgressRepository, so the project is usable without MySQL.
- **NFR-4** File uploads for evidence reuse the existing multer storage style (uploads dir with uuid prefix + size limit + type allowlist) served via `express.static` and proxied via gateway `/uploads`.
- **NFR-5** API gateway proxies `/api/v1/projects/*` to a new `project-service` at a configurable port.
- **NFR-6** Frontend UI matches existing dark-themed pages (DashboardPage, LearningCatalogPage, AdminDashboardPage) colors, spacing, and typography. No new UI framework added.
- **NFR-7** Preserve existing data and routes; no destructive schema changes.

## 7. Constraints & Dependencies

- Existing monorepo: `packages/{shared-types,shared-auth}`, `apps/{api-gateway,auth-service,learning-service,challenge-service,progress-service,frontend}`.
- Existing DB schemas: `cloudlab_auth`, `cloudlab_learning`, `cloudlab_progress`, `cloudlab_challenges`. New tables in a new `cloudlab_projects` DB.
- Authentication: JWT via `authenticateJwt`, role via `requireRole`, gateway internal headers via `internalAuthMiddleware`, all from `@cloudlab/shared-auth`.
- File uploads: existing `uploads/` tree. Evidence uploads go into `uploads/project-evidence/`.
- Skills: must align with the existing `SkillName` enum in `@cloudlab/shared-types/progress.types.ts`. Values currently: LINUX, DOCKER, KUBERNETES, NETWORKING, CICD, DEVSECOPS.
- Scheduler API: configurable via `.env` as `SCHEDULER_API_URL` and `SCHEDULER_API_KEY`. If missing, the scheduler call is skipped entirely (silent degradation, not an error).
- No Scheduler API endpoint provided by this monorepo; it is an external dependency.

## 8. Assumptions

- Instructor validation privilege means any user with global role INSTRUCTOR or ADMIN can validate any submission on any project. Owner (a student) has equal validation power on their own project.
- Task `required` flag: default true; if future non-required tasks are added, only required ones drive `COMPLETED`.
- Evidence files are stored on local disk; external object storage is out of scope.
- Notifications are in-memory/event objects returned by endpoints and appended to per-user in-memory lists; email delivery is not required for MVP (but structure must allow it later).
- Scheduler API JSON contract is: `POST {tasks, projectDeadline, members, projectId}` → `200 {tasks:[{taskId,start,end,externalRef}]}`.
- Upcoming-deadline / overdue notifications are computed at read time (when the detail page is fetched), not via background jobs, per the existing codebase's style.

## 9. Open Questions (resolved with defaults below)

- **Q: Can owners leave projects?** Default: Owner cannot leave; they can cancel a project only.
- **Q: Can owners change team size target below current size?** Default: No. Max is hard-coded 4 and is always inclusive of owner.
- **Q: Can team roles (e.g. lead, devops lead) be defined?** Default: Out of scope; only Owner vs Member matters for permissions.
- **Q: Which DTOs include skill level?** Default: Project lists it as requirements (min level). Student skill records it as actual level + confidence.

## 10. Acceptance Criteria (AC)

| ID | Type | Statement | Pass Condition |
|----|------|-----------|----------------|
| AC-1 | rule | Student can create a project and becomes Owner | Call create project with valid JWT; response contains project with `ownerUserId` == caller and `state == DRAFT`. |
| AC-2 | rule | AI plan is generated (or fallback) and editable/approvable | After plan generate, response has phases+tasks+dep list; approve endpoint transitions state from DRAFT to OPEN. |
| AC-3 | rule | No duplicate applications | Apply twice with same user+project → second returns 400/conflict. |
| AC-4 | rule | Applications close and project starts when 4 members accepted (plan approved) | Accept 3 applications against owner-owned project (total 4); state becomes IN_PROGRESS. |
| AC-5 | rule | Task dependencies lock tasks | Task A depends on B; B not VALIDATED → A.status=LOCKED after start. |
| AC-6 | rule | Recommended task assignments are deterministic from skills+workload | Same input → same assignment output; scores are logged. Owner PUT override changes assignment. |
| AC-7 | rule | Submission history is immutable (never overwritten) | Submit same task twice → count of submissions for user/task = 2 with distinct `attempt_index` and full metadata preserved. |
| AC-8 | rule | Project completes iff all required tasks are VALIDATED | If any required task != VALIDATED → `state != COMPLETED`. After last required task validated, state becomes COMPLETED in same transaction/step. |
| AC-9 | rule | Skill foundation exists and grows on task validation | After task validate, `StudentSkill` for user + task required skill has increased `level_score`; activity log has an entry. |
| AC-10 | rule | Scheduler API is called with retries and failures are safe | Mock scheduler URL and test returning 500 three times → after retries, operation still succeeds with schedule fields null and `schedule_sync_status == FAILED_GRACEFUL`; project start succeeds. |
| AC-11 | rule | Notifications fire for every documented event, and activity log is appended | After each lifecycle transition count(activity_log rows for project) > before; notification list for affected user contains new event. |
| AC-12 | rule | Permissions are enforced server-side for every mutation | Non-owner attempting approve → 403. Non-assigned member submitting someone else's task → 403. Non-instructor/non-owner validating → 403. |
| AC-13 | rubric | Architectural consistency | 0-2: 2 = files, patterns, middlewares, responses exactly mirror learning/auth/progress services. 1 = slightly inconsistent but recognizable. 0 = ad-hoc structure. Pass ≥1, target 2. |
| AC-14 | rubric | Dual-store resilience and idempotent migrations | 0-2: 2 = every entity has MySQL + in-memory path, migrations IF NOT EXISTS, graceful offline. 1 = one store missing for 1+ entity. 0 = fails offline. Pass ≥1. |
| AC-15 | rule | Frontend pages exist for: project listing (browse+open/closed), create project, plan approve/editor, applications inbox, project detail with schedule/submissions, and the routes are wired and role-guarded. | Compile TS frontend, check routes.tsx includes new routes under RoleGuard/AuthenticatedGuard. |
| AC-16 | rule | No breaking changes to existing endpoints or types | Existing spec-compliant API calls to auth/learning/progress/challenges return same shapes and statuses. `@cloudlab/shared-types` existing exports unchanged. |
| AC-17 | rule | Dependency cycles rejected | Submit task graph with cycle → 400 response, no project start allowed. |
