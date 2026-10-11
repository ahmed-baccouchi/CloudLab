import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Terminal,
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Clock,
  Award,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Lock,
  Layers,
  Trophy,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { learningApi } from '../../api/client';
import { secureLogout, getAccessToken } from '../../utils/auth';

interface QuizOption {
  label: string;
  key: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctKey: string;
}

const CUMULATIVE_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which of the following best describes the primary purpose of this course?',
    options: [
      { key: 'a', label: 'Theoretical deep dive into the history of computing systems' },
      { key: 'b', label: 'Practical, scenario-driven mastery of production-grade engineering skills' },
      { key: 'c', label: 'Certification preparation only' },
      { key: 'd', label: 'Academic theory and exam drills' },
    ],
    correctKey: 'b',
  },
  {
    id: 'q2',
    prompt: 'A student has completed all modules but failed one module quiz. What should they do next?',
    options: [
      { key: 'a', label: 'Restart the entire course from module 1' },
      { key: 'b', label: 'Review the lesson content for that module and retake the module quiz' },
      { key: 'c', label: 'Skip the module quiz and proceed straight to the final quiz' },
      { key: 'd', label: 'Contact support to override the module quiz result' },
    ],
    correctKey: 'b',
  },
  {
    id: 'q3',
    prompt: 'Select the correct ordering of course content as presented in this course:',
    options: [
      { key: 'a', label: 'Lessons → Modules → Course-wide PDFs → Final quiz' },
      { key: 'b', label: 'Course-wide PDFs → Modules (Lessons + Module Quizzes) → Final cumulative quiz' },
      { key: 'c', label: 'Final quiz → PDFs → Modules' },
      { key: 'd', label: 'Modules → PDFs → Course progress' },
    ],
    correctKey: 'b',
  },
  {
    id: 'q4',
    prompt: 'PDF resources attached to this course are best used:',
    options: [
      { key: 'a', label: 'Only after finishing the entire course' },
      { key: 'b', label: 'As reference material alongside lessons and when revisiting modules' },
      { key: 'c', label: 'As a substitute for watching the lectures' },
      { key: 'd', label: 'Only during the final cumulative quiz' },
    ],
    correctKey: 'b',
  },
  {
    id: 'q5',
    prompt: 'Which scenario is the strongest indicator of course mastery?',
    options: [
      { key: 'a', label: 'Opened every module accordion once' },
      { key: 'b', label: 'Downloaded every PDF from the resources section' },
      { key: 'c', label: 'Passed every module quiz and the final cumulative quiz with strong scores' },
      { key: 'd', label: 'Scrolled to the bottom of the course page' },
    ],
    correctKey: 'c',
  },
];

export const StudentCourseViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleQuizTaken, setModuleQuizTaken] = useState<Record<string, boolean>>({});

  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [finalQuizAnswers, setFinalQuizAnswers] = useState<Record<string, string>>({});
  const [finalQuizSubmitted, setFinalQuizSubmitted] = useState(false);
  const [finalQuizScore, setFinalQuizScore] = useState<{ correct: number; total: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      navigate('/login');
      return;
    }
    loadCourse();

    // Reload when page regains focus (user returns from lesson page)
    const handleFocus = () => {
      loadCourse();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [slug, navigate]);

  const loadCourse = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const [tracksRes, coursesRes] = await Promise.all([
        learningApi.getTracks().catch(() => ({ data: { data: [] } })),
        learningApi.getAllCourses().catch(() => ({ data: { data: [] } })),
      ]);

      const tracks: any[] = tracksRes.data?.data || tracksRes.data || [];
      const courses: any[] = coursesRes.data?.data || coursesRes.data || [];

      let foundCourse: any = courses.find(
        (c) => c.id === slug || c.slug === slug || String(c.id) === slug,
      );

      let parentTrack: any = null;
      if (!foundCourse) {
        const trackFallback = tracks.find((t) => t.slug === slug) || tracks[0];
        if (trackFallback) {
          try {
            const tRes = await learningApi.getTrackBySlug(trackFallback.slug);
            const trackDetail = tRes.data?.data || tRes.data || null;
            if (trackDetail?.courses && trackDetail.courses.length > 0) {
              foundCourse = trackDetail.courses[0];
              parentTrack = trackDetail;
            }
          } catch {
            /* noop */
          }
        }
      } else if (foundCourse?.trackId) {
        parentTrack = tracks.find((t) => t.id === foundCourse.trackId) || null;
        if (parentTrack) {
          try {
            const tRes = await learningApi.getTrackBySlug(parentTrack.slug);
            const trackDetail = tRes.data?.data || tRes.data || null;
            if (trackDetail) {
              const match = trackDetail.courses?.find((c: any) => c.id === foundCourse.id);
              if (match) {
                foundCourse = match;
                parentTrack = trackDetail;
              }
            }
          } catch {
            /* noop */
          }
        }
      }

      if (!foundCourse) {
        const fallbackTrack = tracks[0];
        if (fallbackTrack) {
          try {
            const tRes = await learningApi.getTrackBySlug(fallbackTrack.slug);
            const td = tRes.data?.data || tRes.data || null;
            if (td?.courses?.[0]) {
              foundCourse = td.courses[0];
              parentTrack = td;
            }
          } catch {
            /* noop */
          }
        }
      }

      if (foundCourse) {
        setCourse(foundCourse);
        if (parentTrack) setTrack(parentTrack);
        const mods: any[] = foundCourse.modules || [];
        mods.sort((a, b) => (typeof a.orderIndex === 'number' ? a.orderIndex : 0) - (typeof b.orderIndex === 'number' ? b.orderIndex : 0));
        setModules(mods);
        const resources: any[] = foundCourse.resources || foundCourse.resourceAttachments || foundCourse.pdfs || [];
        setPdfs(resources.length > 0 ? resources : generateMockPdfs(foundCourse));

        // Fetch enrollment data to get completed lessons
        try {
          const enrollmentRes = await learningApi.getEnrollment(foundCourse.id);
          const enrollmentData = enrollmentRes.data?.data || enrollmentRes.data;
          console.log('📚 [StudentCourseViewPage] Enrollment data received:', enrollmentData);
          setEnrollment(enrollmentData);
          
          // Extract completed lesson IDs
          if (enrollmentData?.completedLessonIds) {
            console.log('✅ [StudentCourseViewPage] Setting completed lessons:', enrollmentData.completedLessonIds);
            setCompletedLessonIds(new Set(enrollmentData.completedLessonIds));
          } else {
            console.warn('⚠️ [StudentCourseViewPage] No completedLessonIds in enrollment data');
          }
        } catch (err) {
          console.warn('Could not fetch enrollment data:', err);
          // Auto-enroll if not enrolled
          try {
            await learningApi.enrollCourse(foundCourse.id);
            const enrollmentRes = await learningApi.getEnrollment(foundCourse.id);
            const enrollmentData = enrollmentRes.data?.data || enrollmentRes.data;
            console.log('📚 [StudentCourseViewPage] Enrollment data after auto-enroll:', enrollmentData);
            setEnrollment(enrollmentData);
            if (enrollmentData?.completedLessonIds) {
              console.log('✅ [StudentCourseViewPage] Setting completed lessons after enroll:', enrollmentData.completedLessonIds);
              setCompletedLessonIds(new Set(enrollmentData.completedLessonIds));
            }
          } catch (enrollErr) {
            console.error('Failed to enroll:', enrollErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load course', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPdfs = (c: any): any[] => {
    const titleSlug = (c.title || 'Course').replace(/\s+/g, '-').toLowerCase();
    return [
      {
        id: 'pdf-1',
        fileName: `${titleSlug}-syllabus.pdf`,
        displayName: 'Course Syllabus & Learning Objectives',
        mimeType: 'application/pdf',
        url: '#',
        fileSize: '240 KB',
      },
      {
        id: 'pdf-2',
        fileName: `${titleSlug}-cheat-sheet.pdf`,
        displayName: 'Quick Reference Cheat Sheet',
        mimeType: 'application/pdf',
        url: '#',
        fileSize: '512 KB',
      },
      {
        id: 'pdf-3',
        fileName: `${titleSlug}-workbook.pdf`,
        displayName: 'Hands-On Exercises Workbook',
        mimeType: 'application/pdf',
        url: '#',
        fileSize: '1.8 MB',
      },
      {
        id: 'pdf-4',
        fileName: `${titleSlug}-glossary.pdf`,
        displayName: 'Terminology Glossary',
        mimeType: 'application/pdf',
        url: '#',
        fileSize: '180 KB',
      },
    ];
  };

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleOpenResource = (pdf: any) => {
    if (pdf.url && pdf.url !== '#') {
      window.open(pdf.url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`Opening PDF: ${pdf.displayName || pdf.fileName}`);
    }
  };

  const handleModuleQuiz = async (module: any) => {
    // Navigate to module quiz page
    navigate(`/learning/modules/${encodeURIComponent(module.id)}/quiz?courseId=${encodeURIComponent(course?.id || '')}`);
  };

  const allModulesExpanded = useMemo(() => {
    if (modules.length === 0) return false;
    return modules.every((m) => expandedModules[m.id]);
  }, [modules, expandedModules]);

  const allModuleQuizzesAttempted = useMemo(() => {
    if (modules.length === 0) return false;
    return modules.every((m) => moduleQuizTaken[m.id] || (m.lessons && m.lessons.length === 0));
  }, [modules, moduleQuizTaken]);

  const finalQuizUnlocked = allModulesExpanded;

  const handleFinalQuizSelect = (qid: string, optKey: string) => {
    if (finalQuizSubmitted) return;
    setFinalQuizAnswers((prev) => ({ ...prev, [qid]: optKey }));
  };

  const submitFinalQuiz = () => {
    const answered = CUMULATIVE_QUIZ.filter((q) => finalQuizAnswers[q.id]).length;
    if (answered < CUMULATIVE_QUIZ.length) {
      alert(`Please answer all ${CUMULATIVE_QUIZ.length} questions before submitting.`);
      return;
    }
    let correct = 0;
    CUMULATIVE_QUIZ.forEach((q) => {
      if (finalQuizAnswers[q.id] === q.correctKey) correct += 1;
    });
    const pct = correct / CUMULATIVE_QUIZ.length;
    const passed = pct >= 0.6;
    setFinalQuizScore({ correct, total: CUMULATIVE_QUIZ.length, passed });
    setFinalQuizSubmitted(true);
  };

  const resetFinalQuiz = () => {
    setFinalQuizAnswers({});
    setFinalQuizScore(null);
    setFinalQuizSubmitted(false);
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
        <Loader2 size={18} style={{ marginRight: '10px', animation: 'spin 1s linear infinite' }} /> Loading course…
      </div>
    );
  }

  return (
    <div className="student-course-page">
      {/* Fixed Sticky Header */}
      <header className="student-course-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Link
            to="/learning"
            className="btn-secondary"
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen size={17} color="#040812" strokeWidth={2.3} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {course?.title || 'Course Overview'}
              </h1>
              {track && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Part of{' '}
                  <span
                    style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}
                  >
                    {track.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {course?.difficultyLevel && (
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.12)',
                color: 'var(--accent-purple)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              {course.difficultyLevel}
            </div>
          )}
          <Link
            to="/learning"
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <Layers size={14} /> Catalog
          </Link>
          <Link
            to="/dashboard"
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px' }}
          >
            Home
          </Link>
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Log out"
            style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Course Hero / Intro */}
        <div
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(13, 18, 29, 0.98), rgba(7, 10, 15, 0.96))',
            border: '1px solid var(--border-subtle)',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              letterSpacing: '0.06em',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--accent-cyan)',
              marginBottom: '10px',
            }}
          >
            <Sparkles size={12} /> Now Enrolled
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.01em' }}>
            {course?.title || 'Welcome to the Course'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
            {course?.summary ||
              'Work through the modules sequentially. Expand each module below to access the lessons, then take the module quiz before moving on. After completing all modules you will unlock the cumulative final quiz.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Layers size={14} color="var(--accent-cyan)" /> <strong style={{ color: 'var(--text-primary)' }}>{modules.length}</strong> Modules
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <BookOpen size={14} color="var(--accent-purple)" />{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {modules.reduce((acc, m) => acc + ((m.lessons && m.lessons.length) || 0), 0)}
              </strong>{' '}
              Lessons
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Clock size={14} color="#f59e0b" /> Est. <strong style={{ color: 'var(--text-primary)' }}>{Math.max(4, modules.length * 2)}h</strong> total
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <FileText size={14} color="#ef4444" /> <strong style={{ color: 'var(--text-primary)' }}>{pdfs.length}</strong> PDFs
            </div>
          </div>
        </div>

        {/* ===================== PDFs / Resources Section ===================== */}
        <section className="course-pdfs-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
            <FileText size={18} color="#ef4444" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Course Resources & PDFs</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
            Downloadable handouts, reference materials, and exercise workbooks — available immediately to enrolled students.
          </p>

          <div className="pdf-resource-grid">
            {pdfs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
                No PDF resources are attached to this course yet.
              </div>
            ) : (
              pdfs.map((pdf) => (
                <a
                  key={pdf.id || pdf.fileName}
                  href={(pdf.url || pdf.fileUrl) && (pdf.url || pdf.fileUrl) !== '#' ? (pdf.url || pdf.fileUrl) : undefined}
                  target={(pdf.url || pdf.fileUrl) && (pdf.url || pdf.fileUrl) !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!(pdf.url || pdf.fileUrl) || (pdf.url || pdf.fileUrl) === '#') {
                      e.preventDefault();
                      handleOpenResource(pdf);
                    }
                  }}
                  className="pdf-resource-card"
                >
                  <div className="pdf-resource-icon">
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        marginBottom: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pdf.displayName || pdf.fileName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {pdf.mimeType || 'application/pdf'} · {pdf.fileSize || '—'}
                    </div>
                  </div>
                  <ExternalLink size={15} color="var(--text-muted)" />
                </a>
              ))
            )}
          </div>
        </section>

        {/* ===================== Modules Section ===================== */}
        <section style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Course Modules</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Expand each module to view the lessons inside, then finish with the module quiz.
          </p>

          {modules.length === 0 ? (
            <div
              style={{
                marginTop: '16px',
                padding: '44px 28px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <AlertCircle size={22} color="#f59e0b" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>No modules published yet</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                The instructor is still configuring this course. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="course-modules-list">
              {modules.map((m, index) => {
                const isExpanded = !!expandedModules[m.id];
                const quizAttempted = !!moduleQuizTaken[m.id];
                return (
                  <div
                    key={m.id}
                    className={`course-module-accordion${isExpanded ? ' expanded' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      className="course-module-header"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} color="var(--accent-cyan)" />
                      ) : (
                        <ChevronRight size={18} color="var(--text-muted)" />
                      )}
                      <div className="course-module-number">{String(index + 1).padStart(2, '0')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>
                          {m.title || `Module ${index + 1}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {((m.lessons && m.lessons.length) || 0)} lesson
                          {((m.lessons && m.lessons.length) || 0) === 1 ? '' : 's'}
                          {m.description ? ` · ${m.description.slice(0, 70)}${m.description.length > 70 ? '…' : ''}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {quizAttempted && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <CheckCircle2 size={11} /> Quiz attempted
                          </span>
                        )}
                      </div>
                    </button>

                    <div className={`course-module-content${isExpanded ? ' expanded' : ''}`}>
                      <div className="course-module-inner">
                        {m.description && (
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0 16px', lineHeight: 1.6 }}>
                            {m.description}
                          </p>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span>Lessons ({(m.lessons && m.lessons.length) || 0})</span>
                        </div>

                        {(m.lessons && m.lessons.length > 0) ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              marginBottom: '4px',
                            }}
                          >
                            {m.lessons.map((lesson: any, lessonIdx: number) => {
                              const isCompleted = completedLessonIds.has(lesson.id);
                              return (
                              <div
                                key={lesson.id || lessonIdx}
                                className="module-lesson-item"
                                onClick={() => navigate(`/learning/lessons/${encodeURIComponent(lesson.id)}?courseId=${encodeURIComponent(course?.id || '')}`)}
                              >
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isCompleted ? '#10b981' : 'var(--border-subtle)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontFamily: 'JetBrains Mono',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: isCompleted ? '#10b981' : 'var(--accent-cyan)',
                                  }}
                                >
                                  {isCompleted ? <CheckCircle size={14} /> : String(lessonIdx + 1).padStart(2, '0')}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {lesson.title || `Lesson ${lessonIdx + 1}`}
                                    {isCompleted && (
                                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                                        ✓ Done
                                      </span>
                                    )}
                                  </div>
                                  {lesson.summary && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {lesson.summary}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight size={14} color="var(--text-muted)" />
                              </div>
                            );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '12px 14px',
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.015)',
                              border: '1px dashed var(--border-subtle)',
                              marginBottom: '4px',
                              fontStyle: 'italic',
                            }}
                          >
                            The instructor hasn&apos;t added any lessons to this module yet.
                          </div>
                        )}

                        {/* Module-Specific Quiz Link */}
                        <div className="module-quiz-link" onClick={() => handleModuleQuiz(m)} role="link" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleModuleQuiz(m); }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-purple)',
                              }}
                            >
                              <Award size={17} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Take Module Quiz
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Check your understanding of{' '}
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  {m.title || `Module ${index + 1}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-purple)', fontWeight: 700, fontSize: '13px' }}>
                            Begin <ChevronRight size={15} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================== Final Cumulative "Big Quiz" Section ===================== */}
        <section
          className={`final-quiz-section${finalQuizUnlocked ? '' : ' locked'}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            {finalQuizUnlocked ? (
              <Trophy size={20} color="#10b981" />
            ) : (
              <Lock size={20} color="#f59e0b" />
            )}
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Final Cumulative Quiz</h3>
            {finalQuizSubmitted && finalQuizScore?.passed && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Passed ✓
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0, lineHeight: 1.6 }}>
            {finalQuizUnlocked
              ? `Answer ${CUMULATIVE_QUIZ.length} comprehensive questions drawn from all ${modules.length} modules. A score of 60% or higher is required to pass.`
              : `To unlock the final quiz, first open and review all ${modules.length} modules above sequentially. Currently ${Object.keys(expandedModules).length}/${modules.length} modules have been loaded.`}
          </p>

          {!finalQuizUnlocked && (
            <div
              style={{
                marginTop: '18px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#f59e0b', fontWeight: 700 }}>Locked.</strong> Expand every module in order above to reveal the cumulative final quiz.
              </div>
            </div>
          )}

          {finalQuizUnlocked && (
            <>
              {!showFinalQuiz ? (
                <button
                  type="button"
                  className="final-quiz-cta"
                  onClick={() => setShowFinalQuiz(true)}
                >
                  <Trophy size={18} />
                  {finalQuizSubmitted ? 'Review Final Quiz' : 'Start Final Cumulative Quiz'}
                </button>
              ) : (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '24px 26px',
                    background: 'rgba(0, 0, 0, 0.22)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                        Cumulative Assessment
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        {finalQuizSubmitted
                          ? `Results: ${finalQuizScore?.correct}/${finalQuizScore?.total} correct (${Math.round(((finalQuizScore?.correct || 0) / (finalQuizScore?.total || 1)) * 100)}%) — ${finalQuizScore?.passed ? 'PASSED' : 'Did not pass'}`
                          : `${CUMULATIVE_QUIZ.length} questions · Passing score ≥ 60%`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {finalQuizSubmitted && (
                        <button
                          onClick={resetFinalQuiz}
                          className="btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <X size={13} /> Reset
                        </button>
                      )}
                      <button
                        onClick={() => setShowFinalQuiz(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                        aria-label="Minimize quiz"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {CUMULATIVE_QUIZ.map((q, qIdx) => {
                      const userAns = finalQuizAnswers[q.id];
                      const correct = finalQuizSubmitted && userAns === q.correctKey;
                      const wrong = finalQuizSubmitted && userAns && userAns !== q.correctKey;
                      return (
                        <div
                          key={q.id}
                          style={{
                            padding: '16px 18px',
                            borderRadius: '10px',
                            background: correct
                              ? 'rgba(16, 185, 129, 0.08)'
                              : wrong
                                ? 'rgba(239, 68, 68, 0.08)'
                                : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${
                              correct
                                ? 'rgba(16, 185, 129, 0.3)'
                                : wrong
                                  ? 'rgba(239, 68, 68, 0.3)'
                                  : 'var(--border-subtle)'
                            }`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'rgba(0, 212, 255, 0.12)',
                                color: 'var(--accent-cyan)',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'JetBrains Mono',
                                flexShrink: 0,
                              }}
                            >
                              {qIdx + 1}
                            </span>
                            <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.6, marginTop: '2px' }}>
                              {q.prompt}
                            </div>
                            {finalQuizSubmitted && (
                              correct ? (
                                <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '3px' }} />
                              ) : wrong ? (
                                <XCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '3px' }} />
                              ) : null
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '34px' }}>
                            {q.options.map((opt) => {
                              const selected = userAns === opt.key;
                              const isCorrect = opt.key === q.correctKey;
                              const showCorrect = finalQuizSubmitted && isCorrect;
                              const showWrong = finalQuizSubmitted && selected && !isCorrect;
                              return (
                                <label
                                  key={opt.key}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    cursor: finalQuizSubmitted ? 'default' : 'pointer',
                                    background: selected
                                      ? 'rgba(139, 92, 246, 0.12)'
                                      : showCorrect
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : showWrong
                                          ? 'rgba(239, 68, 68, 0.1)'
                                          : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${
                                      selected
                                        ? 'rgba(139, 92, 246, 0.35)'
                                        : showCorrect
                                          ? 'rgba(16, 185, 129, 0.35)'
                                          : showWrong
                                            ? 'rgba(239, 68, 68, 0.35)'
                                            : 'var(--border-subtle)'
                                    }`,
                                    transition: 'background 0.15s, border-color 0.15s',
                                  }}
                                >
                                  <input
                                    type="radio"
                                    disabled={finalQuizSubmitted}
                                    checked={selected}
                                    onChange={() => handleFinalQuizSelect(q.id, opt.key)}
                                    style={{ accentColor: '#8b5cf6', cursor: finalQuizSubmitted ? 'not-allowed' : 'pointer' }}
                                  />
                                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px' }}>
                                      {String(opt.key).toUpperCase()}.
                                    </span>
                                    {opt.label}
                                  </span>
                                  {finalQuizSubmitted && isCorrect && (
                                    <CheckCircle size={14} color="#10b981" />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!finalQuizSubmitted ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setFinalQuizAnswers({})}
                        className="btn-secondary"
                        style={{ padding: '9px 18px', fontSize: '13px' }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={submitFinalQuiz}
                        className="btn-primary"
                        style={{
                          padding: '9px 20px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          borderColor: '#059669',
                        }}
                      >
                        <CheckCircle size={14} /> Submit Final Quiz
                      </button>
                    </div>
                  ) : finalQuizScore ? (
                    <div
                      style={{
                        marginTop: '22px',
                        padding: '20px 22px',
                        borderRadius: '12px',
                        background: finalQuizScore.passed
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(0, 212, 255, 0.08))'
                          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.06))',
                        border: `1px solid ${finalQuizScore.passed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '18px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            background: finalQuizScore.passed
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(245, 158, 11, 0.18)',
                            border: `1px solid ${finalQuizScore.passed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {finalQuizScore.passed ? (
                            <Trophy size={24} color="#10b981" />
                          ) : (
                            <AlertCircle size={24} color="#f59e0b" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '2px' }}>
                            {finalQuizScore.passed ? 'Excellent work — you passed!' : 'Almost there — try again'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Score: <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{finalQuizScore.correct}/{finalQuizScore.total}</strong> correct · {Math.round((finalQuizScore.correct / finalQuizScore.total) * 100)}%
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {!finalQuizScore.passed && (
                          <button onClick={resetFinalQuiz} className="btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>
                            Retake Quiz
                          </button>
                        )}
                        <Link
                          to="/dashboard"
                          className="btn-primary"
                          style={{
                            padding: '9px 18px',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            textDecoration: 'none',
                            background: finalQuizScore.passed
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                            borderColor: finalQuizScore.passed ? '#059669' : '#8b5cf6',
                          }}
                        >
                          <ChevronRight size={14} /> Return to Dashboard
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};
