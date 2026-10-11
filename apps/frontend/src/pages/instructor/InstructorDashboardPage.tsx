import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Users,
  BarChart2,
  FileText,
  Upload,
  X,
  Flame,
  AlignLeft,
  Terminal,
  AlertCircle,
  Zap,
  FilePenLine,
  Sparkles,
  Save,
  Loader2,
  LogOut,
  GraduationCap,
  FileCheck,
  BookMarked,
} from 'lucide-react';
import { learningApi, challengeApi } from '../../api/client';
import { secureLogout, getUserFromStorage, requireInstructor } from '../../utils/auth';
import type { CourseDto, TrackDto, CourseAnalyticsDto, ResourceAttachmentDto } from '@cloudlab/shared-types';

export const InstructorDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [tracks, setTracks] = useState<TrackDto[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDto | null>(null);
  const [courseForm, setCourseForm] = useState<{
    trackId: string;
    title: string;
    slug: string;
    summary: string;
    difficultyLevel: string;
    estimatedHours: number;
    isPublished: boolean;
    attachedChallengeIds: string[];
    resources: ResourceAttachmentDto[];
  }>({
    trackId: '',
    title: '',
    slug: '',
    summary: '',
    difficultyLevel: 'BEGINNER',
    estimatedHours: 4,
    isPublished: true,
    attachedChallengeIds: [],
    resources: [],
  });

  // Resource upload helper
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceFile, setNewResourceFile] = useState<File | null>(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const resourceFileInputRef = React.useRef<HTMLInputElement>(null);

  // Analytics Modal
  const [selectedAnalytics, setSelectedAnalytics] = useState<CourseAnalyticsDto | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [generatingModuleQuiz, setGeneratingModuleQuiz] = useState<string | null>(null);
  const [generatingCourseQuiz, setGeneratingCourseQuiz] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (!storedUser || !requireInstructor()) {
      if (storedUser?.role === 'STUDENT') {
        navigate('/learning');
      } else {
        navigate('/login');
      }
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesRes, tracksRes, challengesRes] = await Promise.all([
        learningApi.getCourses(),
        learningApi.getTracks(),
        challengeApi.getChallenges().catch(() => ({ data: { data: [] } })),
      ]);

      setCourses(coursesRes.data?.data || coursesRes.data || []);
      setTracks(tracksRes.data?.data || tracksRes.data || []);
      setChallenges(challengesRes.data?.data || challengesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load instructor dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      trackId: tracks[0]?.id || '',
      title: '',
      slug: '',
      summary: '',
      difficultyLevel: 'BEGINNER',
      estimatedHours: 4,
      isPublished: true,
      attachedChallengeIds: [],
      resources: [],
    });
    setNewResourceTitle('');
    setNewResourceFile(null);
    setShowCourseModal(true);
  };

  const handleOpenEditCourse = (c: CourseDto) => {
    setEditingCourse(c);
    setCourseForm({
      trackId: c.trackId,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      difficultyLevel: c.difficultyLevel,
      estimatedHours: c.estimatedHours,
      isPublished: c.isPublished,
      attachedChallengeIds: c.attachedChallengeIds || [],
      resources: c.resources || [],
    });
    setNewResourceTitle('');
    setNewResourceFile(null);
    setShowCourseModal(true);
  };

  const handleAddResource = async () => {
    if (!newResourceFile) return;
    try {
      setUploadingResource(true);
      const res = await learningApi.uploadResource(newResourceFile);
      const uploaded: ResourceAttachmentDto = res.data?.data || res.data;
      if (uploaded) {
        const finalTitle = newResourceTitle.trim() || uploaded.title || newResourceFile.name;
        setCourseForm((prev) => ({
          ...prev,
          resources: [...prev.resources, { ...uploaded, title: finalTitle }],
        }));
      }
      setNewResourceTitle('');
      setNewResourceFile(null);
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = '';
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to upload resource file');
    } finally {
      setUploadingResource(false);
    }
  };

  const handleRemoveResource = (resId: string) => {
    setCourseForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== resId),
    }));
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (editingCourse) {
        await learningApi.updateCourse(editingCourse.id, courseForm);
        setShowCourseModal(false);
        await loadDashboardData();
      } else {
        const createRes = await learningApi.createCourse(courseForm);
        const newCourse = createRes?.data?.data || createRes?.data || null;
        const newCourseId =
          newCourse?.id ||
          (Array.isArray(createRes?.data?.data) ? createRes.data.data[createRes.data.data.length - 1]?.id : null) ||
          (Array.isArray(createRes?.data) ? createRes.data[createRes.data.length - 1]?.id : null);

        setShowCourseModal(false);
        try { await loadDashboardData(); } catch { /* silent */ }

        if (newCourseId) {
          navigate(`/instructor/courses/${encodeURIComponent(newCourseId)}/modules`);
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      await learningApi.setCoursePublishStatus(courseId, !currentStatus);
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle publish status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course and all its modules/lessons?')) return;
    try {
      setActionLoading(true);
      await learningApi.deleteCourse(courseId);
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAnalytics = async (courseId: string) => {
    try {
      setAnalyticsLoading(true);
      setShowAnalyticsModal(true);
      const res = await learningApi.getCourseAnalytics(courseId);
      setSelectedAnalytics(res.data?.data || res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to fetch course analytics');
      setShowAnalyticsModal(false);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleGenerateModuleQuiz = async (moduleId: string, moduleTitle: string) => {
    if (!window.confirm(`✨ Generate AI quiz for module: "${moduleTitle}"?\n\nStudents must score ≥80% to proceed past this module.`)) return;
    try {
      setGeneratingModuleQuiz(moduleId);
      const res = await learningApi.generateModuleQuiz(moduleId);
      const quiz = res.data?.data || res.data || {};
      const qs = quiz.questions || quiz.questionsCount || 0;
      alert(
        `✅ Module quiz ready:\n  • "${moduleTitle}"\n  • ${Array.isArray(qs) ? qs.length : qs} questions\n  • Pass: ${quiz.passingScore || quiz.passScore || 80}%\n\nStudents see it after finishing all lessons in the module.`,
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate module quiz');
    } finally {
      setGeneratingModuleQuiz(null);
    }
  };

  const handleGenerateCourseFinalExam = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`🎓 Generate AI Course Final Exam for: "${courseTitle}"?\n\nStudents unlock it after passing ALL module quizzes. Pass ≥90% → 500 XP + skill points.`)) return;
    try {
      setGeneratingCourseQuiz(courseId);
      const res = await learningApi.generateCourseQuiz(courseId);
      const quiz = res.data?.data || res.data || {};
      const qs = quiz.questions || quiz.questionsCount || 0;
      alert(
        `✅ Final exam ready:\n  • "${courseTitle}"\n  • ${Array.isArray(qs) ? qs.length : qs} questions\n  • Pass: ${quiz.passingScore || quiz.passScore || 90}%\n  • Rewards on pass: ${quiz.xpReward || 500} XP, ${quiz.skillPoints || 15} skill pts`,
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate course final exam');
    } finally {
      setGeneratingCourseQuiz(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
          Loading instructor command center...
        </div>
      </div>
    );
  }

  // Dashboard Stats Calculations
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.isPublished).length;
  const draftCourses = totalCourses - publishedCourses;
  const totalStudentsEnrolled = courses.reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(13, 18, 29, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>Instructor Course Studio</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Curriculum Authoring & Student Learning Telemetry
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/learning"
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={14} /> Student View (Published)
          </Link>
          <button
            onClick={handleOpenCreateCourse}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', width: 'auto' }}
          >
            <Plus size={15} /> Create Course
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-logout"
            title="Log out of instructor account"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px' }}>
        {/* KPI Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Total Curriculum</span>
              <BookOpen size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800 }}>{totalCourses} Courses</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Across {tracks.length} core engineering tracks
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Live Published</span>
              <CheckCircle size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{publishedCourses} Live</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Visible and enrollable by students
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Draft Working</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{draftCourses} Drafts</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Private staging mode (Hidden from students)
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Total Enrolled</span>
              <Users size={16} color="var(--accent-purple)" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-purple)' }}>{totalStudentsEnrolled} Students</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Active learners in your modules
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Curriculum & Course Studio</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Configure syllabus structure, upload PDFs, attach DevOps challenges, generate module quizzes &amp; final exams, toggle publishing.
            </p>
          </div>
          <button onClick={handleOpenCreateCourse} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Plus size={15} /> Add New Course
          </button>
        </div>

        {/* Course List Table */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Course Title & Track</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Curriculum</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Resources & Labs</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Students</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No courses created yet. Click "Add New Course" to begin authoring.
                  </td>
                </tr>
              ) : (
                courses.map((course) => {
                  const track = tracks.find((t) => t.id === course.trackId);
                  const isPublished = course.isPublished;

                  return (
                    <tr
                      key={course.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Title & Track */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {course.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{track?.title || 'General DevOps'}</span>
                          <span>&bull;</span>
                          <span style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--accent-cyan)' }}>
                            {course.difficultyLevel}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => handleTogglePublish(course.id, isPublished)}
                          disabled={actionLoading}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '14px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            background: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPublished ? '#10b981' : '#f59e0b',
                            border: `1px solid ${isPublished ? '#10b981' : '#f59e0b'}`,
                          }}
                          title="Click to toggle publish status"
                        >
                          {isPublished ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {isPublished ? 'Published (Live)' : 'Draft (Hidden)'}
                        </button>
                      </td>

                      {/* Curriculum Breakdown */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', minWidth: '340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            <BookMarked size={12} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: '-2px', color: 'var(--accent-cyan)' }} />
                            {course.modules?.length || 0} Modules · {course.totalLessons || 0} Lessons
                          </div>
                        </div>
                        {(course.modules?.length ?? 0) > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                            {course.modules!.slice(0, 3).map((m: any, idx: number) => (
                              <div key={m.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{String(idx + 1).padStart(2, '0')}.</span> {m.title}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleGenerateModuleQuiz(m.id, m.title || `Module ${idx + 1}`); }}
                                  disabled={generatingModuleQuiz === m.id}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    borderRadius: '5px',
                                    border: '1px solid rgba(139,92,246,0.35)',
                                    background: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(0,212,255,0.08))',
                                    color: 'var(--accent-purple)',
                                    cursor: generatingModuleQuiz === m.id ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Generate AI module quiz (80% pass)"
                                >
                                  {generatingModuleQuiz === m.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
                                  Quiz (80%)
                                </button>
                              </div>
                            ))}
                            {(course.modules!.length > 3) && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>+{course.modules!.length - 3} more modules…</div>
                            )}
                          </div>
                        )}
                        {(course.modules?.length ?? 0) > 0 && (
                          <div style={{ marginTop: '10px', paddingTop: '9px', borderTop: '1px dashed rgba(16,185,129,0.25)' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateCourseFinalExam(course.id, course.title); }}
                              disabled={generatingCourseQuiz === course.id}
                              style={{
                                width: '100%',
                                padding: '6px 9px',
                                fontSize: '11px',
                                fontWeight: 800,
                                borderRadius: '6px',
                                border: '1px solid rgba(16,185,129,0.35)',
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(245,158,11,0.08))',
                                color: '#10b981',
                                cursor: generatingCourseQuiz === course.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                              title="Generate AI Course Final Exam (90% pass → 500 XP + skill points)"
                            >
                              {generatingCourseQuiz === course.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <GraduationCap size={12} />}
                              Final Exam (90%) · 500 XP
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Resources & Challenges */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(0, 212, 255, 0.1)',
                              color: 'var(--accent-cyan)',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FileText size={11} /> {course.resources?.length || 0} PDFs
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Flame size={11} /> {course.attachedChallengeIds?.length || 0} Labs
                          </span>
                        </div>
                      </td>

                      {/* Enrolled Students */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{course.enrolledStudentsCount || 0} enrolled</div>
                        <button
                          onClick={() => handleViewAnalytics(course.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: 0,
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <BarChart2 size={12} /> View Student Progress
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <Link
                            to={`/instructor/courses/${encodeURIComponent(course.id)}/modules`}
                            className="btn-primary-gradient"
                            style={{
                              padding: '7px 12px',
                              fontSize: '11.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              textDecoration: 'none',
                              fontWeight: 700,
                              borderRadius: '8px',
                            }}
                            title="Open Module Studio — add lessons, manage modules, generate quizzes"
                          >
                            <FilePenLine size={13} /> Module Studio (Lessons / Quizzes)
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <Link
                              to="/learning"
                              className="btn-secondary"
                              style={{ padding: '5px 8px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              title="Open Syllabus in Student Catalog"
                            >
                              <Layers size={12} /> Syllabus
                            </Link>
                            <button
                              onClick={() => handleOpenEditCourse(course)}
                              className="btn-secondary"
                              style={{ padding: '5px 7px', fontSize: '10.5px' }}
                              title="Edit Course Settings (attach PDFs, challenges, publish…)"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '4px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '5px 7px',
                              }}
                              title="Delete Course"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- CREATE / EDIT COURSE MODAL --- */}
      {showCourseModal && (
        <div
          onClick={() => setShowCourseModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 6, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px 16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, rgba(18, 25, 40, 0.98) 0%, rgba(13, 18, 29, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow:
                '0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 60px rgba(0, 212, 255, 0.06)',
              position: 'relative',
            }}
          >
            {/* Modal header accent bar */}
            <div
              style={{
                height: '3px',
                background: 'linear-gradient(90deg, #00d4ff 0%, #8b5cf6 50%, #00d4ff 100%)',
                backgroundSize: '200% 100%',
              }}
            />

            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '22px 28px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                gap: '16px',
                background:
                  'radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.08), transparent 50%), radial-gradient(ellipse at top left, rgba(0, 212, 255, 0.06), transparent 50%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    padding: '11px',
                    borderRadius: '12px',
                    background: editingCourse
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15))'
                      : 'linear-gradient(135deg, rgba(0, 212, 255, 0.18), rgba(139, 92, 246, 0.15))',
                    border: editingCourse
                      ? '1px solid rgba(139, 92, 246, 0.3)'
                      : '1px solid rgba(0, 212, 255, 0.28)',
                    flexShrink: 0,
                  }}
                >
                  {editingCourse ? (
                    <FilePenLine size={20} color="#a78bfa" />
                  ) : (
                    <BookOpen size={20} color="#00d4ff" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '4px' }}>
                    {editingCourse ? 'Course Settings & Attachments' : 'Create New Course'}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '520px' }}>
                    Organize syllabus metadata, publish status, attached PDFs, and incident challenges.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244, 63, 94, 0.1)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244, 63, 94, 0.25)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.04)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form content */}
            <div
              className="custom-scroll"
              style={{
                overflowY: 'auto',
                padding: '24px 28px 8px',
                flex: 1,
              }}
            >
              <form
                onSubmit={handleSaveCourse}
                style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
              >
                {/* === Section: Basic Course Identity === */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <Layers size={13} />
                    Basic Identity
                  </div>

                  {/* Track Selection */}
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '7px',
                      }}
                    >
                      Target Track
                    </label>
                    <select
                      value={courseForm.trackId}
                      onChange={(e) => setCourseForm({ ...courseForm, trackId: e.target.value })}
                      className="dark-select"
                      required
                    >
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title & Slug */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '12px' }}>
                    <div>
                      <label
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: '7px',
                        }}
                      >
                        Course Title
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            title: e.target.value,
                            slug: editingCourse
                              ? courseForm.slug
                              : e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, '-')
                                  .replace(/(^-|-$)/g, ''),
                          })
                        }
                        className="dark-input"
                        placeholder="e.g. Production Kubernetes Reliability"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: '7px',
                        }}
                      >
                        Slug
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.slug}
                        onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                        className="dark-input"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* === Section: Description & Metadata === */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <AlignLeft size={13} />
                    Description & Metadata
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '7px',
                      }}
                    >
                      Course Summary
                    </label>
                    <textarea
                      rows={3}
                      value={courseForm.summary}
                      onChange={(e) => setCourseForm({ ...courseForm, summary: e.target.value })}
                      className="dark-textarea"
                      placeholder="Describe the learning outcomes and prerequisites for this course..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '12px' }}>
                    <div>
                      <label
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: '7px',
                        }}
                      >
                        Difficulty
                      </label>
                      <select
                        value={courseForm.difficultyLevel}
                        onChange={(e) => setCourseForm({ ...courseForm, difficultyLevel: e.target.value })}
                        className="dark-select"
                      >
                        <option value="BEGINNER">🌱 BEGINNER</option>
                        <option value="INTERMEDIATE">⚡ INTERMEDIATE</option>
                        <option value="ADVANCED">🔥 ADVANCED</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: '7px',
                        }}
                      >
                        Est. Hours
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min={1}
                          value={courseForm.estimatedHours}
                          onChange={(e) =>
                            setCourseForm({ ...courseForm, estimatedHours: parseInt(e.target.value) || 4 })
                          }
                          className="dark-input"
                          style={{ paddingRight: '58px' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          hrs
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: '7px',
                        }}
                      >
                        Publish State
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                          padding: '3px',
                          background: 'rgba(13, 18, 29, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setCourseForm({ ...courseForm, isPublished: false })}
                          style={{
                            padding: '7px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: !courseForm.isPublished
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'transparent',
                            color: !courseForm.isPublished ? '#f59e0b' : 'var(--text-muted)',
                            boxShadow: !courseForm.isPublished ? 'inset 0 0 0 1px rgba(245, 158, 11, 0.35)' : 'none',
                          }}
                        >
                          ✧ Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseForm({ ...courseForm, isPublished: true })}
                          style={{
                            padding: '7px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: courseForm.isPublished
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'transparent',
                            color: courseForm.isPublished ? '#10b981' : 'var(--text-muted)',
                            boxShadow: courseForm.isPublished ? 'inset 0 0 0 1px rgba(16, 185, 129, 0.35)' : 'none',
                          }}
                        >
                          ● Live
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* === Section: Attached Challenges === */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <Terminal size={13} />
                    Attached Practical DevOps Challenges
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {courseForm.attachedChallengeIds.length} attached
                    </span>
                  </div>

                  <div
                    className="custom-scroll"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      background: 'rgba(13, 18, 29, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '8px',
                    }}
                  >
                    {challenges.length === 0 ? (
                      <div
                        style={{
                          padding: '18px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                        }}
                      >
                        <AlertCircle size={16} style={{ marginBottom: '6px', opacity: 0.6 }} />
                        <div>No challenges loaded yet.</div>
                      </div>
                    ) : (
                      challenges.map((chal) => {
                        const isAttached = courseForm.attachedChallengeIds.includes(chal.id);
                        return (
                          <label
                            key={chal.id}
                            className={'challenge-checkbox' + (isAttached ? ' checked' : '')}
                          >
                            <input
                              type="checkbox"
                              checked={isAttached}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCourseForm({
                                    ...courseForm,
                                    attachedChallengeIds: [
                                      ...courseForm.attachedChallengeIds,
                                      chal.id,
                                    ],
                                  });
                                } else {
                                  setCourseForm({
                                    ...courseForm,
                                    attachedChallengeIds:
                                      courseForm.attachedChallengeIds.filter((id) => id !== chal.id),
                                  });
                                }
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: isAttached ? 700 : 500,
                                  color: isAttached ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  marginBottom: '2px',
                                }}
                              >
                                {chal.title}
                              </div>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '10px',
                                }}
                              >
                                <span
                                  style={{
                                    padding: '1px 7px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 212, 255, 0.1)',
                                    color: 'var(--accent-cyan)',
                                    fontWeight: 700,
                                    border: '1px solid rgba(0, 212, 255, 0.2)',
                                  }}
                                >
                                  {chal.category}
                                </span>
                                <span
                                  style={{
                                    padding: '1px 7px',
                                    borderRadius: '8px',
                                    background:
                                      chal.difficulty === 'BEGINNER'
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : chal.difficulty === 'INTERMEDIATE'
                                        ? 'rgba(245, 158, 11, 0.1)'
                                        : 'rgba(244, 63, 94, 0.1)',
                                    color:
                                      chal.difficulty === 'BEGINNER'
                                        ? '#10b981'
                                        : chal.difficulty === 'INTERMEDIATE'
                                        ? '#f59e0b'
                                        : '#f43f5e',
                                    fontWeight: 700,
                                    border: `1px solid ${
                                      chal.difficulty === 'BEGINNER'
                                        ? 'rgba(16, 185, 129, 0.25)'
                                        : chal.difficulty === 'INTERMEDIATE'
                                        ? 'rgba(245, 158, 11, 0.25)'
                                        : 'rgba(244, 63, 94, 0.25)'
                                    }`,
                                  }}
                                >
                                  {chal.difficulty}
                                </span>
                                <span
                                  style={{
                                    color: 'var(--accent-purple)',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <Zap size={10} />
                                  +{chal.xpReward} XP
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* === Section: Study Resources / PDFs === */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <FileText size={13} />
                    Course PDFs & Attached Study Materials
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {courseForm.resources.length} files
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    {courseForm.resources.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          border: '1px dashed rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          background: 'rgba(13, 18, 29, 0.3)',
                        }}
                      >
                        No study materials attached yet. Add your first PDF below.
                      </div>
                    ) : (
                      courseForm.resources.map((res) => (
                        <div key={res.id} className="resource-chip">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div
                              style={{
                                padding: '7px',
                                borderRadius: '8px',
                                background:
                                  res.fileType === 'PDF'
                                    ? 'rgba(244, 63, 94, 0.1)'
                                    : 'rgba(139, 92, 246, 0.12)',
                                border: `1px solid ${
                                  res.fileType === 'PDF'
                                    ? 'rgba(244, 63, 94, 0.22)'
                                    : 'rgba(139, 92, 246, 0.25)'
                                }`,
                                flexShrink: 0,
                              }}
                            >
                              <FileText
                                size={14}
                                color={res.fileType === 'PDF' ? '#f43f5e' : '#a78bfa'}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {res.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  fontFamily: "'JetBrains Mono', monospace",
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '320px',
                                }}
                              >
                                {res.fileUrl}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: 'var(--text-muted)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {res.fileType}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveResource(res.id)}
                              style={{
                                background: 'rgba(244, 63, 94, 0.08)',
                                border: '1px solid rgba(244, 63, 94, 0.2)',
                                color: '#f43f5e',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244, 63, 94, 0.18)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244, 63, 94, 0.08)';
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Resource - Real File Upload */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '14px',
                      background: 'rgba(13, 18, 29, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>
                      Upload PDF / Resource File
                    </div>

                    <input
                      type="text"
                      placeholder="Display title (optional, defaults to filename)"
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      className="dark-input"
                      style={{ fontSize: '12px', padding: '8px 11px' }}
                    />

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                      <div
                        style={{
                          flex: 1,
                          border: '1px dashed rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.015)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => resourceFileInputRef.current?.click()}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 212, 255, 0.35)';
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(0, 212, 255, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)';
                        }}
                      >
                        <input
                          ref={resourceFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.md,.zip,.png,.jpg,.jpeg"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setNewResourceFile(file);
                            if (file && !newResourceTitle.trim()) {
                              setNewResourceTitle(file.name.replace(/\.[^/.]+$/, ''));
                            }
                          }}
                        />
                        <Upload
                          size={16}
                          color={newResourceFile ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {newResourceFile ? (
                            <div>
                              <div style={{
                                fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {newResourceFile.name}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                {(newResourceFile.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Click to select PDF or document file…
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddResource}
                        disabled={uploadingResource || !newResourceFile}
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(139, 92, 246, 0.15))',
                          border: `1px solid ${uploadingResource ? 'rgba(255,255,255,0.1)' : 'rgba(0, 212, 255, 0.3)'}`,
                          color: uploadingResource ? 'var(--text-muted)' : 'var(--text-primary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: uploadingResource || !newResourceFile ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                          opacity: uploadingResource || !newResourceFile ? 0.6 : 1,
                        }}
                      >
                        {uploadingResource ? (
                          <>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom buffer */}
                <div style={{ height: '4px' }} />

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '8px',
                    paddingTop: '18px',
                    paddingBottom: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '8px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary"
                    style={{
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      minWidth: '150px',
                    }}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        Saving...
                      </>
                    ) : editingCourse ? (
                      <>
                        <Save size={15} /> Save Changes
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Create Course
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- STUDENT TELEMETRY & ANALYTICS MODAL --- */}
      {showAnalyticsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Student Learning Telemetry & Progress</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Live enrollment progress, quiz scores, and challenge completions for this course.
                </p>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {analyticsLoading || !selectedAnalytics ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                Loading student performance data...
              </div>
            ) : (
              <div>
                {/* Metric Summary Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Students</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)' }}>{selectedAnalytics.enrolledCount}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{selectedAnalytics.completionRate}%</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg. Quiz Score</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-purple)' }}>{selectedAnalytics.averageQuizScore}%</div>
                  </div>
                </div>

                {/* Enrolled Students Table */}
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Enrolled Candidates</h4>
                {selectedAnalytics.students.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    No students have enrolled in this course yet.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left' }}>Candidate</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left' }}>Progress</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left' }}>Lessons Finished</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left' }}>Quiz Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAnalytics.students.map((student) => (
                          <tr key={student.userId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600 }}>{student.userName}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{student.userEmail}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${student.progressPercentage}%`, height: '100%', background: student.progressPercentage === 100 ? '#10b981' : 'var(--accent-cyan)' }} />
                                </div>
                                <span style={{ fontWeight: 600 }}>{student.progressPercentage}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {student.completedLessons} / {student.totalLessons} Lessons
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {student.quizResults.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)' }}>No quiz taken</span>
                              ) : (
                                student.quizResults.map((qr, i) => (
                                  <div key={i} style={{ color: qr.passed ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                    {qr.score}% ({qr.passed ? 'PASSED' : 'FAILED'})
                                  </div>
                                ))
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
