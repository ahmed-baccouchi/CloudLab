import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Terminal,
  Clock,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  Flame,
  Check
} from 'lucide-react';
import { learningApi } from '../../api/client';
import type { LessonDto } from '@cloudlab/shared-types';

export const LessonReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson completion state
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch lesson
        const lessonRes = await learningApi.getLessonById(id);
        const fetchedLesson: LessonDto = lessonRes.data?.data || lessonRes.data;
        setLesson(fetchedLesson);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load lesson content.');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id]);

  const handleMarkComplete = async () => {
    if (!lesson || !courseIdParam) {
      alert('Unable to mark complete: missing course information');
      return;
    }
    try {
      setCompleting(true);
      await learningApi.completeLesson(courseIdParam, lesson.id);
      setIsCompleted(true);
      alert('✅ Lesson marked as complete!');
    } catch (err: any) {
      console.error('Failed to mark complete:', err);
      alert(err?.response?.data?.message || 'Failed to mark lesson as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
          Loading terminal lesson...
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '60px 24px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Lesson Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Unable to retrieve lesson details.'}</p>
        <button onClick={() => navigate(-1)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Return to Syllabus
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {lesson.title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Clock size={13} /> {lesson.durationMinutes || 15} min read
          </div>
          <button
            onClick={handleMarkComplete}
            disabled={completing || isCompleted}
            className={isCompleted ? 'btn-secondary' : 'btn-primary'}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: isCompleted ? '#10b981' : undefined,
              color: isCompleted ? '#10b981' : undefined,
            }}
          >
            {isCompleted ? <Check size={14} /> : null}
            {isCompleted ? 'Completed' : completing ? 'Marking...' : 'Mark as Completed'}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px 24px' }}>
        {/* Lesson Header */}
        <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
              {lesson.type}
            </span>
            {isCompleted && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                Completed
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            {lesson.title}
          </h1>
        </div>

        {/* Lesson Body */}
        <div
          style={{
            fontSize: '15px',
            lineHeight: 1.8,
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: '32px',
          }}
        >
          {/* Render formatted markdown content */}
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>
            {lesson.contentMarkdown}
          </div>
        </div>

        {/* Attached Course/Lesson Resources (PDFs & Documents) */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              marginBottom: '32px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-cyan)" /> Study Materials & PDFs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lesson.resources.map((res) => (
                <div
                  key={res.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{res.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {res.fileType} Document &bull; Attached by Instructor
                      </div>
                    </div>
                  </div>
                  <a
                    href={res.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <Download size={12} /> Download PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attached Practical DevOps Challenge */}
        {lesson.challengeId && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(13, 18, 29, 0.9) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <Flame size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f87171' }}>
                  Practical Incident Challenge Attached
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Apply the skills learned in this lesson in an automated sandbox environment.
                </p>
              </div>
            </div>
            <button
              onClick={() => alert(`Launching automated DevOps sandbox: ${lesson.challengeId}`)}
              className="btn-primary"
              style={{
                background: '#ef4444',
                color: '#fff',
                borderColor: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '13px',
              }}
            >
              Launch Lab <ExternalLink size={14} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
