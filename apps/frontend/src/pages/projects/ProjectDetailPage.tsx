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
  Layers,
  FileUp,
  Download,
  RotateCcw,
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

function parseFileAttachment(fileItem: string | any): { name: string; size?: number; dataUrl?: string; url?: string } {
  if (typeof fileItem === 'object' && fileItem !== null) {
    return fileItem;
  }
  try {
    const parsed = JSON.parse(fileItem);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {}
  return { name: 'Deliverable.pdf', dataUrl: fileItem, url: fileItem };
}

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
  const [submissionPdf, setSubmissionPdf] = useState<{ name: string; size: number; dataUrl: string } | null>(null);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
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

  // PDF File Selection for Task Evidence
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPdfUploadError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPdfUploadError('Please select a valid PDF file (.pdf)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setPdfUploadError('PDF file size exceeds 20MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSubmissionPdf({
        name: file.name,
        size: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.onerror = () => {
      setPdfUploadError('Failed to read PDF file');
    };
    reader.readAsDataURL(file);
  };

  // Task Submission
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedTaskForSubmission) return;

    try {
      setSubmittingAction(true);
      const filesPayload: string[] = [];
      if (submissionPdf) {
        filesPayload.push(
          JSON.stringify({
            name: submissionPdf.name,
            size: submissionPdf.size,
            dataUrl: submissionPdf.dataUrl,
            uploadedAt: new Date().toISOString(),
          })
        );
      }

      await projectsApi.submitTask(id, selectedTaskForSubmission.id, {
        explanation: submissionExplanation,
        gitUrl: submissionGitUrl || undefined,
        deploymentUrl: submissionDeployUrl || undefined,
        files: filesPayload,
      });
      setSelectedTaskForSubmission(null);
      setSubmissionExplanation('');
      setSubmissionGitUrl('');
      setSubmissionDeployUrl('');
      setSubmissionPdf(null);
      setPdfUploadError(null);
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
              <span>
                Owner: <strong>
                  {project.owner?.firstName || project.members?.find((m) => m.userId === project.ownerId || m.role === 'OWNER')?.user?.firstName || (isOwner && currentUser?.firstName) || 'Project'} {' '}
                  {project.owner?.lastName || project.members?.find((m) => m.userId === project.ownerId || m.role === 'OWNER')?.user?.lastName || (isOwner && currentUser?.lastName) || 'Lead'}
                </strong>
              </span>
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
                            {sub.files && sub.files.length > 0 && (
                              <div className="sub-files-list">
                                {sub.files.map((f: any, fIdx: number) => {
                                  const parsed = parseFileAttachment(f);
                                  return (
                                    <a
                                      key={fIdx}
                                      href={parsed.dataUrl || parsed.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={parsed.name || 'deliverable.pdf'}
                                      className="sub-file-chip"
                                    >
                                      <FileText size={12} color="#06b6d4" />
                                      <span>{parsed.name || 'Attached PDF Deliverable'}</span>
                                      <Download size={11} className="download-icon" />
                                    </a>
                                  );
                                })}
                              </div>
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
        <div className="modal-overlay" onClick={() => setApplyModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon squad">
                <Users size={20} />
              </div>
              <div className="modal-header-text">
                <h3>Apply to Join Project Squad</h3>
                <p className="modal-lead">
                  Explain your background, interest, and the skills you can bring to "{project.title}".
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setApplyModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply}>
              <div className="field-group">
                <label className="field-label">Motivation &amp; Relevant Background *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="I have hands-on experience with Docker containerization, Kubernetes services, and CI/CD pipelines..."
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                />
              </div>

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
                  {submittingAction ? <Loader2 size={15} className="spinner" /> : <Send size={15} />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Task Evidence */}
      {selectedTaskForSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedTaskForSubmission(null)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon submit">
                <UploadCloud size={20} />
              </div>
              <div className="modal-header-text">
                <h3>Submit Task Evidence: {selectedTaskForSubmission.title}</h3>
                <p className="modal-lead">
                  Provide verifiable proof (Git commits, PRs, deployment URLs, logs, or attached PDF deliverables).
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedTaskForSubmission(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence}>
              <div className="field-group">
                <label className="field-label">Git Repository / PR URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/cloudlab/repo/pull/1"
                  value={submissionGitUrl}
                  onChange={(e) => setSubmissionGitUrl(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Live Deployment / Staging URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://staging.cloudlab.internal"
                  value={submissionDeployUrl}
                  onChange={(e) => setSubmissionDeployUrl(e.target.value)}
                />
              </div>

              {/* PDF Document Upload */}
              <div className="field-group">
                <label className="field-label">Attach PDF Deliverable / Evidence</label>
                {submissionPdf ? (
                  <div className="pdf-attached-badge">
                    <div className="pdf-badge-left">
                      <div className="pdf-badge-icon">
                        <FileText size={22} color="#06b6d4" />
                      </div>
                      <div className="pdf-badge-meta">
                        <span className="pdf-badge-name">{submissionPdf.name}</span>
                        <span className="pdf-badge-size">{(submissionPdf.size / 1024).toFixed(1)} KB • PDF Document</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pdf-remove-btn"
                      onClick={() => setSubmissionPdf(null)}
                      title="Remove attached PDF"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="pdf-dropzone">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileSelect}
                      style={{ display: 'none' }}
                    />
                    <FileUp size={24} className="dropzone-icon" />
                    <div className="dropzone-text">
                      <span className="dropzone-primary">Click to select PDF file</span> or drag and drop here
                    </div>
                    <span className="dropzone-hint">Upload documentation, test run logs, architecture proofs (PDF only, up to 20MB)</span>
                  </label>
                )}
                {pdfUploadError && <div className="pdf-error-hint">{pdfUploadError}</div>}
              </div>

              <div className="field-group">
                <label className="field-label">Technical Explanation &amp; Verification Proof *</label>
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
                  {submittingAction ? <Loader2 size={16} className="spinner" /> : <UploadCloud size={16} />}
                  <span>Submit for Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Review Pending Submission */}
      {reviewModalSubmission && (
        <div className="modal-overlay" onClick={() => setReviewModalSubmission(null)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon review">
                <ShieldCheck size={20} />
              </div>
              <div className="modal-header-text">
                <h3>Review Task Evidence: {reviewModalSubmission.task.title}</h3>
                <p className="modal-lead">
                  Verify submitted code, live deployment, and attached PDF documentation before approving.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setReviewModalSubmission(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sub-review-card">
              <div className="sub-meta-row">
                <span className="sub-meta-label">Student:</span>
                <span className="sub-meta-val student-pill">
                  <UserCheck size={13} /> {reviewModalSubmission.submission.studentName || 'Student'}
                </span>
              </div>
              <div className="sub-meta-row">
                <span className="sub-meta-label">Explanation:</span>
                <div className="sub-explanation-quote">
                  {reviewModalSubmission.submission.explanation}
                </div>
              </div>
              {reviewModalSubmission.submission.gitUrl && (
                <div className="sub-meta-row">
                  <span className="sub-meta-label">Git Repo:</span>
                  <a
                    href={reviewModalSubmission.submission.gitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sub-external-link"
                  >
                    <GitBranch size={13} /> {reviewModalSubmission.submission.gitUrl} <ExternalLink size={11} />
                  </a>
                </div>
              )}
              {reviewModalSubmission.submission.deploymentUrl && (
                <div className="sub-meta-row">
                  <span className="sub-meta-label">Deployment:</span>
                  <a
                    href={reviewModalSubmission.submission.deploymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sub-external-link"
                  >
                    <ExternalLink size={13} /> {reviewModalSubmission.submission.deploymentUrl}
                  </a>
                </div>
              )}
              {/* Show attached PDF in review */}
              {reviewModalSubmission.submission.files && reviewModalSubmission.submission.files.length > 0 && (
                <div className="sub-meta-row">
                  <span className="sub-meta-label">Deliverable PDF:</span>
                  <div className="review-files-grid">
                    {reviewModalSubmission.submission.files.map((f: any, fIdx: number) => {
                      const parsed = parseFileAttachment(f);
                      return (
                        <a
                          key={fIdx}
                          href={parsed.dataUrl || parsed.url}
                          target="_blank"
                          rel="noreferrer"
                          download={parsed.name || 'deliverable.pdf'}
                          className="review-pdf-download-chip"
                        >
                          <FileText size={16} color="#06b6d4" />
                          <div className="review-pdf-info">
                            <span className="pdf-title">{parsed.name || 'Task Deliverable PDF'}</span>
                            {parsed.size && <span className="pdf-sub">{(parsed.size / 1024).toFixed(1)} KB</span>}
                          </div>
                          <Download size={14} className="download-icon" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="review-decision-group">
              <label className="field-label">Review Decision *</label>
              <div className="decision-selector-grid">
                <button
                  type="button"
                  className={`decision-card approve ${reviewDecision === 'VALIDATE' ? 'selected' : ''}`}
                  onClick={() => setReviewDecision('VALIDATE')}
                >
                  <div className="decision-radio-dot">
                    {reviewDecision === 'VALIDATE' && <div className="dot-inner" />}
                  </div>
                  <div className="decision-card-text">
                    <div className="decision-title">
                      <CheckCircle2 size={16} /> Validate &amp; Approve
                    </div>
                    <div className="decision-desc">Awards skill XP and unlocks dependent steps</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`decision-card reject ${reviewDecision === 'REJECT' ? 'selected' : ''}`}
                  onClick={() => setReviewDecision('REJECT')}
                >
                  <div className="decision-radio-dot">
                    {reviewDecision === 'REJECT' && <div className="dot-inner" />}
                  </div>
                  <div className="decision-card-text">
                    <div className="decision-title">
                      <RotateCcw size={16} /> Request Revisions
                    </div>
                    <div className="decision-desc">Reopens task for revision &amp; resubmission</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Reviewer Feedback &amp; Suggestions *</label>
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
                {submittingAction ? (
                  <Loader2 size={15} className="spinner" />
                ) : reviewDecision === 'VALIDATE' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <RotateCcw size={16} />
                )}
                <span>{reviewDecision === 'VALIDATE' ? 'Approve & Validate Task' : 'Submit Rejection Feedback'}</span>
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
          background: rgba(4, 7, 14, 0.78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-card {
          background: #0d1527;
          border: 1px solid rgba(0, 212, 255, 0.22);
          border-radius: 16px;
          padding: 26px;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 212, 255, 0.12);
          animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          box-sizing: border-box;
        }
        .modal-card.modal-card-lg {
          max-width: 620px;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
          position: relative;
        }
        .modal-header-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .modal-header-icon.squad {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .modal-header-icon.submit {
          background: rgba(6, 182, 212, 0.15);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.3);
        }
        .modal-header-icon.review {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .modal-header-text {
          flex: 1;
          min-width: 0;
        }
        .modal-header-text h3 {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px 0;
          line-height: 1.3;
        }
        .modal-lead {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
        }
        .modal-close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .modal-close-btn:hover {
          color: #f1f5f9;
          background: rgba(255, 255, 255, 0.08);
        }
        .field-group {
          margin-bottom: 16px;
        }
        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 7px;
          letter-spacing: 0.2px;
        }
        .modal-card input, .modal-card textarea {
          width: 100%;
          background: #080e1a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 11px 14px;
          color: #f1f5f9;
          font-size: 13.5px;
          font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }
        .modal-card input:focus, .modal-card textarea:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.18);
          background: #0b1424;
        }
        .modal-card input::placeholder, .modal-card textarea::placeholder {
          color: #475569;
        }
        /* PDF Dropzone & Badge */
        .pdf-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 18px 16px;
          background: rgba(15, 23, 42, 0.5);
          border: 2px dashed rgba(6, 182, 212, 0.35);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .pdf-dropzone:hover {
          border-color: #06b6d4;
          background: rgba(6, 182, 212, 0.06);
          box-shadow: 0 0 16px rgba(6, 182, 212, 0.12);
        }
        .dropzone-icon {
          color: #06b6d4;
          margin-bottom: 8px;
        }
        .dropzone-text {
          font-size: 13.5px;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .dropzone-primary {
          color: #06b6d4;
          font-weight: 600;
        }
        .dropzone-hint {
          font-size: 11.5px;
          color: #64748b;
        }
        .pdf-attached-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.35);
          border-radius: 10px;
        }
        .pdf-badge-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .pdf-badge-icon {
          width: 36px;
          height: 36px;
          background: rgba(6, 182, 212, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pdf-badge-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .pdf-badge-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 380px;
        }
        .pdf-badge-size {
          font-size: 11.5px;
          color: #94a3b8;
        }
        .pdf-remove-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .pdf-remove-btn:hover {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.12);
        }
        .pdf-error-hint {
          color: #f43f5e;
          font-size: 12px;
          margin-top: 6px;
        }
        /* Review Evidence Card */
        .sub-review-card {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sub-meta-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
        }
        .sub-meta-label {
          font-weight: 600;
          color: #94a3b8;
          min-width: 95px;
          flex-shrink: 0;
          font-size: 12.5px;
        }
        .sub-meta-val {
          color: #f1f5f9;
        }
        .student-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .sub-explanation-quote {
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.25);
          padding: 8px 12px;
          border-radius: 6px;
          border-left: 3px solid #06b6d4;
          font-size: 13px;
          line-height: 1.45;
          flex: 1;
        }
        .sub-external-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #06b6d4;
          text-decoration: underline;
          font-size: 12.5px;
          word-break: break-all;
        }
        .review-files-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          flex: 1;
        }
        .review-pdf-download-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.35);
          padding: 8px 12px;
          border-radius: 8px;
          color: #f1f5f9;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .review-pdf-download-chip:hover {
          background: rgba(6, 182, 212, 0.22);
          border-color: #06b6d4;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
          color: #ffffff;
        }
        .review-pdf-info {
          display: flex;
          flex-direction: column;
        }
        .review-pdf-info .pdf-title {
          font-size: 12.5px;
          font-weight: 600;
        }
        .review-pdf-info .pdf-sub {
          font-size: 11px;
          color: #94a3b8;
        }
        /* Decision Cards */
        .decision-selector-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 6px;
        }
        .decision-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(15, 23, 42, 0.5);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .decision-card:hover {
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(15, 23, 42, 0.85);
        }
        .decision-card.approve.selected {
          background: rgba(16, 185, 129, 0.12);
          border-color: #10b981;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.22);
        }
        .decision-card.reject.selected {
          background: rgba(244, 63, 94, 0.12);
          border-color: #f43f5e;
          box-shadow: 0 0 16px rgba(244, 63, 94, 0.22);
        }
        .decision-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .decision-card.approve.selected .decision-radio-dot {
          border-color: #10b981;
        }
        .decision-card.reject.selected .decision-radio-dot {
          border-color: #f43f5e;
        }
        .decision-radio-dot .dot-inner {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .decision-card.approve.selected .dot-inner {
          background: #10b981;
        }
        .decision-card.reject.selected .dot-inner {
          background: #f43f5e;
        }
        .decision-card-text {
          flex: 1;
        }
        .decision-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 2px;
        }
        .decision-card.approve .decision-title {
          color: #34d399;
        }
        .decision-card.reject .decision-title {
          color: #fda4af;
        }
        .decision-desc {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.35;
        }
        /* Modal Actions & Buttons */
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .btn-primary-gradient {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          color: #ffffff !important;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13.5px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);
        }
        .btn-primary-gradient:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
          filter: brightness(1.08);
        }
        .btn-primary-gradient:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .modal-actions .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .modal-actions .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.22);
        }
        .btn-decision {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13.5px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-decision.validate {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }
        .btn-decision.validate:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          filter: brightness(1.08);
        }
        .btn-decision.reject {
          background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
        }
        .btn-decision.reject:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.5);
          filter: brightness(1.08);
        }
        .sub-files-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .sub-file-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          color: #e2e8f0;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .sub-file-chip:hover {
          background: rgba(6, 182, 212, 0.2);
          color: #ffffff;
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
