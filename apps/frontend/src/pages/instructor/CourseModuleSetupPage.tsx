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
  HelpCircle,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  Radio,
  Check,
} from 'lucide-react';
import { learningApi } from '../../api/client';
import { secureLogout, getAccessToken, requireInstructor } from '../../utils/auth';

interface LocalLesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  contentMarkdown: string;
  type: string;
  durationMinutes: number;
  orderIndex: number;
  challengeId?: string;
  resources?: any[];
}

interface LocalModule {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessons: LocalLesson[];
}

interface QuizQuestionDraft {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const CourseModuleSetupPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Module modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<LocalModule | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Lesson modal state
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<LocalModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<LocalLesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    slug: '',
    type: 'READING',
    durationMinutes: 15,
    contentMarkdown: '',
    challengeId: '',
  });

  // Quiz Modal State (Module Quiz or Course Final Exam)
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTarget, setQuizTarget] = useState<{ type: 'MODULE' | 'COURSE'; id: string; title: string } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizForm, setQuizForm] = useState<{
    title: string;
    passingScore: number;
    questions: QuizQuestionDraft[];
    xpOnPass?: number;
    skillPointsOnPass?: number;
  }>({
    title: '',
    passingScore: 80,
    questions: [],
    xpOnPass: 500,
    skillPointsOnPass: 100,
  });

  // Optional AI generation states (preserved for backward compatibility)
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
      let targetCourse: any = null;
      try {
        const cRes = await learningApi.getCourseById(courseId);
        targetCourse = cRes.data?.data || cRes.data;
      } catch (e) {
        console.warn('Direct getCourseById failed, fallback to getAllCourses', e);
      }

      if (!targetCourse) {
        const allCoursesRes = await learningApi.getAllCourses().catch(() => ({ data: { data: [] } }));
        const allCourses: any[] = allCoursesRes.data?.data || allCoursesRes.data || [];
        targetCourse = allCourses.find((c) => c.id === courseId) || null;
      }

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
            lessons: (m.lessons || []).map((l: any, lIdx: number) => ({
              id: l.id,
              moduleId: m.id,
              slug: l.slug || '',
              title: l.title || '',
              contentMarkdown: l.contentMarkdown || '',
              type: l.type || 'READING',
              durationMinutes: l.durationMinutes || 15,
              orderIndex: typeof l.orderIndex === 'number' ? l.orderIndex : lIdx + 1,
              challengeId: l.challengeId || '',
              resources: l.resources || [],
            })).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
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
              lessons: (m.lessons || []).map((l: any, lIdx: number) => ({
                id: l.id,
                moduleId: m.id,
                slug: l.slug || '',
                title: l.title || '',
                contentMarkdown: l.contentMarkdown || '',
                type: l.type || 'READING',
                durationMinutes: l.durationMinutes || 15,
                orderIndex: typeof l.orderIndex === 'number' ? l.orderIndex : lIdx + 1,
                challengeId: l.challengeId || '',
                resources: l.resources || [],
              })).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
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

  // ===================== Module Handlers =====================
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
          orderIndex: modules.length + 1,
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
    const reordered = copy.map((m, idx) => ({ ...m, orderIndex: idx + 1 }));
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

  // ===================== Lesson Handlers =====================
  const openCreateLesson = (module: LocalModule) => {
    setActiveModuleForLesson(module);
    setEditingLesson(null);
    setLessonForm({
      title: '',
      slug: '',
      type: 'READING',
      durationMinutes: 15,
      contentMarkdown: `# Overview\n\nWrite your lesson content here. Explain key concepts clearly with code blocks and terminal commands.\n\n\`\`\`bash\n# Example command\necho "Welcome to ${module.title}"\n\`\`\`\n\n## Key Objectives\n- Understand core principles\n- Execute hands-on commands\n- Validate results`,
      challengeId: '',
    });
    setShowLessonModal(true);
  };

  const openEditLesson = (module: LocalModule, lesson: LocalLesson) => {
    setActiveModuleForLesson(module);
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type || 'READING',
      durationMinutes: lesson.durationMinutes || 15,
      contentMarkdown: lesson.contentMarkdown || '',
      challengeId: lesson.challengeId || '',
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForLesson || !lessonForm.title.trim()) return;
    try {
      setActionLoading(true);
      const slug = (lessonForm.slug.trim() || lessonForm.title.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `lesson-${Date.now()}`;

      if (editingLesson) {
        await learningApi.updateLesson(editingLesson.id, {
          moduleId: activeModuleForLesson.id,
          title: lessonForm.title.trim(),
          slug,
          type: lessonForm.type as any,
          durationMinutes: Number(lessonForm.durationMinutes) || 15,
          contentMarkdown: lessonForm.contentMarkdown.trim(),
          challengeId: lessonForm.challengeId.trim() || undefined,
        });
      } else {
        await learningApi.createLesson({
          moduleId: activeModuleForLesson.id,
          title: lessonForm.title.trim(),
          slug,
          type: lessonForm.type as any,
          durationMinutes: Number(lessonForm.durationMinutes) || 15,
          contentMarkdown: lessonForm.contentMarkdown.trim(),
          challengeId: lessonForm.challengeId.trim() || undefined,
          orderIndex: activeModuleForLesson.lessons.length + 1,
        });
      }
      setShowLessonModal(false);
      await loadCourseAndModules();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Failed to save lesson');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await learningApi.deleteLesson(lessonId);
      await loadCourseAndModules();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete lesson');
    } finally {
      setActionLoading(false);
    }
  };

  // ===================== Manual Quiz Handlers =====================
  const openManageModuleQuiz = async (module: LocalModule) => {
    setQuizTarget({ type: 'MODULE', id: module.id, title: module.title });
    setShowQuizModal(true);
    setQuizLoading(true);
    try {
      const res = await learningApi.getModuleQuiz(module.id).catch(() => null);
      const existing = res?.data?.data || res?.data;
      if (existing && existing.questions?.length > 0) {
        setQuizForm({
          title: existing.title || `${module.title} Assessment`,
          passingScore: existing.passingScore || 80,
          questions: existing.questions.map((q: any) => ({
            id: q.id,
            question: q.question || '',
            options: Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ['', '', '', ''],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || '',
          })),
        });
      } else {
        // Default starter questions
        setQuizForm({
          title: `${module.title} Assessment`,
          passingScore: 80,
          questions: [
            {
              id: `q-1-${Date.now()}`,
              question: `What is the primary objective of ${module.title}?`,
              options: [
                'To understand core principles and practical workflows',
                'To bypass security policies without verification',
                'To run arbitrary scripts without error checking',
                'To terminate running production services randomly',
              ],
              correctIndex: 0,
              explanation: 'Understanding foundational principles and reliable workflows is essential for reliable operations.',
            },
          ],
        });
      }
    } catch (err) {
      console.warn('Failed to load module quiz', err);
    } finally {
      setQuizLoading(false);
    }
  };

  const openManageCourseFinalExam = async () => {
    if (!course) return;
    setQuizTarget({ type: 'COURSE', id: course.id, title: course.title });
    setShowQuizModal(true);
    setQuizLoading(true);
    try {
      const res = await learningApi.getCourseQuiz(course.id).catch(() => null);
      const existing = res?.data?.data || res?.data;
      if (existing && existing.questions?.length > 0) {
        setQuizForm({
          title: existing.title || `${course.title} Final Exam`,
          passingScore: existing.passingScore || 90,
          xpOnPass: existing.xpOnPass || 500,
          skillPointsOnPass: existing.skillPointsOnPass || 100,
          questions: existing.questions.map((q: any) => ({
            id: q.id,
            question: q.question || '',
            options: Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ['', '', '', ''],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || '',
          })),
        });
      } else {
        setQuizForm({
          title: `${course.title} Final Exam`,
          passingScore: 90,
          xpOnPass: 500,
          skillPointsOnPass: 100,
          questions: [
            {
              id: `q-1-${Date.now()}`,
              question: `Which approach represents best practice when completing the ${course.title} course?`,
              options: [
                'Review lessons, master practical concepts, and pass all assessments',
                'Skip module reading and guess answers randomly',
                'Ignore system alerts and proceed without testing',
                'Disable error logs to avoid seeing failure messages',
              ],
              correctIndex: 0,
              explanation: 'Systematic study, hands-on practice, and thorough assessment demonstrate true competency.',
            },
          ],
        });
      }
    } catch (err) {
      console.warn('Failed to load course quiz', err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q-${prev.questions.length + 1}-${Date.now()}`,
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: '',
        },
      ],
    }));
  };

  const handleRemoveQuestion = (qIdx: number) => {
    if (quizForm.questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIdx),
    }));
  };

  const handleQuestionTextChange = (qIdx: number, text: string) => {
    setQuizForm((prev) => {
      const copy = [...prev.questions];
      copy[qIdx] = { ...copy[qIdx], question: text };
      return { ...prev, questions: copy };
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuizForm((prev) => {
      const copy = [...prev.questions];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = val;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return { ...prev, questions: copy };
    });
  };

  const handleSetCorrectIndex = (qIdx: number, optIdx: number) => {
    setQuizForm((prev) => {
      const copy = [...prev.questions];
      copy[qIdx] = { ...copy[qIdx], correctIndex: optIdx };
      return { ...prev, questions: copy };
    });
  };

  const handleExplanationChange = (qIdx: number, val: string) => {
    setQuizForm((prev) => {
      const copy = [...prev.questions];
      copy[qIdx] = { ...copy[qIdx], explanation: val };
      return { ...prev, questions: copy };
    });
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTarget) return;

    if (!quizForm.title.trim()) {
      alert('Please provide a quiz title.');
      return;
    }
    if (quizForm.questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }
    for (let i = 0; i < quizForm.questions.length; i++) {
      const q = quizForm.questions[i];
      if (!q.question.trim()) {
        alert(`Question #${i + 1} is missing the question prompt.`);
        return;
      }
      const filledOptions = q.options.filter((o) => o.trim().length > 0);
      if (filledOptions.length < 2) {
        alert(`Question #${i + 1} must have at least 2 options.`);
        return;
      }
    }

    try {
      setQuizSaving(true);
      if (quizTarget.type === 'MODULE') {
        await learningApi.saveModuleQuiz(quizTarget.id, {
          title: quizForm.title.trim(),
          passingScore: Number(quizForm.passingScore) || 80,
          questions: quizForm.questions,
        });
        alert(`✅ Module Quiz for "${quizTarget.title}" saved successfully with ${quizForm.questions.length} question(s)!`);
      } else {
        await learningApi.saveCourseQuiz(quizTarget.id, {
          title: quizForm.title.trim(),
          passingScore: Number(quizForm.passingScore) || 90,
          xpOnPass: Number(quizForm.xpOnPass) || 500,
          skillPointsOnPass: Number(quizForm.skillPointsOnPass) || 100,
          questions: quizForm.questions,
        });
        alert(`✅ Course Final Exam saved successfully with ${quizForm.questions.length} question(s)!`);
      }
      setShowQuizModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Failed to save quiz');
    } finally {
      setQuizSaving(false);
    }
  };

  // Optional AI Generation (preserved for convenience)
  const handleGenerateModuleQuiz = async (moduleId: string, moduleTitle: string) => {
    if (!window.confirm(`✨ Auto-generate a quiz draft for "${moduleTitle}" using AI?\n\nPass threshold: 80%`)) return;
    try {
      setGeneratingModuleQuiz(moduleId);
      const res = await learningApi.generateModuleQuiz(moduleId);
      const quiz = res.data?.data || res.data;
      alert(`✅ Quiz draft generated! You can now click "Manage Quiz" to review or customize the questions.`);
      openManageModuleQuiz(modules.find((m) => m.id === moduleId)!);
    } catch (err: any) {
      alert('❌ AI generation error: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setGeneratingModuleQuiz(null);
    }
  };

  const handleGenerateCourseFinalExam = async () => {
    if (!course) return;
    if (!window.confirm(`🎓 Auto-generate Course Final Exam draft for "${course.title}"?`)) return;
    try {
      setGeneratingCourseQuiz(true);
      await learningApi.generateCourseQuiz(course.id);
      alert(`✅ Final Exam draft generated! You can now click "Manage Final Exam" to review and edit questions.`);
      openManageCourseFinalExam();
    } catch (err: any) {
      alert('❌ AI generation error: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
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

  const totalLessonsCount = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="module-setup-page" style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(13, 18, 29, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
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
                  Course Curriculum &amp; Assessment Studio
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
            <BookOpen size={14} /> Preview Catalog
          </Link>
          <button onClick={handleLogout} className="btn-logout" title="Log out" style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '28px 24px 80px 24px' }}>
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
              Configuring Course Content
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.01em' }}>{course.title}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {course.summary || 'Add and organize modules below. Inside each module, create lessons and set up custom quizzes that students will complete sequentially.'}
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
                <BookMarked size={12} /> {totalLessonsCount} total lesson{totalLessonsCount !== 1 ? 's' : ''}
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

        {/* Section Heading & Create Module Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-purple)" /> Modules, Lessons &amp; Quizzes
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
              Structure your course into modules. Inside each module, click <strong style={{ color: 'var(--accent-cyan)' }}>+ Add Lesson</strong> to add study content, and <strong style={{ color: 'var(--accent-purple)' }}>Create / Edit Quiz</strong> to configure the assessment questions.
            </p>
          </div>
          <button
            onClick={openCreateModule}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              fontSize: '13px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              borderColor: '#8b5cf6',
            }}
          >
            <Plus size={15} /> Add Module
          </button>
        </div>

        {modules.length === 0 ? (
          <div className="module-empty-state" style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
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
              Create your first module to begin structuring the course. You can then add lessons and create custom assessment quizzes inside each module.
            </p>
            <button
              onClick={openCreateModule}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}
            >
              <Plus size={16} /> Create Your First Module
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {modules.map((m, index) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Module Header Row */}
                <div
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    background: 'rgba(255, 255, 255, 0.015)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Reorder Arrows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, marginTop: '2px' }}>
                    <button
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0 || saving}
                      title="Move module up"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '3px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        color: index === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === modules.length - 1 || saving}
                      title="Move module down"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '3px',
                        cursor: index === modules.length - 1 ? 'not-allowed' : 'pointer',
                        color: index === modules.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Order Badge */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 212, 255, 0.15))',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--accent-purple)',
                      flexShrink: 0,
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Module Title & Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>{m.title}</h3>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(0, 212, 255, 0.1)',
                          color: 'var(--accent-cyan)',
                          border: '1px solid rgba(0, 212, 255, 0.25)',
                          fontWeight: 700,
                        }}
                      >
                        {m.lessons.length} lesson{m.lessons.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {m.description ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {m.description}
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        No module description added yet.
                      </p>
                    )}
                  </div>

                  {/* Module Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Add Lesson Button */}
                    <button
                      onClick={() => openCreateLesson(m)}
                      className="btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(59, 130, 246, 0.2))',
                        border: '1px solid rgba(0, 212, 255, 0.4)',
                        color: 'var(--accent-cyan)',
                        fontWeight: 700,
                      }}
                    >
                      <Plus size={14} /> Add Lesson
                    </button>

                    {/* Manual Quiz Button */}
                    <button
                      onClick={() => openManageModuleQuiz(m)}
                      className="btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))',
                        border: '1px solid rgba(139, 92, 246, 0.35)',
                        color: 'var(--accent-purple)',
                        fontWeight: 700,
                      }}
                    >
                      <HelpCircle size={14} /> Create / Edit Quiz
                    </button>

                    {/* Edit Module */}
                    <button
                      onClick={() => openEditModule(m)}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    {/* Delete Module */}
                    <button
                      onClick={() => handleDeleteModule(m.id)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Module Lessons Sub-List */}
                <div style={{ padding: '16px 22px', background: 'rgba(7, 10, 15, 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Lessons in this module ({m.lessons.length})
                    </div>
                  </div>

                  {m.lessons.length === 0 ? (
                    <div
                      style={{
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px dashed var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          No lessons added yet
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Create your first lesson so students can learn and unlock the module quiz.
                        </div>
                      </div>
                      <button
                        onClick={() => openCreateLesson(m)}
                        className="btn-primary"
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #00d4ff 0%, #0284c7 100%)',
                          borderColor: '#00d4ff',
                          color: '#000',
                          fontWeight: 700,
                        }}
                      >
                        <Plus size={14} /> Add First Lesson
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {m.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: 'rgba(0, 212, 255, 0.1)',
                                border: '1px solid rgba(0, 212, 255, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'JetBrains Mono',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--accent-cyan)',
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}.{lIdx + 1}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {lesson.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    color: 'var(--accent-purple)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                  }}
                                >
                                  {lesson.type}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={11} /> {lesson.durationMinutes || 15} min
                                </span>
                                {lesson.challengeId && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    Lab: {lesson.challengeId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <Link
                              to={`/learning/lessons/${encodeURIComponent(lesson.id)}?courseId=${encodeURIComponent(course?.id || '')}`}
                              target="_blank"
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            >
                              <BookOpen size={12} /> Preview
                            </Link>
                            <button
                              onClick={() => openEditLesson(m, lesson)}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              style={{
                                padding: '5px 8px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                              title="Delete Lesson"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assessment Pipeline / Course Final Exam Card */}
        {modules.length > 0 && (
          <div
            style={{
              marginTop: '36px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(245, 158, 11, 0.06))',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#10b981', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Assessment Pipeline
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={19} color="var(--accent-cyan)" /> Module Quizzes &amp; Course Final Exam
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '6px', marginBottom: 0, maxWidth: '640px' }}>
                  Students read module lessons → take the module quiz (≥80% to unlock the next module). After clearing every module quiz, they unlock the comprehensive Course Final Exam (≥90% to earn 500 XP and skill points).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={openManageCourseFinalExam}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <GraduationCap size={16} /> Create / Edit Course Final Exam (90%)
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginTop: '18px',
              }}
            >
              {[
                { label: 'Lessons', desc: 'Read lessons in module', icon: BookOpen, color: '#00d4ff', bg: 'rgba(0, 212, 255, 0.12)' },
                { label: 'Module Quiz', desc: 'Teacher-created (≥80% pass)', icon: Award, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.12)' },
                { label: 'All Modules Cleared', desc: 'Quizzes completed', icon: FileCheck, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
                { label: 'Final Exam', desc: 'Teacher-created (≥90% → Rewards)', icon: GraduationCap, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
              ].map((step, i) => (
                <div
                  key={step.label}
                  style={{
                    background: step.bg,
                    border: `1px solid ${step.color}33`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ padding: '5px', borderRadius: '6px', background: `${step.color}22` }}>
                      <step.icon size={13} color={step.color} />
                    </div>
                    <div style={{ fontSize: '10px', color: step.color, fontWeight: 800, letterSpacing: '0.04em' }}>STEP {i + 1}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{step.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ===================== Create/Edit Module Modal ===================== */}
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
                  Give this module a clear, descriptive title.
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
                  placeholder="e.g. Linux Process Management"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Description / Objective
                </label>
                <textarea
                  rows={3}
                  placeholder="Students will learn how the Linux kernel manages processes, lifecycle states, and signals..."
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

      {/* ===================== Create/Edit Lesson Modal ===================== */}
      {showLessonModal && activeModuleForLesson && (
        <div
          onClick={() => setShowLessonModal(false)}
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
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
                  <FileText size={18} color="var(--accent-cyan)" />
                  {editingLesson ? 'Edit Lesson' : 'Add Lesson'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Adding to module: <strong style={{ color: 'var(--accent-purple)' }}>{activeModuleForLesson.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowLessonModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Understanding Linux Process Lifecycle &amp; Signals"
                  value={lessonForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setLessonForm({ ...lessonForm, title, slug: editingLesson ? lessonForm.slug : autoSlug });
                  }}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Lesson Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. process-lifecycle-signals"
                    value={lessonForm.slug}
                    onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Lesson Type
                  </label>
                  <select
                    value={lessonForm.type}
                    onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="READING">Reading &amp; Theory (Standard)</option>
                    <option value="VIDEO">Video Lecture</option>
                    <option value="LAB_PROMPT">Hands-On Lab Prompt</option>
                    <option value="QUIZ">Checkpoint Quiz</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={lessonForm.durationMinutes}
                    onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: Number(e.target.value) || 15 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Attached Lab Challenge ID (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. chal-linux-zombie"
                    value={lessonForm.challengeId}
                    onChange={(e) => setLessonForm({ ...lessonForm, challengeId: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Lesson Content (Markdown Supported) *
                </label>
                <textarea
                  rows={9}
                  required
                  placeholder="# Lesson Title&#10;&#10;Introduce the key concepts here...&#10;&#10;```bash&#10;# Shell command&#10;ps aux&#10;```"
                  value={lessonForm.contentMarkdown}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentMarkdown: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowLessonModal(false)} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0284c7 100%)',
                    borderColor: '#00d4ff',
                    color: '#000',
                    fontWeight: 700,
                  }}
                >
                  {actionLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  {actionLoading ? 'Saving…' : editingLesson ? 'Save Lesson Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== Manual Quiz Studio Modal ===================== */}
      {showQuizModal && quizTarget && (
        <div
          onClick={() => setShowQuizModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 210,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '30px',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  {quizTarget.type === 'MODULE' ? 'Module Assessment Studio' : 'Course Capstone Exam Studio'}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <HelpCircle size={20} color="var(--accent-purple)" />
                  {quizTarget.type === 'MODULE' ? `Quiz: ${quizTarget.title}` : `Final Exam: ${quizTarget.title}`}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                  Create the multiple-choice questions manually. For each question, select which option is the correct answer.
                </p>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {quizLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
                <div>Loading quiz assessment...</div>
              </div>
            ) : (
              <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Quiz Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: quizTarget.type === 'COURSE' ? '2fr 1fr 1fr' : '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Quiz / Assessment Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Passing Score (% required)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) || 80 })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  {quizTarget.type === 'COURSE' && (
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                        XP Reward on Pass
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={5000}
                        value={quizForm.xpOnPass || 500}
                        onChange={(e) => setQuizForm({ ...quizForm, xpOnPass: Number(e.target.value) || 500 })}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>

                {/* Questions Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Questions ({quizForm.questions.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--accent-cyan)',
                      borderColor: 'rgba(0, 212, 255, 0.4)',
                    }}
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                {/* Questions Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {quizForm.questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      style={{
                        padding: '18px',
                        borderRadius: '10px',
                        background: 'rgba(7, 10, 15, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      {/* Question Top Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                          Question #{qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 6px',
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>

                      {/* Question Text */}
                      <div>
                        <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                          Question Prompt *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Which Linux command is used to display currently running processes?"
                          value={q.question}
                          onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Options */}
                      <div>
                        <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                          Answer Options (select the radio button on the correct answer) *
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctIndex === oIdx;
                            return (
                              <div
                                key={oIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${isCorrect ? '#10b981' : 'var(--border-subtle)'}`,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSetCorrectIndex(qIdx, oIdx)}
                                  title="Mark as correct answer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: isCorrect ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                                    color: isCorrect ? '#000' : 'var(--text-muted)',
                                    border: `1px solid ${isCorrect ? '#10b981' : 'var(--border-subtle)'}`,
                                    flexShrink: 0,
                                  }}
                                >
                                  {isCorrect ? <Check size={12} /> : <Radio size={12} />}
                                  {isCorrect ? 'Correct Answer' : 'Mark Correct'}
                                </button>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: isCorrect ? '#10b981' : 'var(--text-muted)', width: '20px' }}>
                                  {['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}.
                                </span>
                                <input
                                  type="text"
                                  required
                                  placeholder={`Option ${['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}`}
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                  className="input-field"
                                  style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '4px 6px',
                                    color: isCorrect ? '#10b981' : 'var(--text-primary)',
                                    fontWeight: isCorrect ? 600 : 400,
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                          Explanation / Feedback (revealed to student upon quiz completion)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 'ps' (Process Status) reads from /proc to list active tasks."
                          value={q.explanation}
                          onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Question Button Bottom */}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderStyle: 'dashed',
                  }}
                >
                  <Plus size={14} /> Add Another Question
                </button>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button type="button" onClick={() => setShowQuizModal(false)} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quizSaving}
                    className="btn-primary"
                    style={{
                      padding: '9px 22px',
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                      borderColor: '#8b5cf6',
                      fontWeight: 700,
                    }}
                  >
                    {quizSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={15} />}
                    {quizSaving ? 'Saving Assessment…' : 'Save Quiz Assessment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
