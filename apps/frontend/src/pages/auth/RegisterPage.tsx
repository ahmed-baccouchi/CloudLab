import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Terminal, ShieldAlert, CheckCircle2, ArrowRight, Server, Cpu, GraduationCap, BookOpen, Camera } from 'lucide-react';
import { authApi } from '../../api/client';
import { evaluatePassword } from '../../utils/password-strength';
import { PasswordStrengthMeter } from '../../components/PasswordStrengthMeter';

type RegisterRole = 'STUDENT' | 'INSTRUCTOR';

const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_MAX_MB = 5;

export const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<RegisterRole>('STUDENT');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Optional avatar preview
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFileError, setAvatarFileError] = useState<string | null>(null);

  // Evaluate password strength dynamically with zxcvbn and conditions
  const analysis = useMemo(() => evaluatePassword(password), [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    analysis.isAcceptable &&
    passwordsMatch &&
    !loading;

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setAvatarFileError('Only JPEG, PNG, WebP or GIF images are allowed.');
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      setAvatarFileError(`Image must be smaller than ${AVATAR_MAX_MB} MB.`);
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.register({
        firstName,
        lastName,
        email,
        password,
        role,
      }, avatarFile);

      setSuccessMessage(
        response.data.data?.message ||
        'Account created! We have sent a verification email to your address. Please verify your email before logging in.'
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">
        {/* Left Side: Brand & DevOps Command Hero */}
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
              Master Cloud & DevOps in Realistic Sandboxes
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              Solve real outages, build production Kubernetes manifests, and earn automated XP validation directly on your command line.
            </p>

            {/* Feature Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                  <Cpu size={16} color="var(--accent-cyan)" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Deterministic Validator Engine</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automated grading without subjective guesswork</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <Server size={16} color="var(--accent-purple)" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Zero Sandbox Placeholders</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Linux kernel, Docker bridge & K8s triage</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            Enterprise-grade DevSecOps Training &bull; v1.0.0
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="auth-form-panel">
          {successMessage ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <CheckCircle2 size={36} color="#10b981" />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Verify Your Email</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                {successMessage}
              </p>

              <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '40px' }}>
                For security reasons, accounts remain locked until email confirmation is completed.
              </div>

              <Link to="/login" className="btn-primary">
                Proceed to Login <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Create your account</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Already have an account? <Link to="/login">Sign in here</Link>
                </p>
              </div>

              {error && (
                <div className="alert alert-error">
                  <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Optional profile photo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '22px' }}>
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    style={{ position: 'relative', width: '80px', height: '80px', cursor: 'pointer' }}
                    title="Add a profile photo (optional)"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-cyan)' }}
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,212,255,0.07)', border: '2px dashed rgba(0,212,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={26} color="rgba(0,212,255,0.5)" />
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#040812', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary, #070a0f)' }}>
                      <Camera size={11} />
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarPick}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {avatarPreview ? '✓ Photo selected' : 'Add photo (optional)'}
                  </span>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAvatarPreview(null); setAvatarFile(null); setAvatarFileError(null); }}
                      style={{ fontSize: '11px', color: 'var(--accent-rose, #f43f5e)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
                    >
                      Remove
                    </button>
                  )}
                  {avatarFileError && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-rose, #f43f5e)', marginTop: '4px' }}>{avatarFileError}</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Alex"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="DevOps"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work or Personal Email</label>
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

                <div className="form-group">
                  <label className="form-label">I am registering as</label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setRole('STUDENT')}
                      style={{
                        padding: '16px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${role === 'STUDENT' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        background: role === 'STUDENT' ? 'rgba(0, 212, 255, 0.08)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: role === 'STUDENT' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <GraduationCap size={18} color={role === 'STUDENT' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: role === 'STUDENT' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          Student / User
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                        Learn, solve incidents, earn badges and DevOps XP.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('INSTRUCTOR')}
                      style={{
                        padding: '16px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${role === 'INSTRUCTOR' ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                        background: role === 'INSTRUCTOR' ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: role === 'INSTRUCTOR' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <BookOpen size={18} color={role === 'INSTRUCTOR' ? 'var(--accent-purple)' : 'var(--text-muted)'} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: role === 'INSTRUCTOR' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          Instructor
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                        Author courses, design challenges, attach learning resources, and track student cohort metrics.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Create Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input"
                      placeholder="Minimum 8 chars with varied entropy"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Visual password strength meter */}
                  <PasswordStrengthMeter analysis={analysis} passwordLength={password.length} />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className={`form-input ${confirmPassword && !passwordsMatch ? 'has-error' : ''}`}
                      placeholder="Repeat password"
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
                  style={{ marginTop: '12px' }}
                >
                  {loading ? 'Creating Account & Sending Email...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
