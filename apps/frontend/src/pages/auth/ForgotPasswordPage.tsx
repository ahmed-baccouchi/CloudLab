import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldAlert, Terminal } from 'lucide-react';
import { authApi } from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '40px 36px',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
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

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} color="#10b981" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Check Your Inbox</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              If an active account exists for <strong>{email}</strong>, we have dispatched a secure password reset link. The link remains valid for 1 hour.
            </p>

            <Link to="/login" className="btn-secondary" style={{ width: '100%' }}>
              <ArrowLeft size={16} /> Return to Login
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Forgot Password</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
              Enter the email associated with your CloudLab account and we will send you a link to reset your credentials.
            </p>

            {error && (
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
                    placeholder="alex.devops@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary"
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Sending Instructions...' : 'Send Reset Link'} <Send size={15} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link to="/login" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
