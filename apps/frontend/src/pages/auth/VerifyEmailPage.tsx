import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Terminal, ShieldCheck, Mail } from 'lucide-react';
import { authApi } from '../../api/client';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const hasRequested = useRef(false);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(10);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL. Please check your verification link.');
      return;
    }

    if (hasRequested.current) return;
    hasRequested.current = true;

    const verify = async () => {
      try {
        const res = await authApi.verifyEmail(token);
        const userData = res.data?.data?.user;
        const msg = res.data?.data?.message || 'Email successfully verified! Your account is now active.';

        setStatus('success');
        setMessage(msg);
        if (userData?.email) {
          setVerifiedEmail(userData.email);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'The verification link is invalid or has expired.');
      }
    };

    verify();
  }, [token]);

  // Optional countdown auto-redirect
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login', { state: { verifiedSuccess: true, email: verifiedEmail } });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, navigate, verifiedEmail]);

  const handleProceedToLogin = () => {
    navigate('/login', { state: { verifiedSuccess: true, email: verifiedEmail } });
  };

  return (
    <div className="auth-container">
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '48px 36px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: status === 'success'
              ? 'linear-gradient(90deg, #10b981, #00d4ff)'
              : status === 'error'
              ? 'linear-gradient(90deg, #f43f5e, #f97316)'
              : 'linear-gradient(90deg, #00d4ff, #3b82f6)',
          }}
        />

        {/* Brand Header */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Terminal size={18} color="#040812" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>
            Cloud<span style={{ color: 'var(--accent-cyan)' }}>Lab</span>
          </span>
        </div>

        {/* Verifying State */}
        {status === 'verifying' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <RefreshCw size={48} color="var(--accent-cyan)" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Verifying Credentials</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Authenticating verification token with CloudLab identity cluster...
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div>
            {/* Animated Glow Shield */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <ShieldCheck size={44} color="#10b981" />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '16px',
                letterSpacing: '0.05em',
              }}
            >
              <CheckCircle2 size={14} /> STATUS: VERIFIED & UNLOCKED
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '10px', color: '#ffffff' }}>
              Email Successfully Verified!
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              {message}
            </p>

            {verifiedEmail && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  marginBottom: '28px',
                }}
              >
                <Mail size={16} color="var(--accent-cyan)" />
                <span className="font-mono">{verifiedEmail}</span>
              </div>
            )}

            <button
              onClick={handleProceedToLogin}
              className="btn-primary"
              style={{ width: '100%', padding: '14px 24px', fontSize: '15px' }}
            >
              Sign In to Your Workspace <ArrowRight size={16} />
            </button>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
              Redirecting to sign-in in {countdown}s...
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '2px solid rgba(244, 63, 94, 0.4)',
                boxShadow: '0 0 25px rgba(244, 63, 94, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <AlertTriangle size={38} color="#f43f5e" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#f43f5e' }}>
              Verification Failed
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
              {message}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/login" className="btn-secondary">
                Back to Sign In
              </Link>
              <Link to="/register" className="btn-primary" style={{ width: 'auto' }}>
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
