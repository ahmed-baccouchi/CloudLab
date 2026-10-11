import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Terminal,
  ArrowLeft,
  Layers,
  Plus,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  BookOpen,
  LogOut,
  BookMarked,
  Loader2,
  AlertCircle,
  GripVertical,
  Sparkles,
  FileCheck,
  GraduationCap,
} from 'lucide-react';
import { learningApi } from '../../api/client';
import { secureLogout, getAccessToken, requireInstructor } from '../../utils/auth';

interface LocalModule {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
}

export const CourseModuleSetupPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<LocalModule | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingModuleQuiz, setGeneratingModuleQuiz] = useState<string | null>(null);
  const [generatingCourseQuiz, setGeneratingCourseQuiz] = useState(false);

  useEffect(() => {
    if (!getAccessToken() || !requireInstructor()) {
      navigate('/login');
      return;
    }
    loadCourseAndModules();
  }, [courseId, navigate]);

  const loadCourseAndModules = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const allCoursesRes = await learningApi.getAllCourses().catch(() => ({ data: { data: [] } }));
      const allCourses: any[] = allCoursesRes.data?.data || allCoursesRes.data || [];
      const targetCourse: any = allCourses.find((c) => c.id === courseId) || null;

      if (targetCourse) {
        setCourse(targetCourse);
        const trackId = targetCourse.trackId;
        if (trackId) {
          const tracksRes = await learningApi.getTracks().catch(() => ({ data: { data: [] } }));
          const tracks: any[] = tracksRes.data?.data || tracksRes.data || [];
          const t = tracks.find((x) => x.id === trackId);
          if (t) setTrack(t);
        }

        const mods: LocalModule[] =
          targetCourse.modules?.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description || '',
            orderIndex: typeof m.orderIndex === 'number' ? m.orderIndex : 0,
          })) || [];
        mods.sort((a, b) => a.orderIndex - b.orderIndex);
        setModules(mods);
      } else {
        const trackSlug =
          (await learningApi.getTracks().catch(() => ({ data: { data: [] } }))).data?.data?.[0]?.slug || 'linux-systems';
        const trackRes = await learningApi.getTrackBySlug(trackSlug).catch(() => null);
        const fetchedTrack = trackRes?.data?.data || null;
        const foundCourse = fetchedTrack?.courses?.find((c: any) => c.id === courseId) || null;
        if (foundCourse) {
          setTrack(fetchedTrack);
          setCourse(foundCourse);
          const mods: LocalModule[] =
            foundCourse.modules?.map((m: any) => ({
              id: m.id,
              title: m.title,
              description: m.description || '',
              orderIndex: typeof m.orderIndex === 'number' ? m.orderIndex : 0,
            })) || [];
          mods.sort((a, b) => a.orderIndex - b.orderIndex);
          setModules(mods);
        }
      }
    } catch (err) {
      console.error('Failed to load course/modules', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleForm({ title: '', description: '' });
    setShowModuleModal(true);
  };

  const openEditModule = (m: LocalModule) => {
    setEditingModule(m);
    setModuleForm({ title: m.title, description: m.description || '' });
    setShowModuleModal(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !moduleForm.title.trim()) return;
    try {
      setActionLoading(true);
      if (editingModule) {
        await learningApi.updateModule(editingModule.id, {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
        });
      } else {
        await learningApi.createModule({
          courseId,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
        });
      }
      setShowModuleModal(false);
      await loadCourseAndModules();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save module');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Delete this module and all its lessons? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await learningApi.deleteModule(moduleId);
      await loadCourseAndModules();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete module');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= modules.length) return;
    const copy = [...modules];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    const reordered = copy.map((m, idx) => ({ ...m, orderIndex: idx }));
    setModules(reordered);

    try {
      setSaving(true);
      await learningApi.reorderModules(
        courseId as string,
        reordered.map((m) => m.id),
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reorder modules. Changes reverted.');
      await loadCourseAndModules();
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateModuleQuiz = async (moduleId: string, moduleTitle: string) => {
    if (!window.confirm(`✨ Generate an AI-powered Module Quiz for "${moduleTitle}"?\n\nPass threshold: 80%\nStudents must score ≥80% to unlock the next module.`)) return;
    try {
      setGeneratingModuleQuiz(moduleId);
      const res = await learningApi.generateModuleQuiz(moduleId);
      const quiz = res.data?.data || res.data;
      if (quiz?.questions?.length) {
        alert(`✅ AI Module Quiz generated successfully!\n\nTitle: ${quiz.title}\nQuestions: ${quiz.questions.length}\nPass score: ${quiz.passingScore || 80}%\n\nStudents will be prompted to take this quiz after completing all lessons in the module.`);
      } else {
        alert(res?.data?.message || 'Module quiz generated (questions not previewable here).');
      }
    } catch (err: any) {
      alert('❌ Failed to generate module quiz: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setGeneratingModuleQuiz(null);
    }
  };

  const handleGenerateCourseFinalExam = async () => {
    if (!course) return;
    if (!window.confirm(`🎓 Generate AI-powered Course Final Exam for "${course.title}"?\n\nPass threshold: 90%\nStudents must pass ALL module quizzes first, then score ≥90% on this final exam to complete the course and earn major XP/skill rewards.`)) return;
    try {
      setGeneratingCourseQuiz(true);
      const res = await learningApi.generateCourseQuiz(course.id);
      const quiz = res.data?.data || res.data;
      if (quiz?.questions?.length) {
        alert(`✅ Course Final Exam generated successfully!\n\nTitle: ${quiz.title}\nQuestions: ${quiz.questions.length}\nPass score: ${quiz.passingScore || 90}%\nXP reward: ${quiz.xpOnPass || 500} XP\nSkill points: ${quiz.skillPointsOnPass || 100}\n\nStudents unlock this only after passing every module quiz in the course.`);
      } else {
        alert(res?.data?.message || 'Course final exam generated (questions not previewable here).');
      }
    } catch (err: any) {
      alert('❌ Failed to generate course final exam: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setGeneratingCourseQuiz(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-cyan)',
          fontFamily: 'JetBrains Mono',
          fontSize: '13px',
        }}
      >
        <Loader2 size={18} style={{ marginRight: '10px', animation: 'spin 1s linear infinite' }} /> Loading module studio…
      </div>
    );
  }

  return (
    <div className="module-setup-page">
      <header className="module-setup-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link
            to="/instructor/dashboard"
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', flexShrink: 0 }}
          >
            <ArrowLeft size={14} /> Back to Studio
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={16} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Course Module Studio
                </div>
                {track && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Track: <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{track.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saving && (
            <div
              style={{
                fontSize: '11px',
                color: '#f59e0b',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Syncing order…
            </div>
          )}
          <Link
            to="/learning"
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <BookOpen size={14} /> Preview Track
          </Link>
          <button onClick={handleLogout} className="btn-logout" title="Log out" style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '28px 24px' }}>
        {course && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(0, 212, 255, 0.05))',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: 'var(--accent-purple)',
                letterSpacing: '0.08em',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Configuring course
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.01em' }}>{course.title}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {course.summary || 'Add and organize modules below. Each module contains lessons that students will work through sequentially.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 700,
                }}
              >
                <Layers size={12} /> {modules.length} module{modules.length !== 1 ? 's' : ''}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  fontWeight: 700,
                }}
              >
                <BookMarked size={12} /> {course.lessons?.length ?? 0} total lessons
              </div>
              {course.difficultyLevel && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {course.difficultyLevel}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} color="var(--accent-purple)" /> Modules & Sequencing
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Students will complete modules in the order shown below.
            </p>
          </div>
          <button
            onClick={openCreateModule}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}
          >
            <Plus size={15} /> Add First Module
          </button>
        </div>

        {modules.length === 0 ? (
          <div className="module-empty-state">
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.14))',
                border: '1px dashed rgba(139, 92, 246, 0.35)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={26} color="var(--accent-purple)" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No modules yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              This is where you'll structure the course into digestible sections. Each module groups related lessons and ends with a quick check-in quiz so students can validate their understanding before moving on.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                textAlign: 'left',
                maxWidth: '520px',
                margin: '0 auto 22px',
                padding: '12px 16px',
                background: 'rgba(0, 212, 255, 0.06)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: '10px',
              }}
            >
              <AlertCircle size={16} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Aim for 3–8 modules per course. Break modules around clear learning objectives — for example, "Container Orchestration" followed by "Cluster Networking" is a natural progression.
              </div>
            </div>
            <button
              onClick={openCreateModule}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}
            >
              <Plus size={16} /> Create Your First Module
            </button>
          </div>
        ) : (
          <div className="module-list">
            {modules.map((m, index) => (
              <div key={m.id} className="module-card">
                <div className="module-reorder-btns" title="Drag (not available) or use arrows to reorder">
                  <div style={{ padding: '4px', color: 'var(--border-subtle)', textAlign: 'center' }}>
                    <GripVertical size={14} />
                  </div>
                  <button onClick={() => handleReorder(index, 'up')} disabled={index === 0 || saving} title="Move up">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => handleReorder(index, 'down')} disabled={index === modules.length - 1 || saving} title="Move down">
                    <ChevronDown size={15} />
                  </button>
                </div>

                <div className="module-order-badge">{String(index + 1).padStart(2, '0')}</div>

                <div className="module-body">
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{m.title}</div>
                  {m.description ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{m.description}</p>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                      No module description added yet.
                    </p>
                  )}
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      <Terminal size={12} /> Order index {m.orderIndex}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ID: <code style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-muted)' }}>{m.id.slice(0, 10)}…</code>
                    </div>
                  </div>
                </div>

                <div className="module-actions" style={{ flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => openEditModule(m)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteModule(m.id)}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!actionLoading) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.18)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.25)';
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateModuleQuiz(m.id, m.title)}
                    disabled={!!generatingModuleQuiz || generatingModuleQuiz === m.id}
                    style={{
                      padding: '7px 10px',
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(0, 212, 255, 0.1))',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: 'var(--accent-purple)',
                      borderRadius: '6px',
                      cursor: generatingModuleQuiz ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.15s',
                      opacity: generatingModuleQuiz && generatingModuleQuiz !== m.id ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!generatingModuleQuiz) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-purple)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(0, 212, 255, 0.15))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(0, 212, 255, 0.1))';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139, 92, 246, 0.35)';
                    }}
                  >
                    {generatingModuleQuiz === m.id ? (
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    AI Module Quiz (80% pass)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modules.length > 0 && (
          <div
            style={{
              marginTop: '32px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(245, 158, 11, 0.06))',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px 26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#10b981', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Assessment Pipeline
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={18} color="var(--accent-cyan)" /> Module Quizzes &amp; Course Final Exam
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '6px', marginBottom: 0, maxWidth: '640px' }}>
                  Students follow a strict gated flow: <strong style={{ color: 'var(--text-primary)' }}>read every lesson</strong> in a module → unlock the module quiz (pass 80% to proceed) → advance to the next module. After passing <em>all</em> module quizzes, they unlock the course final exam (pass 90% for completion rewards: 500 XP + skill points).
                </p>
              </div>
              <button
                onClick={handleGenerateCourseFinalExam}
                disabled={generatingCourseQuiz}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: generatingCourseQuiz
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(245, 158, 11, 0.4))'
                    : 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: generatingCourseQuiz ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: generatingCourseQuiz ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.25)',
                }}
              >
                {generatingCourseQuiz ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <GraduationCap size={15} />
                )}
                {generatingCourseQuiz ? 'Generating Final Exam…' : '✨ AI Generate Course Final Exam (90%)'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                marginTop: '18px',
              }}
            >
              {[
                { label: 'Lessons', desc: 'Read all in module', icon: BookOpen, color: '#00d4ff', bg: 'rgba(0, 212, 255, 0.12)' },
                { label: 'Module Quiz', desc: 'Pass ≥80% to advance', icon: Sparkles, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.12)' },
                { label: 'All Modules Cleared', desc: 'Every quiz passed', icon: FileCheck, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
                { label: 'Final Exam', desc: 'Pass ≥90% → Rewards', icon: GraduationCap, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div
                    style={{
                      background: step.bg,
                      border: `1px solid ${step.color}33`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ padding: '4px', borderRadius: '6px', background: `${step.color}22` }}>
                        <step.icon size={12} color={step.color} />
                      </div>
                      <div style={{ fontSize: '10px', color: step.color, fontWeight: 800, letterSpacing: '0.04em' }}>STEP {i + 1}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{step.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        display: i < arr.length - 1 ? 'block' : 'none',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '10px 14px',
                background: 'rgba(0, 212, 255, 0.06)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={15} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>How to create assessments:</strong> Click the <strong style={{ color: 'var(--accent-purple)' }}>✨ AI Module Quiz (80% pass)</strong> button on each module card to generate a quiz for that specific module. Once all modules have quizzes, click the green <strong style={{ color: '#10b981' }}>Generate Course Final Exam</strong> button above to create the capstone assessment. You can regenerate any quiz anytime; students always receive the latest version.
              </div>
            </div>
          </div>
        )}

        {modules.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '24px',
              padding: '16px 20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Happy with the module order? Students will see <strong style={{ color: 'var(--text-primary)' }}>{modules.length}</strong> module{modules.length !== 1 ? 's' : ''} in this exact sequence.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={openCreateModule} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={13} /> Add Another
              </button>
              <Link
                to="/instructor/dashboard"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <BookOpen size={13} /> Finish & Return to Studio
              </Link>
            </div>
          </div>
        )}
      </main>

      {showModuleModal && (
        <div
          onClick={() => setShowModuleModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Layers size={18} color="var(--accent-purple)" />
                  {editingModule ? 'Edit Module' : 'Create New Module'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  {editingModule
                    ? 'Update the module title and learning objective.'
                    : 'Give this module a clear, outcome-focused title. Students will see it on the course landing page.'}
                </p>
              </div>
              <button
                onClick={() => setShowModuleModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Kubernetes Workload Controllers"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Description / Learning Objective
                </label>
                <textarea
                  rows={4}
                  placeholder="By the end of this module, students will be able to deploy and debug Deployment/DaemonSet workloads on a live cluster…"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowModuleModal(false)} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}
                >
                  {actionLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  {actionLoading ? 'Saving…' : editingModule ? 'Save Changes' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
