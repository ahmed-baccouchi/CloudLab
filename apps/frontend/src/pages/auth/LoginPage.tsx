import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Terminal, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if routed from successful email verification
  const justVerified = location.state?.verifiedSuccess;
  const initialEmail = location.state?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;

    setLoading(true);
    setError(null);
    setIsUnverified(false);
    setResendSuccess(null);

    try {
      const response = await authApi.login({ email, password });
      const { accessToken, user } = response.data.data;

      localStorage.setItem('cloudlab_access_token', accessToken);
      localStorage.setItem('cloudlab_user', JSON.stringify(user));

      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'INSTRUCTOR') {
        navigate('/instructor/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.code === 'EMAIL_NOT_VERIFIED' || resp?.message?.toLowerCase().includes('verify')) {
        setIsUnverified(true);
        setError(resp.message || 'Your account is locked until you verify your email address.');
      } else {
        setError(resp?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      const res = await authApi.resendVerification(email);
      setResendSuccess(res.data?.data?.message || 'A new verification link has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">
        {/* Left Side: Brand Panel */}
        <div className="auth-hero">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)',
                }}
              >
                <Terminal size={20} color="#040812" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Cloud<span style={{ color: 'var(--accent-cyan)' }}>Lab</span>
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.25, marginBottom: '16px' }}>
              Return to Your Active DevOps Workspace
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              Continue your hands-on journey across Kubernetes architectures, Linux diagnostics, and automated incident triage.
            </p>

            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ color: '#00d4ff' }}>$</span> Welcome to cloudlab<br />
              <span style={{ color: '#10b981' }}>[OK]</span> Your cloud journey starts here<br />
              <span style={{ color: '#f59e0b' }}>[INFO]</span> Explore,learn and manage your cloud environment
            </div>
          </div>


        </div>

        {/* Right Side: Login Form */}
        <div className="auth-form-panel">
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Sign in to CloudLab</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              New engineer? <Link to="/register">Create an account</Link>
            </p>
          </div>

          {/* Email Just Verified Banner */}
          {justVerified && !error && (
            <div
              className="alert alert-success"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)',
              }}
            >
              <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                  Email Verified Successfully!
                </div>
                <div style={{ fontSize: '12px', color: '#a7f3d0', marginTop: '2px' }}>
                  Your account is fully activated and unlocked. Please enter your password to sign in.
                </div>
              </div>
            </div>
          )}

          {/* Unverified Account Banner */}
          {isUnverified && (
            <div className="alert alert-warning" style={{ flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>Account Locked: Email Not Verified</span>
              </div>
              <p style={{ fontSize: '12px', color: '#fef3c7', margin: 0 }}>
                You must verify your email address to unlock your account. Check your inbox or request a new link below.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', marginTop: '6px', fontSize: '12px', padding: '6px 12px' }}
              >
                {resending ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                <span>Resend Verification Email</span>
              </button>
            </div>
          )}

          {resendSuccess && (
            <div className="alert alert-success">
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <span>{resendSuccess}</span>
            </div>
          )}

          {error && !isUnverified && (
            <div className="alert alert-error">
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">
                <span>Password</span>
                <Link to="/forgot-password" style={{ fontSize: '12px' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus={Boolean(justVerified)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary"
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};
