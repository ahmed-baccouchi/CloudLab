import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Sparkles,
  ArrowLeft,
  UploadCloud,
  ExternalLink,
  MessageSquare,
  Award,
  ChevronRight,
  Shield,
  ShieldCheck,
  FileText,
  UserCheck,
  Check,
  X,
  History,
  Info,
  GitBranch,
  Send,
  Loader2,
  Layers
} from 'lucide-react';
import { projectsApi, authApi } from '../../api/client';
import type {
  ProjectDto,
  ProjectTaskDto,
  ProjectScheduleDto,
  TaskAssignmentRecommendationDto,
  ProjectActivityLogDto,
} from '@cloudlab/shared-types';
import {
  ProjectTaskStatus,
  ProjectMemberRole,
} from '@cloudlab/shared-types';
import { Navbar } from '../../components/Navbar';
import { ProjectCalendar } from '../../components/ProjectCalendar';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Current user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Project state
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [schedule, setSchedule] = useState<ProjectScheduleDto | null>(null);
  const [recommendations, setRecommendations] = useState<TaskAssignmentRecommendationDto[]>([]);
  const [activityLogs, setActivityLogs] = useState<ProjectActivityLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'team' | 'activity' | 'skills'>('tasks');

  // Modals & form states
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<ProjectTaskDto | null>(null);
  const [submissionExplanation, setSubmissionExplanation] = useState('');
  const [submissionGitUrl, setSubmissionGitUrl] = useState('');
  const [submissionDeployUrl, setSubmissionDeployUrl] = useState('');
  const [reviewModalSubmission, setReviewModalSubmission] = useState<{ task: ProjectTaskDto; submission: any } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'VALIDATE' | 'REJECT'>('VALIDATE');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [meRes, projRes, schedRes, recRes, actRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: { data: null } })),
        projectsApi.getProject(id),
        projectsApi.getSchedule(id).catch(() => ({ data: { data: null } })),
        projectsApi.getRecommendations(id).catch(() => ({ data: { data: [] } })),
        projectsApi.getActivity(id).catch(() => ({ data: { data: [] } })),
      ]);

      setCurrentUser(meRes.data?.data);
      setProject(projRes.data?.data);
      setSchedule(schedRes.data?.data);
      setRecommendations(recRes.data?.data || []);
      setActivityLogs(actRes.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = currentUser && project && project.ownerId === currentUser.id;
  const isMember = currentUser && project?.members?.some((m) => m.userId === currentUser.id);
  const hasApplied = currentUser && project?.applications?.some((a) => a.userId === currentUser.id);

  // Application Actions
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSubmittingAction(true);
      await projectsApi.applyToProject(id, applyMessage);
      setApplyModalOpen(false);
      setApplyMessage('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, decision: 'ACCEPT' | 'REJECT') => {
    if (!id) return;
    try {
      setSubmittingAction(true);
      await projectsApi.reviewApplication(id, applicationId, decision);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to review application');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Task Assignment
  const handleAssignTask = async (taskId: string, assignedTo: string | null) => {
    if (!id) return;
    try {
      await projectsApi.assignTask(id, taskId, assignedTo);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update assignment');
    }
  };

  // Task Submission
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedTaskForSubmission) return;

    try {
      setSubmittingAction(true);
      await projectsApi.submitTask(id, selectedTaskForSubmission.id, {
        explanation: submissionExplanation,
        gitUrl: submissionGitUrl || undefined,
        deploymentUrl: submissionDeployUrl || undefined,
      });
      setSelectedTaskForSubmission(null);
      setSubmissionExplanation('');
      setSubmissionGitUrl('');
      setSubmissionDeployUrl('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit evidence');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submission Validation / Rejection
  const handleReviewSubmission = async () => {
    if (!id || !reviewModalSubmission) return;

    try {
      setSubmittingAction(true);
      await projectsApi.reviewSubmission(
        id,
        reviewModalSubmission.task.id,
        reviewModalSubmission.submission.id,
        {
          decision: reviewDecision,
          feedback: reviewFeedback,
        }
      );
      setReviewModalSubmission(null);
      setReviewFeedback('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete review');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <Loader2 size={36} className="spinner-icon" />
        <p>Loading project workspace &amp; tasks...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="error-fullscreen">
        <AlertTriangle size={36} />
        <h2>{error || 'Project not found'}</h2>
        <button className="btn-secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar currentPage="projects" />
      <div className="project-detail-container">
      {/* Top Breadcrumb */}
      <div className="detail-top-nav">
        <button className="btn-back" onClick={() => navigate('/projects')}>
          <ArrowLeft size={16} /> Back to Projects Catalog
        </button>
        <div className="status-tags">
          <span className={`status-pill ${project.status.toLowerCase()}`}>
            {project.status.replace('_', ' ')}
          </span>
          <span className={`diff-pill ${project.difficulty?.toLowerCase()}`}>
            {project.difficulty}
          </span>
        </div>
      </div>

      {/* Main Project Hero Card */}
      <div className="project-hero-card">
        <div className="hero-main">
          <div className="hero-badge">
            <FolderGit2 size={15} /> CloudLab Project Workspace
          </div>
          <h1>{project.title}</h1>
          <p className="project-lead">{project.description}</p>

          <div className="tech-stack-row">
            {project.technologies?.map((tech, i) => (
              <span key={i} className="tech-chip">
                {tech}
              </span>
            ))}
          </div>

          <div className="meta-stats-row">
            <div className="meta-stat">
              <Users size={16} className="stat-icon" />
              <span>
                Team: <strong>{project.members?.length || 1}</strong> / 4 Students
              </span>
            </div>
            <div className="meta-stat">
              <Calendar size={16} className="stat-icon" />
              <span>Duration: <strong>{project.durationDays || 14} Days</strong></span>
            </div>
            <div className="meta-stat">
              <Shield size={16} className="stat-icon" />
              <span>Owner: <strong>{project.owner?.firstName} {project.owner?.lastName}</strong></span>
            </div>
          </div>
        </div>

        {/* Hero Action Right */}
        <div className="hero-cta-box">
          {isOwner ? (
            <div className="owner-badge-box">
              <ShieldCheck size={20} className="owner-icon" />
              <div>
                <strong>You are the Project Owner</strong>
                <p>You can review applications, approve tasks, and guide your team.</p>
              </div>
            </div>
          ) : isMember ? (
            <div className="member-badge-box">
              <UserCheck size={20} className="member-icon" />
              <div>
                <strong>You are a Team Member</strong>
                <p>Work on assigned tasks and submit evidence for validation.</p>
              </div>
            </div>
          ) : hasApplied ? (
            <div className="applied-badge-box">
              <Clock size={20} />
              <div>
                <strong>Application Pending</strong>
                <p>The owner is reviewing your profile and skills.</p>
              </div>
            </div>
          ) : (project.members && project.members.length >= 4) || project.maxMembers && (project.members?.length || 1) >= project.maxMembers ? (
            <div className="full-team-box">
              <Users size={20} />
              <div>
                <strong>Squad Complete ({project.members?.length || 4}/{project.maxMembers || 4})</strong>
                <p>This project has reached the student capacity and is locked to new applications.</p>
              </div>
            </div>
          ) : (
            <button
              className="btn-apply-hero"
              onClick={() => setApplyModalOpen(true)}
            >
              <Send size={16} /> Apply to Join Project ({Math.max(0, (project.maxMembers || 4) - (project.members?.length || 1))} spots left)
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <Layers size={16} /> Tasks &amp; Validation ({project.tasks?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={16} /> Scheduler Engine
        </button>
        <button
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <Users size={16} /> Team &amp; Applications ({project.members?.length || 1}/4)
        </button>
        <button
          className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <Award size={16} /> Skills Matrix &amp; Gaps
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <History size={16} /> Audit Trail ({activityLogs.length})
        </button>
      </div>

      {/* TAB CONTENT: TASKS */}
      {activeTab === 'tasks' && (
        <div className="tab-pane tasks-pane">
          <div className="pane-header">
            <div>
              <h2>Agile Tasks &amp; Verifiable Milestones</h2>
              <p>
                Tasks with prerequisites remain <strong>locked</strong> until preceding tasks are reviewed and validated.
                Submissions are stored in an append-only log so history is never lost.
              </p>
            </div>
          </div>

          <div className="tasks-grid">
            {project.tasks?.map((task) => {
              const isLocked = task.status === ProjectTaskStatus.LOCKED;
              const isValidated = task.status === ProjectTaskStatus.VALIDATED;
              const isInReview = task.status === ProjectTaskStatus.IN_REVIEW;
              const isRejected = task.status === ProjectTaskStatus.REJECTED;

              // Find recommendation for this task
              const rec = recommendations.find((r) => r.taskId === task.id);

              return (
                <div
                  key={task.id}
                  className={`task-card ${isLocked ? 'locked' : ''} ${isValidated ? 'validated' : ''}`}
                >
                  <div className="task-card-top">
                    <div className="phase-pill">{task.phase}</div>
                    <div className="status-indicator">
                      {isLocked && <span className="pill locked"><Lock size={12} /> Locked</span>}
                      {isValidated && <span className="pill validated"><CheckCircle2 size={12} /> Validated</span>}
                      {isInReview && <span className="pill review"><Clock size={12} /> In Review</span>}
                      {isRejected && <span className="pill rejected"><X size={12} /> Needs Revision</span>}
                      {task.status === ProjectTaskStatus.TODO && <span className="pill todo">Ready (To Do)</span>}
                    </div>
                  </div>

                  <h3 className="task-title">{task.title}</h3>
                  <p className="task-desc">{task.description}</p>

                  {/* Prerequisites */}
                  {task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0 && (
                    <div className="prereq-box">
                      <Lock size={12} />
                      <span>
                        Prerequisites: {task.prerequisiteTaskIds.length} required task(s)
                      </span>
                    </div>
                  )}

                  {/* Skills Required */}
                  <div className="task-skills">
                    {task.requiredSkills?.map((s, i) => (
                      <span key={i} className="task-skill-tag">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Deliverables */}
                  {task.deliverables && task.deliverables.length > 0 && (
                    <div className="deliverables-box">
                      <strong>Deliverables:</strong>
                      <ul>
                        {task.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assignment Control */}
                  <div className="assignment-section">
                    <span className="assign-label">Assigned To:</span>
                    {isOwner ? (
                      <select
                        className="assign-select"
                        value={task.assignedTo || ''}
                        onChange={(e) => handleAssignTask(task.id, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {project.members?.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user?.firstName} {m.user?.lastName} ({m.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="assigned-name">
                        {project.members?.find((m) => m.userId === task.assignedTo)?.user?.firstName || 'Unassigned'}
                      </span>
                    )}

                    {/* AI Assignment recommendation hint */}
                    {isOwner && rec && (
                      <div className="ai-rec-hint" title={rec.reasoning}>
                        <Sparkles size={13} className="rec-icon" />
                        <span>AI Suggestion: <strong>{rec.recommendedStudentName}</strong> ({rec.score}% fit)</span>
                      </div>
                    )}
                  </div>

                  {/* Submissions & Actions */}
                  <div className="task-actions-box">
                    {/* Student Submit Evidence Button */}
                    {!isLocked && !isValidated && (isMember || isOwner) && (
                      <button
                        className="btn-submit-evidence"
                        onClick={() => setSelectedTaskForSubmission(task)}
                      >
                        <UploadCloud size={14} />
                        {task.submissions && task.submissions.length > 0 ? 'Submit Revision' : 'Submit Evidence'}
                      </button>
                    )}

                    {/* Owner/Instructor Review Button */}
                    {isOwner && task.latestSubmission && task.latestSubmission.status === 'PENDING' && (
                      <button
                        className="btn-review-submission"
                        onClick={() =>
                          setReviewModalSubmission({
                            task,
                            submission: task.latestSubmission,
                          })
                        }
                      >
                        <CheckCircle2 size={14} /> Review Pending Submission
                      </button>
                    )}
                  </div>

                  {/* History of submissions (Never overwritten) */}
                  {task.submissions && task.submissions.length > 0 && (
                    <div className="submission-history-accordion">
                      <div className="sub-history-title">
                        <History size={12} /> Submission History ({task.submissions.length})
                      </div>
                      <div className="sub-list">
                        {task.submissions.map((sub, sIdx) => (
                          <div key={sub.id} className="sub-item">
                            <div className="sub-item-header">
                              <span className="sub-student">{sub.studentName || 'Student'}</span>
                              <span className={`sub-status ${sub.status.toLowerCase()}`}>
                                {sub.status}
                              </span>
                            </div>
                            <p className="sub-exp">{sub.explanation}</p>
                            {sub.gitUrl && (
                              <a href={sub.gitUrl} target="_blank" rel="noreferrer" className="sub-link">
                                <GitBranch size={12} /> Git: {sub.gitUrl}
                              </a>
                            )}
                            {sub.feedback && (
                              <div className="sub-feedback">
                                <strong>Feedback from {sub.reviewerName}:</strong> {sub.feedback}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SCHEDULER ENGINE with FullCalendar */}
      {activeTab === 'schedule' && schedule && (
        <div className="tab-pane schedule-pane">
          <ProjectCalendar
            schedule={schedule}
            projectTasks={project.tasks || []}
            members={project.members || []}
            onTaskClick={(task) => {
              setActiveTab('tasks');
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: TEAM & APPLICATIONS */}
      {activeTab === 'team' && (
        <div className="tab-pane team-pane">
          <div className="team-split">
            {/* Left: Active Squad (Max 4) */}
            <div className="team-col">
              <h3>Active Project Squad ({project.members?.length || 1} / 4 Max)</h3>
              <p className="hint">
                When 4 members are accepted, applications close and the project transitions to IN_PROGRESS.
              </p>

              <div className="members-cards-list">
                {project.members?.map((m) => (
                  <div key={m.userId} className="member-card">
                    <div className="member-avatar">
                      {m.user?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div className="member-info">
                      <h4>
                        {m.user?.firstName} {m.user?.lastName}
                        {m.role === ProjectMemberRole.OWNER && (
                          <span className="owner-tag">Owner</span>
                        )}
                      </h4>
                      <p className="member-email">{m.user?.email}</p>
                      {m.user?.skills && m.user.skills.length > 0 && (
                        <div className="member-skills-pills">
                          {m.user.skills.slice(0, 3).map((sk, i) => (
                            <span key={i} className="skill-chip">
                              {sk.skillName} (Lvl {sk.level})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Pending Applications (Owner only) */}
            <div className="team-col">
              <h3>Applications for Membership</h3>
              {isOwner ? (
                <>
                  <p className="hint">Review incoming student applications and accept up to 4 squad members.</p>
                  {project.applications && project.applications.length > 0 ? (
                    <div className="apps-list">
                      {project.applications.map((app) => (
                        <div key={app.id} className="app-card">
                          <div className="app-header">
                            <strong>{app.user?.firstName} {app.user?.lastName}</strong>
                            <span className={`app-status ${app.status.toLowerCase()}`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="app-message">"{app.message}"</p>

                          {app.user?.skills && (
                            <div className="applicant-skills">
                              {app.user.skills.map((sk, i) => (
                                <span key={i} className="app-skill-badge">
                                  {sk.skillName}: {(sk.confidence * 100).toFixed(0)}% conf
                                </span>
                              ))}
                            </div>
                          )}

                          {app.status === 'PENDING' && (
                            <div className="app-decision-btns">
                              <button
                                className="btn-accept"
                                onClick={() => handleReviewApplication(app.id, 'ACCEPT')}
                                disabled={submittingAction || (project.members?.length || 0) >= 4}
                              >
                                <Check size={14} /> Accept into Squad
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleReviewApplication(app.id, 'REJECT')}
                                disabled={submittingAction}
                              >
                                <X size={14} /> Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-subpane">No applications received yet.</div>
                  )}
                </>
              ) : (
                <div className="empty-subpane">Only the project owner can view and review team applications.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SKILLS MATRIX */}
      {activeTab === 'skills' && (
        <div className="tab-pane skills-pane">
          <div className="pane-header">
            <div>
              <h2>Skills Matrix &amp; Recommendation Foundations</h2>
              <p>
                Student skill levels and confidence increase automatically when tasks requiring those skills are validated.
              </p>
            </div>
          </div>

          <div className="skills-overview-grid">
            {project.skills?.map((skName, i) => (
              <div key={i} className="skill-stat-card">
                <h3>{skName}</h3>
                <div className="skill-members-breakdown">
                  {project.members?.map((m) => {
                    const found = m.user?.skills?.find((s) => s.skillName.toLowerCase() === skName.toLowerCase());
                    return (
                      <div key={m.userId} className="member-skill-row">
                        <span>{m.user?.firstName}</span>
                        <span>{found ? `Level ${found.level} (${(found.confidence * 100).toFixed(0)}% conf)` : 'Unverified (0%)'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="tab-pane activity-pane">
          <div className="pane-header">
            <h2>Project Activity &amp; Audit Log</h2>
            <p>Immutable history of milestones, applications, submissions, and approvals.</p>
          </div>

          <div className="activity-timeline">
            {activityLogs.map((log) => (
              <div key={log.id} className="timeline-entry">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-top">
                    <strong>{log.userName || 'System'}</strong>
                    <span className="action-type">{log.action}</span>
                    <span className="time">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {log.details && (
                    <pre className="details-json">{JSON.stringify(log.details, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Apply to Project */}
      {applyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Apply to Join Project Squad</h3>
            <p className="modal-lead">
              Explain your background, interest, and the skills you can bring to "{project.title}".
            </p>
            <form onSubmit={handleApply}>
              <textarea
                required
                rows={4}
                placeholder="I have experience with Docker containerization and Kubernetes ingress..."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setApplyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gradient"
                  disabled={submittingAction}
                >
                  <Send size={15} /> Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Task Evidence */}
      {selectedTaskForSubmission && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Submit Task Evidence: {selectedTaskForSubmission.title}</h3>
            <p className="modal-lead">
              Provide verifiable proof (Git commits, pull requests, deployment URLs, logs, or explanations).
              Previous submissions are preserved in the task history.
            </p>

            <form onSubmit={handleSubmitEvidence}>
              <div className="field-group">
                <label>Git Repository / PR URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/cloudlab/repo/pull/1"
                  value={submissionGitUrl}
                  onChange={(e) => setSubmissionGitUrl(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Live Deployment / Staging URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://staging.cloudlab.internal"
                  value={submissionDeployUrl}
                  onChange={(e) => setSubmissionDeployUrl(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Technical Explanation &amp; Verification Proof *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain how deliverables were met and what tests were run..."
                  value={submissionExplanation}
                  onChange={(e) => setSubmissionExplanation(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedTaskForSubmission(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gradient"
                  disabled={submittingAction}
                >
                  <UploadCloud size={16} /> Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Review Pending Submission */}
      {reviewModalSubmission && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Review Task Evidence: {reviewModalSubmission.task.title}</h3>
            <div className="sub-review-details">
              <p><strong>Student:</strong> {reviewModalSubmission.submission.studentName}</p>
              <p><strong>Explanation:</strong> {reviewModalSubmission.submission.explanation}</p>
              {reviewModalSubmission.submission.gitUrl && (
                <p>
                  <strong>Git:</strong>{' '}
                  <a href={reviewModalSubmission.submission.gitUrl} target="_blank" rel="noreferrer">
                    {reviewModalSubmission.submission.gitUrl}
                  </a>
                </p>
              )}
            </div>

            <div className="review-decision-group">
              <label>Review Decision:</label>
              <div className="radio-row">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="decision"
                    value="VALIDATE"
                    checked={reviewDecision === 'VALIDATE'}
                    onChange={() => setReviewDecision('VALIDATE')}
                  />
                  <span>Validate &amp; Approve (Skill Boost)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="decision"
                    value="REJECT"
                    checked={reviewDecision === 'REJECT'}
                    onChange={() => setReviewDecision('REJECT')}
                  />
                  <span>Request Revisions (Reopen)</span>
                </label>
              </div>
            </div>

            <div className="field-group">
              <label>Reviewer Feedback &amp; Suggestions *</label>
              <textarea
                required
                rows={3}
                placeholder="Great Docker multi-stage build, healthcheck verified."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReviewModalSubmission(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-decision ${reviewDecision.toLowerCase()}`}
                onClick={handleReviewSubmission}
                disabled={submittingAction}
              >
                {reviewDecision === 'VALIDATE' ? 'Approve & Validate Task' : 'Submit Rejection Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style>{`
        .project-detail-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 30px 24px;
        }
        .detail-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
        }
        .btn-back:hover {
          color: var(--accent-cyan);
        }
        .status-tags {
          display: flex;
          gap: 8px;
        }
        .status-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-pill.recruiting {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-pill.in_progress {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .status-pill.completed {
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .diff-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11.5px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }
        .project-hero-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          margin-bottom: 28px;
          box-shadow: var(--shadow-card);
        }
        .hero-main {
          flex: 1;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent-cyan);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .hero-main h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .project-lead {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.6;
          max-width: 800px;
          margin-bottom: 18px;
        }
        .tech-stack-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }
        .tech-chip {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-primary);
        }
        .meta-stats-row {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .meta-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--text-secondary);
        }
        .stat-icon {
          color: var(--accent-cyan);
        }
        .hero-cta-box {
          min-width: 280px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .btn-apply-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%);
          color: #070a0f;
          font-weight: 600;
          font-size: 14px;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-apply-hero:hover {
          transform: translateY(-2px);
        }
        .owner-badge-box, .member-badge-box, .applied-badge-box, .full-team-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          font-size: 12.5px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
        }
        .owner-icon { color: var(--accent-amber); }
        .member-icon { color: var(--accent-emerald); }
        .tabs-bar {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 24px;
          overflow-x: auto;
        }
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--accent-cyan);
          border-bottom-color: var(--accent-cyan);
          font-weight: 600;
        }
        .pane-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .pane-header h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .pane-header p {
          color: var(--text-secondary);
          font-size: 13.5px;
        }
        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }
        .task-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .task-card.locked {
          opacity: 0.7;
          border-style: dashed;
        }
        .task-card.validated {
          border-color: rgba(16, 185, 129, 0.4);
        }
        .task-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .phase-pill {
          font-size: 11px;
          color: var(--accent-cyan);
          font-weight: 600;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }
        .pill.locked { background: rgba(244, 63, 94, 0.15); color: #fda4af; }
        .pill.validated { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
        .pill.review { background: rgba(245, 158, 11, 0.15); color: #fde047; }
        .pill.rejected { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
        .pill.todo { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
        .task-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .task-desc {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 12px;
        }
        .prereq-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #fca5a5;
          margin-bottom: 10px;
        }
        .task-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }
        .task-skill-tag {
          font-size: 11px;
          padding: 2px 6px;
          background: rgba(0, 212, 255, 0.08);
          color: var(--accent-cyan);
          border-radius: 4px;
        }
        .deliverables-box {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 14px;
        }
        .deliverables-box ul {
          margin-left: 16px;
          margin-top: 4px;
        }
        .assignment-section {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
          font-size: 12.5px;
        }
        .assign-select {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 4px;
          font-size: 12.5px;
        }
        .ai-rec-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--accent-cyan);
          margin-top: 6px;
        }
        .task-actions-box {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-submit-evidence {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-cyan);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-review-submission {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .submission-history-accordion {
          margin-top: 14px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 6px;
          padding: 8px 12px;
        }
        .sub-history-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 6px;
        }
        .sub-item {
          font-size: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 6px;
          margin-top: 6px;
        }
        .sub-item-header {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
        }
        .sub-status.validated { color: #10b981; }
        .sub-status.rejected { color: #f43f5e; }
        .sub-status.pending { color: #f59e0b; }
        .sub-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--accent-cyan);
          margin-top: 4px;
          text-decoration: underline;
        }
        .sub-feedback {
          margin-top: 4px;
          color: #fde047;
          font-size: 11.5px;
        }
        /* Schedule table */
        .schedule-table-wrap {
          overflow-x: auto;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .schedule-table th, .schedule-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-subtle);
          text-align: left;
        }
        .schedule-table th {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-size: 12px;
          text-transform: uppercase;
        }
        .sched-phase {
          font-size: 11px;
          color: var(--accent-cyan);
          display: block;
        }
        .sched-title {
          font-weight: 600;
        }
        .row-overdue {
          background: rgba(244, 63, 94, 0.05);
        }
        /* Team Split */
        .team-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .team-col {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .team-col h3 {
          font-size: 17px;
          margin-bottom: 6px;
        }
        .hint {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 18px;
        }
        .members-cards-list, .apps-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .member-card, .app-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .app-card {
          flex-direction: column;
          align-items: flex-start;
        }
        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff, #3b82f6);
          color: #070a0f;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .owner-tag {
          font-size: 10px;
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 6px;
        }
        .app-header {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }
        .app-decision-btns {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .btn-accept {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #10b981;
          color: #070a0f;
          font-weight: 600;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        .btn-reject {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(244, 63, 94, 0.2);
          color: #fda4af;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        /* Skills overview */
        .skills-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .skill-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 18px;
        }
        .member-skill-row {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 6px;
        }
        /* Activity Timeline */
        .activity-timeline {
          position: relative;
          padding-left: 20px;
        }
        .timeline-entry {
          position: relative;
          padding-bottom: 20px;
          border-left: 1px solid var(--border-subtle);
          padding-left: 20px;
        }
        .timeline-dot {
          position: absolute;
          left: -5px;
          top: 4px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--accent-cyan);
        }
        .timeline-top {
          display: flex;
          gap: 10px;
          font-size: 13.5px;
        }
        .action-type {
          color: var(--accent-cyan);
          font-family: monospace;
          font-size: 12px;
        }
        .time {
          color: var(--text-muted);
          margin-left: auto;
          font-size: 12px;
        }
        .details-json {
          background: var(--bg-secondary);
          padding: 8px;
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 6px;
          overflow-x: auto;
        }
        /* Modals */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 28px;
          max-width: 540px;
          width: 100%;
          box-shadow: var(--shadow-glow);
        }
        .modal-card h3 {
          font-size: 18px;
          margin-bottom: 8px;
        }
        .modal-lead {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 18px;
        }
        .modal-card textarea, .modal-card input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 10px;
          color: var(--text-primary);
          font-size: 13.5px;
          margin-bottom: 12px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }
        .btn-decision.validate {
          background: #10b981;
          color: #070a0f;
          font-weight: 600;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-decision.reject {
          background: #f43f5e;
          color: #fff;
          font-weight: 600;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .radio-row {
          display: flex;
          gap: 16px;
          margin-bottom: 14px;
        }
        .radio-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .loading-fullscreen, .error-fullscreen {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
        }
      `}</style>
      </div>
    </div>
  );
};
