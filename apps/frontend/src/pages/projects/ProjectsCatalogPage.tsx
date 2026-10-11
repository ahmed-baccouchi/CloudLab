import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Code2,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { projectsApi } from '../../api/client';
import type { ProjectDto } from '@cloudlab/shared-types';
import { Navbar } from '../../components/Navbar';

export const ProjectsCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadProjects();
  }, [filterStatus]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getProjects(
        filterStatus !== 'ALL' ? { status: filterStatus } : undefined
      );
      setProjects(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.technologies?.some((t) => t.toLowerCase().includes(q)) ||
      p.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECRUITING':
        return <span className="status-badge recruiting"><Users size={12} /> Recruiting (Max 4)</span>;
      case 'IN_PROGRESS':
        return <span className="status-badge in-progress"><Clock size={12} /> In Progress</span>;
      case 'COMPLETED':
        return <span className="status-badge completed"><CheckCircle2 size={12} /> Completed</span>;
      default:
        return <span className="status-badge draft"><Layers size={12} /> {status}</span>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar currentPage="projects" />
      <div className="projects-catalog-container">
      {/* Top Header */}
      <header className="projects-header">
        <div className="header-left">
          <div className="badge-glow">
            <FolderGit2 size={16} /> CloudLab Projects Engine
          </div>
          <h1>Collaborative Engineering Projects</h1>
          <p>
            Form agile squads of up to 4 students, get AI-generated architectural plans,
            manage task dependencies, submit verifiable evidence, and earn validated skill credentials.
          </p>
        </div>
        <div className="header-right">
          <button
            className="btn-primary-gradient"
            onClick={() => navigate('/projects/create')}
          >
            <Plus size={18} />
            Create Project with AI Plan
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by project title, skill (Docker, K8s, CI/CD) or tech stack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="status-filters">
          {['ALL', 'RECRUITING', 'IN_PROGRESS', 'COMPLETED', 'DRAFT'].map((st) => (
            <button
              key={st}
              className={`filter-chip ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading projects &amp; team formations...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <FolderGit2 size={48} className="empty-icon" />
          <h3>No projects found</h3>
          <p>Be the first to architect a team project with our AI planning generator!</p>
          <button
            className="btn-secondary"
            onClick={() => navigate('/projects/create')}
          >
            <Plus size={16} /> Create New Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="card-top">
                <div className="status-container">{getStatusBadge(project.status)}</div>
                <span className={`diff-pill ${project.difficulty?.toLowerCase()}`}>
                  {project.difficulty}
                </span>
              </div>

              <h2 className="project-title">{project.title}</h2>
              <p className="project-desc">{project.description}</p>

              {/* Technologies */}
              {project.technologies && project.technologies.length > 0 && (
                <div className="tags-container">
                  {project.technologies.slice(0, 4).map((tech, i) => (
                    <span key={i} className="tech-tag">
                      <Code2 size={12} /> {tech}
                    </span>
                  ))}
                  {project.technologies.length > 4 && (
                    <span className="tech-tag-more">+{project.technologies.length - 4}</span>
                  )}
                </div>
              )}

              {/* Target Skills */}
              {project.skills && project.skills.length > 0 && (
                <div className="skills-row">
                  <span className="skill-label">Skills:</span>
                  <div className="skill-pills">
                    {project.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-footer">
                <div className="members-indicator">
                  <Users size={15} />
                  <span>
                    <strong>{project.currentMemberCount || 1}</strong> / 4 Members
                  </span>
                  {project.currentMemberCount === 4 && (
                    <span className="full-badge">Squad Full</span>
                  )}
                </div>

                <div className="duration-indicator">
                  <Calendar size={15} />
                  <span>{project.durationDays || 14} Days</span>
                </div>

                <div className="open-arrow">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Styled JSX / Inline styles matching index.css theme */}
      <style>{`
        .projects-catalog-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 40px 24px;
        }
        .projects-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 36px;
          flex-wrap: wrap;
        }
        .badge-glow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid var(--border-accent);
          color: var(--accent-cyan);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .header-left h1 {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .header-left p {
          max-width: 680px;
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.6;
        }
        .btn-primary-gradient {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%);
          color: #070a0f;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 212, 255, 0.25);
        }
        .btn-primary-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 212, 255, 0.35);
        }
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 300px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-box input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          border-radius: var(--radius-md);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-box input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
        }
        .status-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-chip {
          padding: 8px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .filter-chip.active {
          background: rgba(0, 212, 255, 0.15);
          border-color: var(--accent-cyan);
          color: var(--accent-cyan);
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(370px, 1fr));
          gap: 22px;
        }
        .project-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 22px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .project-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-accent);
          box-shadow: var(--shadow-glow);
          background: var(--bg-card-hover);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.recruiting {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-badge.in-progress {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .status-badge.completed {
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .status-badge.draft {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .diff-pill {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .diff-pill.beginner {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .diff-pill.intermediate {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .diff-pill.advanced {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
        }
        .project-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .project-desc {
          color: var(--text-secondary);
          font-size: 13.5px;
          line-height: 1.5;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .tech-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          padding: 3px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .tech-tag-more {
          font-size: 11px;
          padding: 3px 6px;
          color: var(--text-muted);
        }
        .skills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .skill-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .skill-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .skill-pill {
          font-size: 11px;
          padding: 2px 7px;
          background: rgba(0, 212, 255, 0.08);
          color: var(--accent-cyan);
          border-radius: 4px;
          font-weight: 500;
        }
        .card-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 12.5px;
        }
        .members-indicator, .duration-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .full-badge {
          font-size: 10px;
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-radius: 4px;
          margin-left: 4px;
        }
        .open-arrow {
          margin-left: auto;
          color: var(--text-muted);
          transition: transform 0.2s;
        }
        .project-card:hover .open-arrow {
          transform: translateX(4px);
          color: var(--accent-cyan);
        }
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: var(--bg-card);
          border: 1px dashed var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .empty-icon {
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .empty-state h3 {
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .empty-state p {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 20px;
        }
        .loading-state {
          text-align: center;
          padding: 60px 0;
          color: var(--text-secondary);
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 212, 255, 0.2);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </div>
  );
};
