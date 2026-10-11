import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, ArrowRight, Terminal } from 'lucide-react';
import { authApi } from '../../api/client';
import { evaluatePassword } from '../../utils/password-strength';
import { PasswordStrengthMeter } from '../../components/PasswordStrengthMeter';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const analysis = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = token && analysis.isAcceptable && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      await authApi.resetPassword({
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '12px' }}>
            Invalid Reset Link
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            No password reset token was detected in the URL. Please request a new link.
          </p>
          <Link to="/forgot-password" className="btn-primary">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '40px 36px',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
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

        {success ? (
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

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Password Reset Complete</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              Your credentials have been securely updated. You can now authenticate with your new password.
            </p>

            <Link to="/login" className="btn-primary">
              Proceed to Sign In <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Choose a New Password</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
              Ensure your new password passes real-world entropy criteria to safeguard your lab environments.
            </p>

            {error && (
              <div className="alert alert-error">
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Enter robust new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter analysis={analysis} passwordLength={newPassword.length} />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`form-input ${confirmPassword && !passwordsMatch ? 'has-error' : ''}`}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-rose)', marginTop: '2px' }}>
                    Passwords do not match
                  </span>
                )}
                {passwordsMatch && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Passwords match
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary"
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Updating Credentials...' : 'Save New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
