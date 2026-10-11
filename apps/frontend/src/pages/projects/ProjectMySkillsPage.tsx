import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Target,
  ShieldCheck,
  BookOpen,
  Zap,
  Loader2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Users,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  Filter,
  Flame,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { projectsApi, authApi, progressApi } from '../../api/client';
import type { StudentSkillDto, UserGamificationDto } from '@cloudlab/shared-types';
import { Navbar } from '../../components/Navbar';

export const ProjectMySkillsPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mySkills, setMySkills] = useState<StudentSkillDto[]>([]);
  const [gamification, setGamification] = useState<UserGamificationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'PRACTICED' | 'UNPRACTICED'>('ALL');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [meRes, skillsRes, gamifRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: { data: null } })),
        projectsApi.getMySkills().catch(() => ({ data: { data: [] } })),
        progressApi.getMyProfile().catch(() => ({ data: { data: null } })),
      ]);
      setCurrentUser(meRes.data?.data);
      const skills = skillsRes.data?.data || skillsRes.data || [];
      const gam = gamifRes.data?.data || gamifRes.data || null;
      const merged = mergeSkills(skills, gam);
      setMySkills(merged);
      setGamification(gam);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load your skills');
    } finally {
      setLoading(false);
    }
  };

  const mergeSkills = (projSkills: StudentSkillDto[], gam: UserGamificationDto | null): StudentSkillDto[] => {
    const map: Record<string, StudentSkillDto> = {};
    projSkills.forEach((s) => {
      map[s.skillName] = s;
    });
    (gam?.skills || []).forEach((gs) => {
      const name = typeof gs.skill === 'string' ? gs.skill : (gs as any).name;
      if (!name) return;
      const existing = map[name];
      if (!existing) {
        map[name] = {
          id: `gamif-${name}`,
          studentId: (gam as any)?.userId || '',
          skillId: name,
          skillName: name,
          category: (gs as any).category || 'CloudLab Core',
          level: Math.max(1, Math.round((gs.score || 0) / 20)),
          confidence: (gs.score || 0) / 100,
          source: 'ASSESSMENT' as any,
          evidenceDetails: gs.levelTitle || '',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      } else {
        const levelScore = Math.max(1, Math.round((gs.score || 0) / 20));
        map[name] = {
          ...existing,
          level: Math.max(existing.level, levelScore),
          confidence: Math.max(existing.confidence, (gs.score || 0) / 100),
        };
      }
    });

    const canonicalSkills = ['LINUX', 'DOCKER', 'KUBERNETES', 'NETWORKING', 'CICD', 'DEVSECOPS'];
    canonicalSkills.forEach((name) => {
      if (!map[name]) {
        map[name] = {
          id: `seed-${name}`,
          studentId: (gam as any)?.userId || '',
          skillId: name,
          skillName: name,
          category: 'CloudLab Core',
          level: 0,
          confidence: 0,
          source: 'EXERCISE' as any,
          evidenceDetails: 'Not started — take lessons and complete project tasks to grow this skill.',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      }
    });

    return Object.values(map);
  };

  const levelTitle = (lv: number) => {
    if (lv <= 0) return 'Not Started';
    if (lv === 1) return 'Novice';
    if (lv === 2) return 'Apprentice';
    if (lv === 3) return 'Practitioner';
    if (lv === 4) return 'Expert';
    return 'Master';
  };

  const levelColor = (lv: number) => {
    if (lv <= 0) return '#64748b';
    if (lv === 1) return '#3b82f6';
    if (lv === 2) return '#8b5cf6';
    if (lv === 3) return '#10b981';
    if (lv === 4) return '#f59e0b';
    return '#ef4444';
  };

  const skillIconLetters = (name: string) => {
    if (name.toUpperCase().includes('LINUX')) return 'LX';
    if (name.toUpperCase().includes('DOCKER')) return 'DK';
    if (name.toUpperCase().includes('KUBERNETES')) return 'K8S';
    if (name.toUpperCase().includes('NETWORKING')) return 'NET';
    if (name.toUpperCase().includes('CICD')) return 'CI';
    if (name.toUpperCase().includes('DEVSECOPS')) return 'SEC';
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <Loader2 size={36} className="spinner-icon" />
        <p>Loading your skills &amp; credential history…</p>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="error-fullscreen">
        <AlertTriangle size={36} />
        <h2>{error}</h2>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const totalSkills = mySkills.length;
  const practicedCount = mySkills.filter((s) => s.level > 0).length;
  const avgLevel = practicedCount === 0 ? 0 : Math.round((mySkills.reduce((a, s) => a + s.level, 0) / practicedCount) * 10) / 10;
  const overallConfidence = practicedCount === 0 ? 0 : Math.round((mySkills.reduce((a, s) => a + s.confidence, 0) / practicedCount) * 100);

  const filteredSkills = mySkills.filter((s) => {
    const matchesSearch = s.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (activeCategory === 'PRACTICED') return s.level > 0;
    if (activeCategory === 'UNPRACTICED') return s.level === 0;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar currentPage="other" />
      <div className="skills-page-container">
        <div className="detail-top-nav" style={{ marginBottom: 24 }}>


        </div>

        {/* Hero Card */}
        <div className="skills-hero-card">
          <div className="skills-hero-main">
            <div className="skills-hero-badge">
              <Award size={14} /> My Skills &amp; Verified Credentials
            </div>
            <h1 className="skills-hero-title">
              {currentUser ? `${currentUser.firstName || currentUser.email}'s Skills` : 'My Skills'}
            </h1>
            <p className="skills-hero-desc">
              Project tasks, quizzes, lessons, and instructor validations all contribute to a persistent, recommendation-ready skill profile.
              Level represents mastery (1–5), while Confidence reflects consistent success across assessments.
            </p>

            <div className="skills-stats-grid">
              <div className="skills-stat-card">
                <div className="skills-stat-icon-wrapper" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <Layers size={18} />
                </div>
                <div className="skills-stat-info">
                  <span className="skills-stat-label">Tracked</span>
                  <span className="skills-stat-value">{totalSkills}</span>
                </div>
              </div>

              <div className="skills-stat-card">
                <div className="skills-stat-icon-wrapper" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <TrendingUp size={18} />
                </div>
                <div className="skills-stat-info">
                  <span className="skills-stat-label">Practiced</span>
                  <span className="skills-stat-value" style={{ color: '#10b981' }}>{practicedCount}</span>
                </div>
              </div>

              <div className="skills-stat-card">
                <div className="skills-stat-icon-wrapper" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <Target size={18} />
                </div>
                <div className="skills-stat-info">
                  <span className="skills-stat-label">Avg Level</span>
                  <span className="skills-stat-value" style={{ color: '#8b5cf6' }}>{avgLevel.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 5</span></span>
                </div>
              </div>

              <div className="skills-stat-card">
                <div className="skills-stat-icon-wrapper" style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.25)' }}>
                  <ShieldCheck size={18} />
                </div>
                <div className="skills-stat-info">
                  <span className="skills-stat-label">Confidence</span>
                  <span className="skills-stat-value" style={{ color: '#00d4ff' }}>{overallConfidence}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="skills-gamification-box">
            <div className="skills-gamif-badge-icon">
              <BarChart3 size={26} color="#ffffff" />
            </div>
            {gamification ? (
              <>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: 2 }}>
                  Gamification Profile
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
                  Level {(gamification as any).level || 1}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', margin: '8px 0 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: 12 }}>
                    <Flame size={13} /> {(gamification as any).streakDays || 0}-day streak
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: 600, color: '#00d4ff', background: 'rgba(0,212,255,0.12)', padding: '3px 8px', borderRadius: 12 }}>
                    <Zap size={13} /> {(gamification as any).totalXp?.toLocaleString?.() || 0} XP
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {(gamification as any).achievements?.filter?.((a: any) => a.isUnlocked)?.length || 0} achievements unlocked.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                  Build Your Credentials
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                  Take courses, complete squad projects, and pass quizzes to start leveling up.
                </p>
                <button className="btn-primary-gradient" onClick={() => navigate('/learning')} style={{ padding: '8px 16px', fontSize: '12px', width: '100%' }}>
                  <BookOpen size={14} /> Start Learning
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '13px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>{error} — Showing cached skills; your recent progress will sync automatically.</div>
          </div>
        )}

        {/* Section Header & Filters */}
        <div style={{ marginTop: 32 }}>
          <div className="skills-filter-bar">
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Skill Matrix
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  {filteredSkills.length} Total
                </span>
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                Track your real-time mastery across key infrastructure and software engineering domains.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="skills-search-wrapper">
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="skills-search-input"
                  placeholder="Filter skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="skills-category-tabs">
                <button
                  className={`skills-tab-btn ${activeCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('ALL')}
                >
                  All ({mySkills.length})
                </button>
                <button
                  className={`skills-tab-btn ${activeCategory === 'PRACTICED' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('PRACTICED')}
                >
                  Active ({practicedCount})
                </button>
                <button
                  className={`skills-tab-btn ${activeCategory === 'UNPRACTICED' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('UNPRACTICED')}
                >
                  Locked ({totalSkills - practicedCount})
                </button>
              </div>

              <button
                className="btn-secondary"
                onClick={() => navigate('/learning')}
                style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, borderRadius: 20 }}
              >
                <BookOpen size={14} /> Start Lesson
              </button>
            </div>
          </div>

          {/* Grid of Skill Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {filteredSkills.map((s) => {
              const levelPct = Math.max(0, Math.min(100, (s.level / 5) * 100));
              const confPct = Math.max(0, Math.min(100, s.confidence * 100));
              const lvColor = levelColor(s.level);
              const avatarInitials = skillIconLetters(s.skillName);

              return (
                <div key={s.id} className="skill-card">
                  <div>
                    <div className="skill-card-top">
                      <div className="skill-header-main">
                        <div
                          className="skill-icon-avatar"
                          style={{
                            background: s.level > 0
                              ? `linear-gradient(135deg, ${lvColor}33, ${lvColor}11)`
                              : 'rgba(255,255,255,0.03)',
                            color: s.level > 0 ? lvColor : 'var(--text-muted)',
                            border: `1px solid ${s.level > 0 ? `${lvColor}55` : 'var(--border-subtle)'}`,
                          }}
                        >
                          {avatarInitials}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: s.level > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {s.skillName}
                          </h3>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                            {s.category || 'CloudLab Core'}
                          </div>
                        </div>
                      </div>

                      <span
                        className="skill-badge-level"
                        style={{
                          background: `${lvColor}18`,
                          color: lvColor,
                          border: `1px solid ${lvColor}40`,
                        }}
                      >
                        Lv {s.level || 0} · {levelTitle(s.level)}
                      </span>
                    </div>

                    {/* Progress Bars */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <TrendingUp size={12} style={{ color: lvColor }} /> Mastery Progress
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: lvColor, fontWeight: 700 }}>
                          {s.level} / 5 ({levelPct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="skill-progress-bar-bg">
                        <div
                          className="skill-progress-bar-fill"
                          style={{
                            width: `${levelPct}%`,
                            background: `linear-gradient(90deg, ${lvColor}aa, ${lvColor})`,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} style={{ color: 'var(--accent-cyan)' }} /> Verification Confidence
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {confPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="skill-progress-bar-bg" style={{ height: 6 }}>
                        <div
                          className="skill-progress-bar-fill"
                          style={{
                            width: `${confPct}%`,
                            background: 'linear-gradient(90deg, rgba(0,212,255,0.5), #00d4ff)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>Source: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{s.source}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        <span>{s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : 'Syncing'}</span>
                      </div>
                    </div>

                    {s.evidenceDetails && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          background: 'rgba(13,18,29,0.5)',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-subtle)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={s.evidenceDetails}
                      >
                        💡 {s.evidenceDetails}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSkills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)', marginTop: 16 }}>
              <Filter size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 6px 0' }}>No matching skills found</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Try adjusting your search criteria or category filter.
              </p>
            </div>
          )}
        </div>

        {/* Footer Feature Callout */}
        <div style={{ marginTop: 40, padding: '28px 32px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(139,92,246,0.07))', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 15px 35px -10px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, pointerEvents: 'none' }}>
            <Sparkles size={200} color="#8b5cf6" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(139,92,246,0.3)' }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>Persistent Evidence-Based Skill Ledger</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6, marginBottom: 14, maxWidth: 850 }}>
                All validated project work, quizzes, and learning milestones populate this profile automatically.
                Our AI recommendation engine uses these verified credentials to match you with optimal squad roles and upcoming project opportunities.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-primary-gradient" onClick={() => navigate('/projects')} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 700 }}>
                  <Layers size={14} /> Join Squad Projects
                </button>
                <button className="btn-secondary" onClick={() => navigate('/learning')} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600 }}>
                  <BookOpen size={14} /> Explore Learning Tracks
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMySkillsPage;

