import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Edit3,
  Save,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  Users,
  Layers,
  ShieldCheck,
  Zap,
  Trash2,
  Plus,
  X,
  Info,
  GitBranch,
} from 'lucide-react';
import { projectsApi, authApi } from '../../api/client';
import type {
  ProjectDto,
  ProjectPhaseDto,
  ProjectTaskDto,
  AiProjectPlanResponse,
} from '@cloudlab/shared-types';
import { Navbar } from '../../components/Navbar';

export const ProjectPlanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [plan, setPlan] = useState<AiProjectPlanResponse | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [meRes, projRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: { data: null } })),
        projectsApi.getProject(id),
      ]);
      setCurrentUser(meRes.data?.data);
      const p = projRes.data?.data;
      setProject(p);
      const existingPhases = p?.phases || p?.tasks ? derivePhasesFromProject(p) : [];
      setPhases(existingPhases);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load project plan');
    } finally {
      setLoading(false);
    }
  };

  const derivePhasesFromProject = (p: ProjectDto): any[] => {
    const phaseMap: Record<string, any> = {};
    (p.tasks || []).forEach((t, i) => {
      const phaseName = t.phase || `Phase ${Math.floor(i / 4) + 1}`;
      if (!phaseMap[phaseName]) {
        phaseMap[phaseName] = {
          name: phaseName,
          tasks: [],
        };
      }
      phaseMap[phaseName].tasks.push({
        title: t.title,
        description: t.description,
        durationDays: t.durationDays,
        skills: t.requiredSkills || [],
        technologies: t.technologies || [],
        deliverables: t.deliverables || [],
        validationCriteria: t.validationCriteria || [],
        prerequisiteIndices: [],
      });
    });
    return Object.values(phaseMap);
  };

  const isOwner = currentUser && project && (project.ownerUserId === currentUser.id || project.ownerId === currentUser.id);
  const planApproved = project?.aiPlanApproved || project?.state === 'OPEN' || project?.state === 'IN_PROGRESS' || project?.state === 'PLANNING_FULL_TEAM' || project?.state === 'COMPLETED';
  const projectEditable = !planApproved && isOwner;

  const handleGeneratePlan = async () => {
    if (!id) return;
    try {
      setGenerating(true);
      setError(null);
      const res = await projectsApi.generateAiPlan({
        projectId: id,
        title: project?.title,
        difficulty: project?.difficulty,
        technologies: project?.technologies,
        skills: project?.skills,
        durationDays: project?.durationDays,
      });
      const generated = res.data?.data || res.data;
      if (generated?.phases) {
        setPlan(generated);
        setPhases(generated.phases);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'AI plan generator failed; using deterministic fallback plan');
      setPhases(generateFallbackPlan(project));
    } finally {
      setGenerating(false);
    }
  };

  const generateFallbackPlan = (p?: ProjectDto | null): any[] => {
    const difficulty = p?.difficulty || 'BEGINNER';
    const totalDays = p?.durationDays || 14;
    const techs = p?.technologies || ['Linux', 'Docker'];
    const skills = p?.skills || ['LINUX', 'DOCKER'];

    const phases = [
      {
        name: 'Phase 1 — Design & Setup',
        tasks: [
          {
            title: 'Define architecture & write design doc',
            description: 'Outline components, their interactions, and non-functional requirements.',
            durationDays: Math.max(2, Math.round(totalDays * 0.15)),
            skills: skills.slice(0, 2),
            technologies: techs.slice(0, 2),
            deliverables: ['Architecture diagram', 'Design document (MD)'],
            validationCriteria: ['Design doc reviewed by owner', 'Diagram covers all data flows'],
            prerequisiteIndices: [],
          },
          {
            title: 'Provision environments & toolchain',
            description: 'Stand up local/dev environments, repo, CI, dependencies.',
            durationDays: Math.max(2, Math.round(totalDays * 0.15)),
            skills,
            technologies: techs,
            deliverables: ['Running dev environment', 'CI green'],
            validationCriteria: ['Newcomer onboarding doc works end-to-end'],
            prerequisiteIndices: [0],
          },
        ],
      },
      {
        name: 'Phase 2 — Build Core',
        tasks: [
          {
            title: 'Implement core module 1',
            description: 'First vertical slice of functionality with tests.',
            durationDays: Math.max(3, Math.round(totalDays * 0.2)),
            skills: skills.slice(0, 3),
            technologies: techs,
            deliverables: ['Source code', 'Unit tests (≥70% coverage)'],
            validationCriteria: ['All tests pass', 'PR reviewed'],
            prerequisiteIndices: [],
          },
          {
            title: 'Implement core module 2',
            description: 'Second vertical slice.',
            durationDays: Math.max(3, Math.round(totalDays * 0.2)),
            skills,
            technologies: techs,
            deliverables: ['Source code', 'Integration tests'],
            validationCriteria: ['E2E scenario works'],
            prerequisiteIndices: [0],
          },
        ],
      },
      {
        name: 'Phase 3 — Hardening & Delivery',
        tasks: [
          {
            title: 'Observability & production hardening',
            description: 'Metrics, logs, alerting, secrets management.',
            durationDays: Math.max(2, Math.round(totalDays * 0.15)),
            skills: skills.slice(-2),
            technologies: techs.slice(-2),
            deliverables: ['Dashboards', 'Runbook'],
            validationCriteria: ['Synthetic failure reproduces an alert'],
            prerequisiteIndices: [0],
          },
          {
            title: 'Demo, documentation & handoff',
            description: 'Recorded demo, README polished, handoff to instructor.',
            durationDays: Math.max(1, Math.round(totalDays * 0.1)),
            skills,
            technologies: techs,
            deliverables: ['Demo video', 'Polished README', 'Final archive'],
            validationCriteria: ['Demo covers all deliverables', 'Instructor can reproduce'],
            prerequisiteIndices: [0, 1],
          },
        ],
      },
    ];

    if (difficulty === 'ADVANCED') {
      phases.splice(1, 0, {
        name: 'Phase 2b — Advanced Hardening',
        tasks: [
          {
            title: 'Advanced: chaos / resiliency testing',
            description: 'Introduce failures, verify recovery SLOs.',
            durationDays: Math.max(2, Math.round(totalDays * 0.1)),
            skills,
            technologies: techs,
            deliverables: ['Chaos experiment report'],
            validationCriteria: ['Service recovers within SLO for each injected fault'],
            prerequisiteIndices: [0],
          },
        ],
      });
    }
    return phases;
  };

  const handleApprovePlan = async () => {
    if (!id || !window.confirm('✅ Approve this plan and open the project for applications?\n\nOnce approved, task dependencies become enforced and you can start the squad.')) return;
    try {
      setSaving(true);
      await projectsApi.approveAiPlan(id, {
        tasks: [],
        startRecruiting: true,
      });
      await loadAll();
      alert('✅ Plan approved. Project is now OPEN for applications.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve plan');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = (phaseIdx: number) => {
    setPhases((prev) => {
      const next = [...prev];
      next[phaseIdx] = {
        ...next[phaseIdx],
        tasks: [
          ...next[phaseIdx].tasks,
          {
            title: 'New Task',
            description: 'Describe the task.',
            durationDays: 2,
            skills: [],
            technologies: [],
            deliverables: [],
            validationCriteria: [],
            prerequisiteIndices: [],
          },
        ],
      };
      return next;
    });
  };

  const handleUpdateTask = (phaseIdx: number, taskIdx: number, patch: Record<string, any>) => {
    setPhases((prev) => {
      const next = [...prev];
      const tasks = [...next[phaseIdx].tasks];
      tasks[taskIdx] = { ...tasks[taskIdx], ...patch };
      next[phaseIdx] = { ...next[phaseIdx], tasks };
      return next;
    });
  };

  const handleRemoveTask = (phaseIdx: number, taskIdx: number) => {
    setPhases((prev) => {
      const next = [...prev];
      next[phaseIdx] = {
        ...next[phaseIdx],
        tasks: next[phaseIdx].tasks.filter((_t: any, i: number) => i !== taskIdx),
      };
      return next;
    });
  };

  const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const totalEstimatedDays = phases.reduce((acc, p) => acc + p.tasks.reduce((s: number, t: any) => s + (t.durationDays || 0), 0), 0);

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <Loader2 size={36} className="spinner-icon" />
        <p>Loading AI project plan…</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="error-fullscreen">
        <AlertTriangle size={36} />
        <h2>{error}</h2>
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
        <div className="detail-top-nav">
          <button className="btn-back" onClick={() => navigate(id ? `/projects/${encodeURIComponent(id)}` : '/projects')}>
            <ArrowLeft size={16} /> Back to Project
          </button>
          <div className="status-tags">
            {planApproved && (
              <span className="status-pill open" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 size={12} /> Plan Locked &amp; Approved
              </span>
            )}
            {!planApproved && isOwner && (
              <span className="status-pill draft" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Sparkles size={12} /> Draft — Editable
              </span>
            )}
            {project?.difficulty && (
              <span className={`diff-pill ${project.difficulty.toLowerCase()}`}>{project.difficulty}</span>
            )}
          </div>
        </div>

        <div className="project-hero-card">
          <div className="hero-main">
            <div className="hero-badge">
              <Sparkles size={15} /> AI Plan Studio
            </div>
            <h1 style={{ margin: 0 }}>{project?.title || 'Project Plan'}</h1>
            <p className="project-lead" style={{ margin: '6px 0 14px' }}>
              {project?.description || 'AI generates a structured plan with phases, task dependencies, deliverables, and validation criteria. Edit if needed, then approve to lock the plan.'}
            </p>

            <div className="tech-stack-row" style={{ marginTop: 8 }}>
              {project?.technologies?.map((tech, i) => (
                <span key={i} className="tech-chip">{tech}</span>
              ))}
            </div>

            <div className="meta-stats-row" style={{ marginTop: 14 }}>
              <div className="meta-stat">
                <Layers size={16} className="stat-icon" />
                <span>Plan: <strong>{phases.length} Phases</strong> · <strong>{totalTasks} Tasks</strong></span>
              </div>
              <div className="meta-stat">
                <Clock size={16} className="stat-icon" />
                <span>Estimated: <strong>{totalEstimatedDays || (project?.durationDays || 14)} days</strong></span>
              </div>
              <div className="meta-stat">
                <Users size={16} className="stat-icon" />
                <span>Squad size: <strong>{project?.members?.length || 1} / 4</strong></span>
              </div>
              {isOwner && (
                <div className="meta-stat">
                  <ShieldCheck size={16} className="stat-icon" style={{ color: 'var(--accent-cyan)' }} />
                  <span>You are <strong>Owner</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="hero-cta-box">
            {planApproved ? (
              <div className="owner-badge-box">
                <Lock size={20} className="owner-icon" style={{ color: '#10b981' }} />
                <div>
                  <strong>Plan Approved &amp; Locked</strong>
                  <p>Task dependencies are now enforced. Go to the project detail page to review applications and start your squad.</p>
                </div>
              </div>
            ) : isOwner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn-primary-gradient"
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', fontWeight: 700 }}
                >
                  {generating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  {generating ? 'Generating Plan…' : (phases.length === 0 ? '✨ Generate AI Plan' : '🔄 Regenerate AI Plan')}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditing((v) => !v)}
                    disabled={phases.length === 0}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', fontWeight: 600 }}
                  >
                    {isEditing ? <><Save size={13} /> Done Editing</> : <><Edit3 size={13} /> Edit Plan</>}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleApprovePlan}
                    disabled={saving || phases.length === 0}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', fontWeight: 600 }}
                  >
                    {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={13} />}
                    {saving ? 'Approving…' : '✅ Approve & Open'}
                  </button>
                </div>
                {phases.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,212,255,0.06)', padding: '9px 10px', borderRadius: 6, border: '1px solid rgba(0,212,255,0.15)' }}>
                    <Info size={13} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>Generate the AI plan first, or use the Edit button to add phases and tasks manually. Then approve.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="member-badge-box">
                <Unlock size={20} className="member-icon" />
                <div>
                  <strong>Plan Pending Owner Approval</strong>
                  <p>Only the project owner can edit or approve the plan. Check back soon — the project opens for applications once approved.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '12px' }}>
            <Zap size={16} style={{ flexShrink: 0 }} />
            <div>{error} — deterministic fallback plan is shown; you can still edit and approve.</div>
          </div>
        )}

        {/* PHASES */}
        <div style={{ marginTop: 28 }}>
          {phases.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', borderRadius: 16, background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <Sparkles size={28} style={{ color: 'var(--accent-purple)', marginBottom: 10 }} />
              <h3 style={{ margin: 0 }}>No plan yet</h3>
              <p style={{ fontSize: '13px', marginTop: 6 }}>Click <strong>✨ Generate AI Plan</strong> on the right to get a phase/task breakdown tailored to this project.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {phases.map((phase, pIdx) => (
                <div key={pIdx} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(139,92,246,0.08))', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '10px', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: 3 }}>
                        PHASE {pIdx + 1} / {phases.length}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>{phase.name}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {phase.tasks.length} task{phase.tasks.length !== 1 ? 's' : ''} · {phase.tasks.reduce((s: number, t: any) => s + (t.durationDays || 0), 0)}d
                      </div>
                      {projectEditable && isEditing && (
                        <button
                          onClick={() => handleAddTask(pIdx)}
                          className="btn-secondary"
                          style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 600 }}
                        >
                          <Plus size={12} /> Add Task
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {phase.tasks.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>No tasks yet. Click <strong>Add Task</strong> or regenerate the plan.</div>
                    )}
                    {phase.tasks.map((task: any, tIdx: number) => {
                      const prereqStr = (task.prerequisiteIndices || [])
                        .map((i: number) => `#${i + 1}`)
                        .join(', ') || '—';
                      return (
                        <div key={tIdx} style={{ padding: '13px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.015)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 22, height: 22, borderRadius: '50%',
                                  fontWeight: 700, fontSize: 11,
                                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                  color: '#fff',
                                }}>{tIdx + 1}</span>
                                {isEditing && projectEditable ? (
                                  <input
                                    value={task.title}
                                    onChange={(e) => handleUpdateTask(pIdx, tIdx, { title: e.target.value })}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '5px 8px', borderRadius: 6, fontSize: '13px', fontWeight: 700 }}
                                  />
                                ) : (
                                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{task.title}</div>
                                )}
                              </div>
                              {isEditing && projectEditable ? (
                                <textarea
                                  value={task.description}
                                  onChange={(e) => handleUpdateTask(pIdx, tIdx, { description: e.target.value })}
                                  rows={2}
                                  style={{ width: '100%', marginTop: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '5px 8px', borderRadius: 6, fontSize: '12px', resize: 'vertical' }}
                                />
                              ) : (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.6 }}>{task.description}</div>
                              )}
                              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                <div>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>Duration</div>
                                  {isEditing && projectEditable ? (
                                    <input
                                      type="number" min={1}
                                      value={task.durationDays}
                                      onChange={(e) => handleUpdateTask(pIdx, tIdx, { durationDays: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                                      style={{ width: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 7px', borderRadius: 5, fontSize: '12px', fontWeight: 700 }}
                                    />
                                  ) : (
                                    <div style={{ fontWeight: 700, fontSize: '12px' }}>{task.durationDays || 2} day{task.durationDays !== 1 ? 's' : ''}</div>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>
                                    <GitBranch size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} /> Depends on
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{prereqStr}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>Skills</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {(task.skills || []).map((s: string, i: number) => (
                                      <span key={i} className="tech-chip" style={{ fontSize: '10px', padding: '2px 7px' }}>{s}</span>
                                    ))}
                                    {(!task.skills || task.skills.length === 0) && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>Deliverables</div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                    {(task.deliverables || []).length || 0} item{(task.deliverables || []).length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                              {(task.deliverables || task.validationCriteria) && !(task.validationCriteria?.length === 0 && task.deliverables?.length === 0) && (
                                <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 7, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                  {task.deliverables?.length > 0 && (
                                    <div style={{ marginBottom: 6 }}>
                                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>Deliverables</div>
                                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        {task.deliverables.map((d: string, i: number) => <li key={i}>{d}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                  {task.validationCriteria?.length > 0 && (
                                    <div>
                                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>Validation Criteria</div>
                                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        {task.validationCriteria.map((d: string, i: number) => <li key={i}>{d}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {projectEditable && isEditing && (
                              <button
                                onClick={() => handleRemoveTask(pIdx, tIdx)}
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '5px 7px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: 600 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPlanPage;
