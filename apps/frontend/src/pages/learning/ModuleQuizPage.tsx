import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Award,
  Loader2,
} from 'lucide-react';
import { learningApi } from '../../api/client';
import type { ModuleQuizDto, QuizResultDto } from '@cloudlab/shared-types';

export const ModuleQuizPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<ModuleQuizDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResultDto | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!moduleId) return;
      try {
        setLoading(true);
        setError(null);

        const quizRes = await learningApi.getModuleQuiz(moduleId);
        const fetchedQuiz: ModuleQuizDto = quizRes.data?.data || quizRes.data;
        setQuiz(fetchedQuiz);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load module quiz.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [moduleId]);

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !moduleId) return;
    try {
      setQuizSubmitting(true);
      const answersPayload = Object.entries(userAnswers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      }));
      const res = await learningApi.submitModuleQuiz(moduleId, answersPayload);
      const data = res.data?.data || res.data;
      setQuizResult(data);
      setQuizSubmitted(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleReturnToCourse = () => {
    if (courseIdParam) {
      navigate(`/learning/courses/${courseIdParam}/study`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <div style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
            Loading module quiz...
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '60px 24px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Quiz Not Available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {error || 'This module does not have a quiz yet. The instructor needs to generate it.'}
        </p>
        <button onClick={handleReturnToCourse} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Return to Course
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
            onClick={handleReturnToCourse}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Course
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {quiz.title}
            </span>
          </div>
        </div>

        {quizResult && (
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: quizResult.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: quizResult.passed ? '#10b981' : '#ef4444',
              border: `1px solid ${quizResult.passed ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {quizResult.passed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            Score: {quizResult.score}% {quizResult.passed ? '✓ Passed!' : '✗ Failed'}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px 24px' }}>
        {/* Quiz Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 23, 38, 0.9), rgba(13, 18, 29, 0.9))',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)' }}>
                <HelpCircle size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{quiz.title}</h1>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Pass score: {quiz.passingScore}% &bull; {quiz.questions.length} questions
                  {!quizSubmitted && ' &bull; Answer all to submit'}
                </span>
              </div>
            </div>
          </div>

          {quizResult && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '8px',
                background: quizResult.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${quizResult.passed ? '#10b981' : '#ef4444'}`,
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: quizResult.passed ? '#10b981' : '#ef4444' }}>
                {quizResult.passed ? '🎉 Congratulations! You passed!' : '❌ Quiz Failed'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {quizResult.passed
                  ? `You scored ${quizResult.score}% and earned ${quizResult.xpEarned} XP! You can now proceed to the next module.`
                  : `You scored ${quizResult.score}%, but need ${quiz.passingScore}% to pass. Review the material and retake the quiz.`}
              </div>
            </div>
          )}

          {/* Quiz Form */}
          <form onSubmit={handleQuizSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
            {quiz.questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: 'rgba(7, 10, 15, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>Q{idx + 1}.</span>
                  <span>{q.question}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oIdx) => {
                    const isSelected = userAnswers[q.id] === oIdx;
                    const feedbackForQuestion = quizResult?.feedback?.find((f) => f.questionId === q.id);
                    const isCorrect = quizSubmitted && feedbackForQuestion?.correctOption === oIdx;
                    const isWrong = quizSubmitted && isSelected && !isCorrect;

                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleSelectAnswer(q.id, oIdx)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '6px',
                          cursor: quizSubmitted ? 'default' : 'pointer',
                          background: isCorrect
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isWrong
                            ? 'rgba(239, 68, 68, 0.15)'
                            : isSelected
                            ? 'rgba(0, 212, 255, 0.1)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${
                            isCorrect
                              ? '#10b981'
                              : isWrong
                              ? '#ef4444'
                              : isSelected
                              ? 'var(--accent-cyan)'
                              : 'var(--border-subtle)'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: `2px solid ${
                              isCorrect
                                ? '#10b981'
                                : isWrong
                                ? '#ef4444'
                                : isSelected
                                ? 'var(--accent-cyan)'
                                : 'var(--text-muted)'
                            }`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent-cyan)',
                              }}
                            />
                          )}
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {quizSubmitted && q.explanation && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(0, 212, 255, 0.05)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong style={{ color: 'var(--accent-cyan)' }}>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              {quizSubmitted ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizResult(null);
                      setUserAnswers({});
                    }}
                    className="btn-secondary"
                  >
                    Retake Quiz
                  </button>
                  <button
                    type="button"
                    onClick={handleReturnToCourse}
                    className="btn-primary"
                  >
                    {quizResult?.passed ? 'Continue to Next Module' : 'Return to Course'}
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={quizSubmitting || Object.keys(userAnswers).length !== quiz.questions.length}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Award size={16} /> {quizSubmitting ? 'Evaluating...' : 'Submit Answers'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
