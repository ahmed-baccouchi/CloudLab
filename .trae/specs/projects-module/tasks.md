# Tasks: CloudLab Projects Module

Each task below is atomic, dependency-ordered, and maps to one or more Acceptance Criteria from spec.md.

| Dependency order | Task | Priority | Maps to AC |
|------------------|------|----------|------------|
| 1                | T1 — shared-types: add Projects, SkillsFoundation, and Events types | high | AC-9, AC-11, AC-13, AC-16 |
| 2                | T2 — scaffold project-service (config, server, package, workspace) | high | AC-13, NFR-1 |
| 3                | T3 — project.repository.ts: dual-store tables + migrations + seed | high | AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-11, NFR-3, AC-14 |
| 4                | T4 — project.service.ts: core lifecycle rules (plan, apply, accept, team size lock, start, completion) | high | AC-1, AC-2, AC-3, AC-4, AC-5, AC-8, AC-17 |
| T5 depends on T4 | T5 — assignment recommender + immutable submissions + validation | high | AC-5, AC-6, AC-7, AC-8, AC-9 |
| T6 depends on T5 | T6 — Scheduler API client, retries, graceful failure, storage | high | AC-10 |
| T7 depends on T6 | T7 — activity log + notification events emission | high | AC-11 |
| T8 depends on T7 | T8 — routes + controller + auth + permission middleware + gateway proxy | high | AC-12, NFR-5 |
| T9 depends on T8 | T9 — frontend: api client + 5 pages + App routes | high | AC-15, NFR-6 |

---

## Task 1 — shared-types: add Projects, SkillsFoundation, and Events types

**Scope**
Add new files and extend existing ones inside `packages/shared-types/src/`:
- New: `projects.types.ts` with enums `ProjectState`, `TaskStatus`, `ApplicationStatus`, `EvidenceKind`, `EvidenceSource`, `SkillSource`, `ScheduleSyncStatus`, and DTOs:
  - `SkillDto`, `TechnologyDto`, `ProjectRequirementSkillDto`, `StudentSkillDto`, `ProjectPhaseDto`, `ProjectTaskDto`, `ProjectTaskSubmissionDto`, `ProjectTeamMemberDto`, `ProjectApplicationDto`, `ProjectDto`, `ProjectActivityLogEntryDto`, `ProjectScheduleEntryDto`
  - `CreateProjectDto`, `UpdateProjectDto`, `SubmitApplicationDto`, `DecideApplicationDto`, `ApproveProjectPlanDto`, `UpdateAssignmentsDto`, `SubmitTaskEvidenceDto`, `ValidateSubmissionDto`, `GeneratePlanDto`
- New events in `events.types.ts` (and export in index.ts): `PROJECT_*` event names (application_created, application_accepted, application_rejected, project_started, task_assigned, task_unassigned, submission_made, submission_validated, submission_rejected, deadline_upcoming, task_overdue, project_completed, plan_generated, plan_approved) with payloads containing projectId, actorUserId, and specific fields.
- Ensure existing exports are not changed; only additive to satisfy AC-16.

**Evidence files**
- `packages/shared-types/src/projects.types.ts`
- `packages/shared-types/src/events.types.ts` (edited)
- `packages/shared-types/src/index.ts` (edited)

**Test Requirements**
- TR-1.1 (rule): `tsc` build of `@cloudlab/shared-types` passes with no errors.
- TR-1.2 (rule): All enums and DTOs are exported from index.ts and importable as `import { ProjectDto, ProjectTaskDto, StudentSkillDto } from '@cloudlab/shared-types'`.
- TR-1.3 (rule): Existing types (`UserRole`, `CourseDto`, `TrackDto`, event names already in spec) remain unchanged (verify no-rewrite via a read-compare against previous version).
- TR-1.4 (rubric): Type completeness — scale 0-2. 2 = every endpoint/entity in spec.md has a DTO. 1 = 1-2 missing. 0 = many missing. Pass ≥1, target 2.

**Status**: pending

---

## Task 2 — scaffold project-service

**Scope**
Create `apps/project-service/` exactly mirroring `apps/learning-service/` structure:
- `package.json` — deps: `@cloudlab/shared-auth`, `@cloudlab/shared-types`, `express`, `mysql2`, `multer`, `uuid`, `dotenv`, `cors`; dev deps aligned with learning-service; scripts `dev`, `build`, `start`, `clean`.
- `tsconfig.json` (extends root base like others)
- `src/config.ts` — loads root `.env`, defines:
  - port from `PROJECTS_SERVICE_PORT` default `4005`
  - `jwtSecret`, `internalSecret`, `database.name = 'cloudlab_projects'`, `uploadsDir = uploads/project-evidence`
  - scheduler: `schedulerApiUrl`, `schedulerApiKey`
- `src/server.ts` — `cors`, `express.json()`, `/health`, uploads static mount, three route mounts (`/api/v1/projects`, `/projects`, `/`) plus 404 fallback, exactly mirroring learning-service.
- Stubs: `src/routes/project.routes.ts`, `src/controllers/project.controller.ts`, `src/services/project.service.ts`, `src/db/project.repository.ts` (exported instances).
- Add new proxy in `apps/api-gateway/src/proxy/proxy.routes.ts` for `/api/v1/projects` → `config.services.projects` (with `SCHEDULER_PROJECTS_URL || http://localhost:4005`) and add `services.projects` field to `apps/api-gateway/src/config.ts`.
- Ensure startup order: `npm run dev` at root currently starts 5 services; keep existing ones (plus project-service optional via a new script entry in root package.json). Do NOT break the existing `dev` and `dev:backend` scripts.

**Evidence files**
- `apps/project-service/{package.json,tsconfig.json,src/{config,server,routes/project.routes,controllers/project.controller,services/project.service,db/project.repository}.ts}`
- `apps/api-gateway/src/proxy/proxy.routes.ts` (edited)
- `apps/api-gateway/src/config.ts` (edited)
- Root `package.json` (edited — add new scripts `dev:projects`, `build:projects`, etc. without rewriting existing ones)

**Test Requirements**
- TR-2.1 (rule): `npm run build:packages && npm run build --workspace=@cloudlab/project-service` succeeds.
- TR-2.2 (rule): Gateway starts and `/health` on projects-service returns 200 when run standalone.
- TR-2.3 (rule): Existing 5 services proxy routes unchanged (no regressions; code review confirms no edits except additive projects proxy + config field).

**Status**: pending

---

## Task 3 — project.repository.ts: dual-store tables + migrations + seed

**Scope**
Write `ProjectRepository` class in `apps/project-service/src/db/project.repository.ts` mirroring `LearningRepository` style:
- Private `pool: mysql.Pool | null`, `isConnected: boolean`.
- Private in-memory `Map`s for every entity: `projects`, `phases`, `tasks`, `task_assignments`, `submissions`, `applications`, `team_members`, `student_skills`, `project_requirement_skills`, `activity_log`, `schedules`, `notifications`.
- `initialize()` — bootstrap DB, create pool, call `createTables(conn)` which issues `CREATE TABLE IF NOT EXISTS` for:
  - `projects (id PK, owner_user_id, owner_name, title, slug UNIQUE, description, objectives_json, difficulty, technologies_json, duration_days, deadline, state, plan_approved_by, plan_generated_at, plan_approved_at, started_at, completed_at, created_at, updated_at)`
  - `phases (id PK, project_id, title, description, order_index)`
  - `tasks (id PK, phase_id, project_id, title, description, duration_hours, deadline, deliverables_json, validation_criteria_json, required_skills_json, technologies_json, dependency_ids_json, status, is_required, schedule_start, schedule_end, schedule_ref, schedule_sync_status, locked_reason, created_at, updated_at)`
  - `task_assignments (id PK UNIQUE KEY (task_id,user_id), task_id, user_id, assigned_by, assigned_at, recommended_score, is_override)`
  - `submissions (id PK, task_id, project_id, user_id, attempt_index, explanation, evidence_json, status, validator_user_id, feedback, validated_at, created_at)` with unique `(task_id, user_id, attempt_index)`.
  - `applications (id PK UNIQUE KEY (project_id,applicant_user_id), project_id, applicant_user_id, applicant_name, message, status, decided_by, decided_at, created_at)`
  - `team_members (id PK UNIQUE KEY (project_id,user_id), project_id, user_id, joined_at, is_owner)`
  - `student_skills (id PK UNIQUE KEY (user_id, skill_name), user_id, skill_name, level_score, confidence_score, evidence_source, evidence_ref_id, created_at, updated_at)`
  - `project_requirement_skills (id PK UNIQUE KEY (project_id, skill_name), project_id, skill_name, minimum_level)`
  - `activity_log (id PK, project_id, actor_user_id, action, target_type, target_id, metadata_json, created_at)`
  - `notifications (id PK, user_id, event_name, payload_json, is_read, created_at)`
- Idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations for any schema drift (same style as learning.repository.ts lines 177-194).
- `loadPersistedRows()` hydrates all maps from MySQL.
- Seed a demo project for `'11111111-1111-1111-1111-111111111111'` (the seeded student) if projects map is empty.

**Evidence files**
- `apps/project-service/src/db/project.repository.ts`

**Test Requirements**
- TR-3.1 (rule): `initialize()` succeeds both with and without MySQL running (falls back to in-memory).
- TR-3.2 (rule): All 9 entity tables created; seed demo project present; foreign keys and unique constraints modeled where supported.
- TR-3.3 (rule): `findProjectBySlug`, `listProjects(role?, userId?)`, `getProjectById(projectId, requesterUserId?, role?)` all return DTOs of correct shape.
- TR-3.4 (rubric): Migration completeness — 0-2. 2 = all 9 tables + idempotent ALTERs + persisted hydration for every entity. 1 = 7-8 tables. 0 = many missing. Pass ≥1.

**Status**: pending

---

## Task 4 — project.service.ts: core lifecycle rules

**Scope**
Create `ProjectService` class (singleton export) that uses `ProjectRepository`, handling business logic that repositories never do:
1. `createProject(caller, CreateProjectDto)` → set owner, insert team_members (owner, is_owner=true), write requirement skills, emit activity, emit notification, return DTO. → AC-1
2. `generatePlan(projectId, caller)` → calls `ProjectAIGenerator.generatePlan(dto)` (new helper file `ai-plan-generator.ts` with rule-based fallback if "LLM-like" fails) that produces phases + tasks with dependencies, durations, deliverables, validation criteria, skills. Plan is written DB (phases+tasks). Project.state transitions from DRAFT→DRAFT (just adds plan rows). → AC-2, AC-5
3. `approvePlan(projectId, caller, approvals/edit updates)` → only owner; tasks must form a DAG (cycle detection via topological sort; error `PLAN_HAS_CYCLE` → AC-17). Project.state transitions DRAFT → OPEN. Activity log row written. → AC-2, AC-17
4. `applyToProject(projectId, applicant, message)` → must be STUDENT; not owner; max team not reached; not already applied; writes Application with PENDING. Returns application. → AC-3
5. `decideApplication(projectId, owner, applicationId, accept:boolean)` → only owner. On accept: add team_members row (not owner); if count reaches 4: close further new applications (project.state becomes either IN_PROGRESS if plan approved else PLANNING_FULL_TEAM). On reject: no team_member row added, status REJECTED. → AC-4
6. `startProject(projectId, owner)` → requires plan approved AND team size ≥2 AND project.state is OPEN or PLANNING_FULL_TEAM. Compute task states READY/LOCKED based on dependency graph. → AC-5
7. `autoTransitionComplete(projectId)` — after any submission validation, re-query count(required tasks) vs count(required VALIDATED). If equal: set project.state = COMPLETED, set completed_at, write activity, fire notifications. → AC-8

**Evidence files**
- `apps/project-service/src/services/project.service.ts`
- `apps/project-service/src/services/ai-plan-generator.ts`

**Test Requirements**
- TR-4.1 (rule): Create project creates correct rows in projects, team_members, requirement_skills, activity_log, notifications counts match.
- TR-4.2 (rule): approvePlan with cyclic dependency graph → returns 400/throws, no state change.
- TR-4.3 (rule): duplicate applyToProject returns conflict.
- TR-4.4 (rule): Accepting 3 applications (total 4 incl. owner) with plan approved → state.IN_PROGRESS. Accepting same without plan approved → PLANNING_FULL_TEAM.
- TR-4.5 (rule): startProject with <2 members → throws/rejects.
- TR-4.6 (rule): After every required task VALIDATED, completeTransition sets state = COMPLETED.

**Status**: pending

---

## Task 5 — assignment recommender + immutable submissions + validation

**Scope**
Adds to ProjectService (plus separate helpers under `services/assignment-recommender.ts`, `services/skill-engine.ts`):

### Assignment recommender (AC-6)
- Input: project tasks, team members, student_skills map for each member, per-task required_skills, current workload (count of tasks already assigned).
- Scoring function per (member, task): `score = Σ (studentSkill.skill_level - req.min_level) per req skill + confidence_weight - workload_penalty`. Ties → lowest workload wins, then user_id deterministic.
- Task assignment is greedy over tasks ordered by dependency depth first (topological) so deps get assigned first.
- Return array of `{taskId, userId, score}`. Owner may override with `updateAssignments(projectId, owner, [{taskId, userId}])` which sets `is_override = true` on assignment row. Overrides exclude those assignments from future recommendations.

### Immutable submissions (AC-7)
- `submitEvidence(projectId, caller, taskId, SubmitTaskEvidenceDto)`:
  - Task must be assigned to caller OR caller is owner (owner may submit on someone's behalf? → no; restrict to assignee for now).
  - Reads current `attempt_index` from submissions for (task, userId) and increments.
  - Writes new submissions row with status = `SUBMITTED`; never updates an existing row.
  - task.status → `SUBMITTED`.
- `validateSubmission(projectId, validator, submissionId, accept:boolean, feedback)`:
  - Validator = project owner OR (global role INSTRUCTOR/ADMIN). → AC-12
  - Sets submission.status = VALIDATED or REJECTED; sets validator, validated_at, feedback.
  - If VALIDATED and last submission for (task,user) is VALIDATED → task.status = VALIDATED.
  - If REJECTED → task.status = REJECTED.
  - Every skill required by task → for assignee add/upsert StudentSkill with source=PROJECT_TASK, evidence_ref_id=submissionId. Skill gain formula: `task difficulty weight * 5` for level; `+2 confidence` per VALIDATED. → AC-9
  - Also forward XP to progress service via internal HTTP POST `/progress/events` (if available; failure silent).
  - Emit notifications + activity.
  - Call `autoTransitionComplete(projectId)`.

**Evidence files**
- `apps/project-service/src/services/assignment-recommender.ts`
- `apps/project-service/src/services/skill-engine.ts`
- `apps/project-service/src/services/project.service.ts` (edited — add methods)

**Test Requirements**
- TR-5.1 (rule): Same members+tasks input → same assignment output (deterministic) (verify by calling recommendAssignments twice with same map).
- TR-5.2 (rule): Two submissions for same (task, user) → distinct `attempt_index` 1 then 2; first row intact.
- TR-5.3 (rule): validator != owner and !INSTRUCTOR/ADMIN → throws 403.
- TR-5.4 (rule): VALIDATED submission increments student_skills for every task.required_skill.
- TR-5.5 (rule): After last required task VALIDATED, project.state == COMPLETED.
- TR-5.6 (rubric): Fairness of recommendation scoring. 0-2. 2 = explicit skill-match weighting + workload balance + deterministic ordering. 1 = simple matching. 0 = random / naive. Pass ≥1.

**Status**: pending

---

## Task 6 — Scheduler API client, retries, graceful failure

**Scope**
New file `services/scheduler-client.ts`:
- `scheduleProjectStart(project)` → builds request body `{projectId, deadline, tasks:[{taskId,duration_hours,dependencies,assigneeUserId}], members}`.
- Fetch with `node-fetch` or standard `http` module (if no `fetch` available in current Node 24, use built-in global `fetch`). Add Authorization header `Bearer ${SCHEDULER_API_KEY}`.
- Retry with exponential backoff: 3 attempts, jitter, baseDelay 200ms. Non-5xx (400/401 etc.) → no retry, mark sync status = FAILED_GRACEFUL. 5xx or network error → retry; after 3 fail → mark FAILED_GRACEFUL.
- On success: for each returned task `{taskId, start, end, externalRef}` → write to `tasks.schedule_start, schedule_end, schedule_ref, schedule_sync_status = OK`.
- If `SCHEDULER_API_URL` env is empty / missing: skip entirely, set status = SKIPPED_NO_CONFIG. No exception, no retry. → AC-10
- Called from ProjectService.startProject() after task states are set. Does not block project start — await but swallow; always continue.

**Evidence files**
- `apps/project-service/src/services/scheduler-client.ts`
- `apps/project-service/src/config.ts` (edited — add scheduler url/key env reads, set defaults)
- Root `.env.example` (edited — add SCHEDULER_API_URL and SCHEDULER_API_KEY lines)

**Test Requirements**
- TR-6.1 (rule): Scheduler URL empty → startProject succeeds, schedule_sync_status = SKIPPED_NO_CONFIG on every task.
- TR-6.2 (rule): Simulated fetch that returns 500 3 times → startProject still succeeds; tasks schedule_sync_status = FAILED_GRACEFUL; no exception.
- TR-6.3 (rule): Successful scheduler response updates schedule_start/end/ref on tasks correctly.

**Status**: pending

---

## Task 7 — activity log + notification events emission

**Scope**
Inside ProjectService wrap every important mutation with:
```
await repository.appendActivity(projectId, actor, action, targetType, targetId, metadata)
await repository.notify(userIds, eventName, payload)
```

Cover events specified in FR-24 / AC-11:
- application_created
- application_accepted, application_rejected
- project_started
- task_assigned, task_reassigned (both via assignment)
- submission_made
- submission_validated, submission_rejected
- deadline_upcoming (computed in getProjectDetail at read-time → emit only if now within 24h; dedupe via last-notified timestamp stored on task)
- task_overdue (same read-time emit + dedupe)
- project_completed
- plan_generated, plan_approved.

Also expose:
- `getMyNotifications(userId, limit=50)` on service; returns unread first.
- `markNotificationRead(userId, id)`.

**Evidence files**
- `apps/project-service/src/services/project.service.ts` (edited)
- `apps/project-service/src/db/project.repository.ts` (edited — appendActivity + notify + listNotifications methods)

**Test Requirements**
- TR-7.1 (rule): For each lifecycle transition from AC-11 list, count(activity_log rows for project) strictly increases by 1+ and notifications table contains ≥1 new row for each affected user.
- TR-7.2 (rule): deadline_upcoming / task_overdue emits only once per 24h window, not on every GET.
- TR-7.3 (rule): `getMyNotifications` returns notifications in newest-first order.

**Status**: pending

---

## Task 8 — routes + controller + auth + permission middleware + gateway proxy

**Scope**
Create `routes/project.routes.ts` mirroring learning.routes.ts style:
- Shared auth helper: `auth(req,res,next)` that tries authenticateJwt first, then internalAuthMiddleware if no Authorization header (per learning.routes.ts style).
- `requireProjectOwner(projectIdParam = 'projectId')` factory middleware that loads project, compares `req.user.id === project.ownerUserId`, 403 otherwise.
- `requireTeamMemberOrOwner` factory middleware.
- `requireValidator` (owner OR role INSTRUCTOR/ADMIN) factory middleware.
- `requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)` via shared-auth for instructor/admin-only routes.

Endpoints to register (use patterns identical to learning-service style):
```
GET    /projects                             # browse with filters {state?, difficulty?, my?, owner?}
POST   /projects                             # CreateProjectDto (STUDENT only)
GET    /projects/id/:id                      # detail (requester permission-scoped)
GET    /projects/:slug                       # by slug
PATCH  /projects/id/:id                      # UpdateProjectDto — owner only
POST   /projects/id/:id/generate-plan        # owner only, regenerate AI plan
POST   /projects/id/:id/approve-plan         # owner only, ApproveProjectPlanDto
POST   /projects/id/:id/start                # owner only
POST   /projects/id/:id/cancel               # owner+admin
POST   /projects/id/:id/apply                # STUDENT (non-owner) submits app
POST   /projects/id/:id/applications/:appId/decide   # owner only, DecideApplicationDto
GET    /projects/id/:id/applications         # owner only
POST   /projects/id/:id/assignments          # owner only, UpdateAssignmentsDto (recommend override)
POST   /projects/id/:id/assignments/recommend  # owner only, re-run recommender
POST   /projects/id/:id/tasks/:taskId/submit   # assignee only, SubmitTaskEvidenceDto
POST   /projects/id/:id/submissions/:subId/validate  # validator only, ValidateSubmissionDto
GET    /projects/id/:id/submissions          # owner/admin/instructor only
GET    /projects/id/:id/activity             # team+owner+admin+instructor
GET    /projects/id/:id/schedule             # team+owner+admin+instructor
GET    /notifications/my                     # authenticated, list my notifications
PATCH  /notifications/:id/read               # authenticated, mark read
GET    /skills/my                             # current user's student skills
POST   /evidence/upload                       # multipart, authenticated, store under uploads/project-evidence
```

File uploads endpoint: define `evidenceUpload` multer in `project.controller.ts`, mirror `resourceUpload` from learning-service (PDF/PNG/JPG/ZIP/MD/TXT/DOC/DOCX max 50MB).

Controller class `ProjectController` mirrors `LearningController` style:
- Static methods, each returns `success: true/false, data/error/message` shape.
- Extracts user via `getUserFromReq(req)` mirroring LearningController.getUserFromReq so gateway headers and direct JWT paths both work.

Gateway proxy: edit `apps/api-gateway/src/proxy/proxy.routes.ts` add a 6th block for `/api/v1/projects` exactly like the other 4; also edit `apps/api-gateway/src/config.ts` to add `services.projects` (read `PROJECTS_SERVICE_URL` env).

**Evidence files**
- `apps/project-service/src/routes/project.routes.ts`
- `apps/project-service/src/controllers/project.controller.ts`
- `apps/project-service/src/server.ts` (edited — mount routes)
- `apps/api-gateway/src/proxy/proxy.routes.ts` (edited)
- `apps/api-gateway/src/config.ts` (edited)
- Root `.env.example` (edited — add PROJECTS_SERVICE_PORT, PROJECTS_SERVICE_URL)

**Test Requirements**
- TR-8.1 (rule): 403 returned for every permission check when wrong user attempts (verify 6+ scenarios).
- TR-8.2 (rule): GET/POST endpoints accept both gateway header auth and JWT.
- TR-8.3 (rule): File upload returns a URL `{ fileUrl }` under `/uploads/project-evidence/...`.
- TR-8.4 (rule): No breaking changes to existing proxy routes for auth/learning/progress/challenges.

**Status**: pending

---

## Task 9 — frontend: api client + 5 pages + App routes

**Scope**
### api client additions
Extend `apps/frontend/src/api/client.ts` with `export const projectsApi = { ... }` (mirror shape of learningApi exactly) containing all endpoints from Task 8 list. Keep existing `authApi`, `learningApi`, `challengeApi`, `progressApi` intact. → AC-16

### Pages (all styled with existing dark theme, `#070a0f`/`#00d4ff` palette as in DashboardPage / AdminDashboardPage):

1. **`pages/projects/ProjectBrowsePage.tsx`** — grid/list of projects; filters (state, difficulty, "show my projects", "show open to apply"). Create project CTA button.
2. **`pages/projects/ProjectCreatePage.tsx`** — controlled form with title, description, objectives[], difficulty {BEGINNER/INTERMEDIATE/ADVANCED}, technologies[], skills[], duration days, deadline. On submit → calls POST /projects, redirects to detail.
3. **`pages/projects/ProjectPlanPage.tsx`** (routed at `/projects/:id/plan`) — shows phases/tasks/dependencies, AI regenerate button, owner edits tasks (add/remove dependency, edit durations), Approve Plan button that transitions state to OPEN.
4. **`pages/projects/ProjectDetailPage.tsx`** — tabbed: Overview (state, team members, skills/requirements), Applications (if owner), Tasks (table with status, assignee, dependency badges, deadline), Submissions tab (list for owner/validator with validate/reject actions), Schedule tab (tasks with dates + overdue/computed flags), Activity tab (log list), Evidence upload button per assigned task with file picker.
5. **`pages/projects/ProjectMySkillsPage.tsx`** — simple page listing current user’s StudentSkill entries per skill (bar charts or progress bars based on level_score 0-100; confidence indicator).

### App routes
Edit `apps/frontend/src/App.tsx` to add new routes under AuthenticatedGuard / RoleGuard:
- `/projects` → ProjectBrowsePage (AuthenticatedGuard)
- `/projects/new` → AuthenticatedGuard + in-page role check: show create form only for STUDENT (Instructor/Admin get "only students create" banner + browse list)
- `/projects/id/:id` → ProjectDetailPage (AuthenticatedGuard; detail page enforces visibility via backend 403)
- `/projects/id/:id/plan` → ProjectPlanPage (AuthenticatedGuard)
- `/skills` → ProjectMySkillsPage (AuthenticatedGuard)

Also add navigation links on the existing `DashboardPage.tsx` sidebar/main menu area: "Projects" pointing to `/projects`, "My Skills" to `/skills`.

### Style consistency
- Use same dark theme structure and inline component style objects pattern used in `AdminDashboardPage.tsx` / `DashboardPage.tsx`. **Do NOT install any new UI libs.**

**Evidence files**
- `apps/frontend/src/api/client.ts` (edited)
- `apps/frontend/src/pages/projects/ProjectBrowsePage.tsx` (new)
- `apps/frontend/src/pages/projects/ProjectCreatePage.tsx` (new)
- `apps/frontend/src/pages/projects/ProjectPlanPage.tsx` (new)
- `apps/frontend/src/pages/projects/ProjectDetailPage.tsx` (new)
- `apps/frontend/src/pages/projects/ProjectMySkillsPage.tsx` (new)
- `apps/frontend/src/App.tsx` (edited — add routes)
- `apps/frontend/src/pages/DashboardPage.tsx` (edited — add nav links)

**Test Requirements**
- TR-9.1 (rule): `tsc`/`vite build` for frontend succeeds with no TS errors.
- TR-9.2 (rule): Routes table contains all 5 new paths.
- TR-9.3 (rule): `projectsApi` method exists for each endpoint defined in Task 8 routes table (1:1 coverage check).
- TR-9.4 (rubric): UI consistency 0-2. 2 = palette/spacing/typography match AdminDashboardPage exactly. 1 = minor differences. 0 = completely different style. Pass ≥1.
- TR-9.5 (rule): No imports of UI libraries / new CSS frameworks (inspect package.json diff).

**Status**: pending
