import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Code2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Check,
  Loader2
} from 'lucide-react';
import { projectsApi } from '../../api/client';
import type { AiProjectPlanResponse } from '@cloudlab/shared-types';
import { Navbar } from '../../components/Navbar';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<1 | 2>(1); // 1: Definition, 2: AI Plan Review & Approval
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [durationDays, setDurationDays] = useState(14);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [objectives, setObjectives] = useState<string[]>([
    'Build production-ready containerized microservices',
    'Automate CI/CD pipeline tests and deployments',
  ]);
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(['Docker', 'Kubernetes', 'GitHub Actions', 'Node.js']);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(['CI/CD Pipelines', 'Linux Administration', 'Docker']);

  // AI Plan generation state
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<AiProjectPlanResponse | null>(null);
  const [editableTasks, setEditableTasks] = useState<any[]>([]);

  // Add tag helpers
  const addObjective = () => {
    if (objectiveInput.trim()) {
      setObjectives([...objectives, objectiveInput.trim()]);
      setObjectiveInput('');
    }
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const addTech = () => {
    if (techInput.trim() && !technologies.includes(techInput.trim())) {
      setTechnologies([...technologies, techInput.trim()]);
      setTechInput('');
    }
  };

  const removeTech = (item: string) => {
    setTechnologies(technologies.filter((t) => t !== item));
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (item: string) => {
    setSkills(skills.filter((s) => s !== item));
  };

  // Step 1: Submit Details & Trigger AI Plan Generation
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a project title and description');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Create project on backend
      const createRes = await projectsApi.createProject({
        title,
        description,
        objectives,
        difficulty,
        technologies,
        skills,
        durationDays,
      });

      const newProject = createRes.data?.data;
      setCreatedProjectId(newProject.id);

      // 2. Request AI Plan
      const planRes = await projectsApi.generateAiPlan({
        title,
        description,
        objectives,
        difficulty,
        technologies,
        skills,
        durationDays,
      });

      const planData: AiProjectPlanResponse = planRes.data?.data;
      setGeneratedPlan(planData);

      // Flatten phases into editable task list
      const flattened: any[] = [];
      let globalIdx = 0;
      planData.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          flattened.push({
            id: `task_${globalIdx}`,
            title: task.title,
            description: task.description,
            phase: phase.name,
            durationDays: task.durationDays,
            skills: task.skills,
            technologies: task.technologies,
            deliverables: task.deliverables,
            validationCriteria: task.validationCriteria,
            prerequisiteTaskIds: task.prerequisiteIndices.map((i) => `task_${i}`),
            orderIndex: globalIdx,
          });
          globalIdx++;
        });
      });

      setEditableTasks(flattened);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize project');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Approve AI Plan & Start Recruiting
  const handleApprovePlan = async (startRecruiting: boolean) => {
    if (!createdProjectId) return;

    try {
      setLoading(true);
      await projectsApi.approveAiPlan(createdProjectId, {
        tasks: editableTasks,
        startRecruiting,
      });
      navigate(`/projects/${createdProjectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to approve plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar currentPage="projects" />
      <div className="create-project-container">
      {/* Header */}
      <div className="creation-header">
        <button className="back-link" onClick={() => navigate('/projects')}>
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="steps-indicator">
          <div className={`step-badge ${step === 1 ? 'active' : 'done'}`}>
            <span>1</span> Project Specification
          </div>
          <div className="step-separator" />
          <div className={`step-badge ${step === 2 ? 'active' : ''}`}>
            <span>2</span> AI Plan &amp; Dependency Graph
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* STEP 1: Project Metadata Form */}
      {step === 1 && (
        <form onSubmit={handleGeneratePlan} className="project-form">
          <div className="form-card">
            <h2>Project Overview &amp; Requirements</h2>
            <p className="subtitle">
              You will be designated as the <strong>Project Owner</strong>. CloudLab's AI engine will synthesize
              your requirements into actionable tasks, dependency gates, deliverables, and validation criteria.
            </p>

            <div className="field-group">
              <label>Project Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Automated Multi-Tier Microservice Orchestration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Detailed Problem Statement &amp; Scope *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe the architectural challenge, systems involved, deliverables, and expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid-2-col">
              <div className="field-group">
                <label>Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e: any) => setDifficulty(e.target.value)}
                >
                  <option value="BEGINNER">Beginner (Foundational DevOps)</option>
                  <option value="INTERMEDIATE">Intermediate (Production Patterns)</option>
                  <option value="ADVANCED">Advanced (Enterprise Resilience &amp; SRE)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Target Timeline (Days)</label>
                <input
                  type="number"
                  min={3}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 14)}
                />
              </div>
            </div>

            {/* Objectives */}
            <div className="field-group">
              <label>Project Objectives &amp; Milestones</label>
              <div className="tag-input-row">
                <input
                  type="text"
                  placeholder="e.g. Implement zero-downtime deployment rolling strategy"
                  value={objectiveInput}
                  onChange={(e) => setObjectiveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                />
                <button type="button" className="btn-add-tag" onClick={addObjective}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <ul className="bullet-list">
                {objectives.map((obj, i) => (
                  <li key={i}>
                    <span>{obj}</span>
                    <button type="button" onClick={() => removeObjective(i)} className="btn-del">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technologies */}
            <div className="field-group">
              <label>Target Technologies &amp; Tools</label>
              <div className="tag-input-row">
                <input
                  type="text"
                  placeholder="e.g. Terraform, Prometheus, Docker, Helm"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                />
                <button type="button" className="btn-add-tag" onClick={addTech}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="pills-wrap">
                {technologies.map((t) => (
                  <span key={t} className="removable-pill">
                    {t} <button type="button" onClick={() => removeTech(t)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Target Skills */}
            <div className="field-group">
              <label>Skills Required &amp; Developed</label>
              <div className="tag-input-row">
                <input
                  type="text"
                  placeholder="e.g. CI/CD Pipelines, Kubernetes, Linux Administration"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button type="button" className="btn-add-tag" onClick={addSkill}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="pills-wrap">
                {skills.map((s) => (
                  <span key={s} className="removable-pill cyan">
                    {s} <button type="button" onClick={() => removeSkill(s)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-footer">
              <button
                type="submit"
                className="btn-primary-gradient"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner-icon" /> Synthesizing AI Architecture...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate AI Project Plan <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: AI Plan Review & Modification */}
      {step === 2 && generatedPlan && (
        <div className="plan-review-container">
          <div className="plan-summary-banner">
            <div className="banner-left">
              <Sparkles size={24} className="accent-icon" />
              <div>
                <h2>AI Architecture Plan Generated</h2>
                <p>{generatedPlan.overviewSummary}</p>
              </div>
            </div>
            <div className="banner-stats">
              <div className="stat-item">
                <span className="num">{editableTasks.length}</span>
                <span className="label">Total Tasks</span>
              </div>
              <div className="stat-item">
                <span className="num">{generatedPlan.phases.length}</span>
                <span className="label">Agile Phases</span>
              </div>
              <div className="stat-item">
                <span className="num">{durationDays}</span>
                <span className="label">Estimated Days</span>
              </div>
            </div>
          </div>

          <div className="tasks-timeline-editor">
            <h3>Structured Tasks with Validation Gates</h3>
            <p className="hint">
              Review and adjust task deliverables and validation criteria. Tasks with prerequisites will automatically
              lock until preceding requirements are validated by you.
            </p>

            <div className="tasks-list">
              {editableTasks.map((task, idx) => (
                <div key={task.id} className="task-editor-card">
                  <div className="task-header">
                    <span className="phase-badge">{task.phase}</span>
                    <span className="duration-tag">{task.durationDays} days</span>
                  </div>

                  <input
                    type="text"
                    className="task-title-input"
                    value={task.title}
                    onChange={(e) => {
                      const updated = [...editableTasks];
                      updated[idx].title = e.target.value;
                      setEditableTasks(updated);
                    }}
                  />

                  <textarea
                    rows={2}
                    className="task-desc-input"
                    value={task.description}
                    onChange={(e) => {
                      const updated = [...editableTasks];
                      updated[idx].description = e.target.value;
                      setEditableTasks(updated);
                    }}
                  />

                  <div className="task-meta-grid">
                    <div>
                      <strong>Deliverables:</strong>
                      <div className="items-row">
                        {task.deliverables?.map((del: string, i: number) => (
                          <span key={i} className="meta-tag">{del}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong>Validation Criteria:</strong>
                      <div className="items-row">
                        {task.validationCriteria?.map((vc: string, i: number) => (
                          <span key={i} className="meta-tag green">{vc}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="review-actions-bar">
            <button
              className="btn-secondary"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ArrowLeft size={16} /> Edit Requirements
            </button>

            <div className="actions-right">
              <button
                className="btn-outline"
                onClick={() => handleApprovePlan(false)}
                disabled={loading}
              >
                Save as Draft
              </button>

              <button
                className="btn-primary-gradient"
                onClick={() => handleApprovePlan(true)}
                disabled={loading}
              >
                <Check size={18} /> Approve Plan &amp; Open Recruitment (Max 4 Members)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style>{`
        .create-project-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .creation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
        .back-link:hover {
          color: var(--accent-cyan);
        }
        .steps-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .step-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .step-badge span {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 11px;
        }
        .step-badge.active {
          color: var(--accent-cyan);
          font-weight: 600;
        }
        .step-badge.active span {
          background: var(--accent-cyan);
          color: #070a0f;
          border-color: var(--accent-cyan);
        }
        .step-separator {
          width: 24px;
          height: 1px;
          background: var(--border-subtle);
        }
        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid var(--accent-rose);
          color: #fda4af;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }
        .form-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 36px;
          box-shadow: var(--shadow-card);
        }
        .form-card h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 28px;
        }
        .field-group {
          margin-bottom: 22px;
        }
        .field-group label {
          display: block;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .field-group input,
        .field-group textarea,
        .field-group select {
          width: 100%;
          padding: 11px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        .field-group input:focus,
        .field-group textarea:focus,
        .field-group select:focus {
          border-color: var(--border-focus);
        }
        .grid-2-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .tag-input-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .btn-add-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0 16px;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-cyan);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
        }
        .bullet-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bullet-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 13.5px;
          color: var(--text-secondary);
        }
        .btn-del {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .btn-del:hover {
          color: var(--accent-rose);
        }
        .pills-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .removable-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-subtle);
          font-size: 12.5px;
          color: var(--text-primary);
        }
        .removable-pill.cyan {
          background: rgba(0, 212, 255, 0.1);
          color: var(--accent-cyan);
          border-color: rgba(0, 212, 255, 0.25);
        }
        .removable-pill button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 14px;
        }
        .form-footer {
          margin-top: 32px;
          display: flex;
          justify-content: flex-end;
        }
        .btn-primary-gradient {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%);
          color: #070a0f;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary-gradient:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
        }
        .btn-outline {
          padding: 10px 18px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          cursor: pointer;
        }
        .plan-summary-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 212, 255, 0.08);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }
        .banner-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          max-width: 600px;
        }
        .accent-icon {
          color: var(--accent-cyan);
          flex-shrink: 0;
        }
        .banner-left h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .banner-left p {
          color: var(--text-secondary);
          font-size: 13.5px;
          line-height: 1.4;
        }
        .banner-stats {
          display: flex;
          gap: 20px;
        }
        .stat-item {
          text-align: center;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          padding: 10px 16px;
          border-radius: var(--radius-md);
        }
        .stat-item .num {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--accent-cyan);
        }
        .stat-item .label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .tasks-timeline-editor h3 {
          font-size: 18px;
          margin-bottom: 6px;
        }
        .tasks-timeline-editor .hint {
          color: var(--text-secondary);
          font-size: 13.5px;
          margin-bottom: 20px;
        }
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .task-editor-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 18px;
        }
        .task-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .phase-badge {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-cyan);
        }
        .duration-tag {
          font-size: 12px;
          color: var(--text-muted);
        }
        .task-title-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .task-desc-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .task-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 12px;
        }
        .items-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }
        .meta-tag {
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .meta-tag.green {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
        }
        .review-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
        }
        .actions-right {
          display: flex;
          gap: 12px;
        }
        .spinner-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
      </div>
    </div>
  );
};
