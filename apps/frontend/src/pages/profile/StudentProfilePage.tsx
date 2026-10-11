import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Save,
  User,
  Mail,
  GitBranch,
  Link,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { profileApi } from '../../api/client';
import { getUserFromStorage, saveUserToStorage, resyncUserFromServer, resolveAvatarUrl } from '../../utils/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const TERMINAL_THEMES = ['dracula', 'cyberpunk', 'matrix', 'monokai', 'nord', 'solarized'] as const;

type Theme = typeof TERMINAL_THEMES[number];

/** Consistent avatar renderer with image-load error → initials fallback. */
function ProfileAvatar({
  src,
  initials,
  size,
}: {
  src: string | null;
  initials: string;
  size: number;
}) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [src]);
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,113,255,0.25))',
    border: '2px solid rgba(0, 212, 255, 0.35)',
    boxShadow: '0 6px 28px rgba(0, 212, 255, 0.2)',
  };
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt="Avatar"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        style={{
          ...base,
          objectFit: 'cover',
          display: 'block',
          borderStyle: 'solid',
        }}
      />
    );
  }
  return (
    <div style={{
      ...base,
      color: '#040812',
      fontSize: size * 0.36,
      fontWeight: 800,
      letterSpacing: '0.03em',
    }}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string; label: string; Icon: React.FC<any> }> = {
    STUDENT:    { bg: 'rgba(0,212,255,0.10)',   color: 'var(--accent-cyan)',   border: 'rgba(0,212,255,0.25)',   label: 'Student',    Icon: GraduationCap },
    INSTRUCTOR: { bg: 'rgba(139,92,246,0.10)',  color: 'var(--accent-purple)', border: 'rgba(139,92,246,0.25)', label: 'Instructor', Icon: BookOpen },
    ADMIN:      { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444',              border: 'rgba(239,68,68,0.25)',  label: 'Admin',      Icon: Shield },
  };
  const c = cfg[role] ?? cfg.STUDENT;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      <c.Icon size={11} /> {c.label}
    </span>
  );
}

export const StudentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [bio, setBio]             = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [theme, setTheme]         = useState<Theme>('dracula');

  // Avatar state
  const [avatarPreview, setAvatarPreview]   = useState<string | null>(null);
  const [pendingFile, setPendingFile]       = useState<File | null>(null);
  const [avatarError, setAvatarError]       = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile save state
  const [saving, setSaving]       = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load user ──────────────────────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      // Try server first for freshest data; fall back to storage
      const serverUser = await resyncUserFromServer();
      const u = serverUser || getUserFromStorage();
      if (!u) { navigate('/login'); return; }
      setUser(u);
      setFirstName(u.firstName ?? '');
      setLastName(u.lastName ?? '');
      setBio(u.profile?.bio ?? '');
      setGithubUrl(u.profile?.githubUrl ?? '');
      setLinkedinUrl(u.profile?.linkedinUrl ?? '');
      setTheme((u.profile?.preferredTerminalTheme as Theme) ?? 'dracula');
      setAvatarPreview(resolveAvatarUrl(u.avatarUrl, u.updatedAt || Date.now()));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadUser(); }, [loadUser]);

  // ── Avatar file pick ───────────────────────────────────────────────────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Only JPEG, PNG, WebP, or GIF images are allowed.');
      try { e.target.value = ''; } catch (_) { /* ignore */ }
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      try { e.target.value = ''; } catch (_) { /* ignore */ }
      return;
    }

    // Read the file as a data URL BEFORE clearing the input value, otherwise
    // the browser may GC the file before the Blob is read.
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview((ev.target?.result as string) || null);
      try { if (e.target) (e.target as HTMLInputElement).value = ''; } catch (_) { /* ignore */ }
    };
    reader.onerror = () => {
      setAvatarPreview(null);
      setPendingFile(null);
      setAvatarError('Failed to read the selected image. Please try a different file.');
      try { if (e.target) (e.target as HTMLInputElement).value = ''; } catch (_) { /* ignore */ }
    };
    reader.readAsDataURL(file);
  };

  // ── Upload avatar immediately ──────────────────────────────────────────────
  const handleUploadAvatar = async () => {
    if (!pendingFile) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await profileApi.uploadAvatar(pendingFile);
      if (!res?.data?.success) {
        const msg = res?.data?.message ?? 'Failed to upload image. Please try again.';
        setAvatarError(msg);
        if (res?.data?.code === 'SESSION_INVALID') return;
        return;
      }
      const { user: updatedUser, avatarUrl } = res.data.data;

      // Re-sync the user from the DB to make absolutely sure the avatar we show
      // is the one actually stored in the `users.avatar_url` column. This aligns
      // with the flow "the image URL in the user table and the image is recovered
      // from that".
      const serverUser = await resyncUserFromServer() || updatedUser;
      saveUserToStorage(serverUser);
      setUser(serverUser);

      // Use the resolved URL with cache-bust so the browser downloads fresh bytes
      // instead of a stale cached copy.
      setAvatarPreview(resolveAvatarUrl(serverUser?.avatarUrl ?? avatarUrl, serverUser?.updatedAt || Date.now()));
      setPendingFile(null);
    } catch (err: any) {
      setAvatarError(err.response?.data?.message ?? 'Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Remove avatar ──────────────────────────────────────────────────────────
  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl && !pendingFile) return;
    if (pendingFile) {
      setPendingFile(null);
      setAvatarPreview(resolveAvatarUrl(user?.avatarUrl, user?.updatedAt || Date.now()));
      return;
    }
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await profileApi.deleteAvatar();
      if (!res?.data?.success) {
        const msg = res?.data?.message ?? 'Failed to remove avatar.';
        setAvatarError(msg);
        if (res?.data?.code === 'SESSION_INVALID') return;
        return;
      }
      const updatedUser = res.data.data?.user;
      const serverUser = (await resyncUserFromServer()) || updatedUser;
      if (serverUser) { saveUserToStorage(serverUser); setUser(serverUser); }
      setAvatarPreview(null);
    } catch (err: any) {
      setAvatarError(err.response?.data?.message ?? 'Failed to remove avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save profile fields ────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // If there's a pending avatar, upload it first
    if (pendingFile) {
      setUploadingAvatar(true);
      try {
        const res = await profileApi.uploadAvatar(pendingFile);
        if (!res?.data?.success) {
          const msg = res?.data?.message ?? 'Failed to upload avatar.';
          setAvatarError(msg);
          setUploadingAvatar(false);
          setSaving(false);
          return;
        }
        const { user: updatedUser, avatarUrl } = res.data.data;
        const serverUser = (await resyncUserFromServer()) || updatedUser;
        saveUserToStorage(serverUser);
        setUser(serverUser);
        setAvatarPreview(resolveAvatarUrl(serverUser?.avatarUrl ?? avatarUrl, serverUser?.updatedAt || Date.now()));
        setPendingFile(null);
      } catch (err: any) {
        setAvatarError(err.response?.data?.message ?? 'Failed to upload avatar.');
        setUploadingAvatar(false);
        setSaving(false);
        return;
      }
      setUploadingAvatar(false);
    }

    try {
      const res = await profileApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        preferredTerminalTheme: theme,
      });
      if (!res?.data?.success) {
        const msg = res?.data?.message ?? 'Failed to save profile. Please try again.';
        setSaveError(msg);
        return;
      }
      const updatedUser = res.data.data;
      const serverUser = (await resyncUserFromServer()) || updatedUser;
      saveUserToStorage(serverUser);
      setUser(serverUser);
      // Always refresh avatar preview to match the authoritative DB row
      setAvatarPreview(resolveAvatarUrl(serverUser?.avatarUrl, serverUser?.updatedAt || Date.now()));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar currentPage="other" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, color: 'var(--accent-cyan)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Loading profile…</span>
        </div>
      </div>
    );
  }

  const hasAvatar = !!(pendingFile || (user?.avatarUrl));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar currentPage="other" />

      <div className="profile-page-container">
        {/* Header */}
        <div className="profile-page-header">
          <button className="btn-back-profile" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 className="profile-page-title">My Profile</h1>
            <p className="profile-page-subtitle">Manage your account identity and learning preferences</p>
          </div>
        </div>

        <div className="profile-layout">
          {/* ── Left: Avatar card ── */}
          <div className="profile-avatar-card">
            <div className="avatar-circle-wrapper">
              <ProfileAvatar
                src={avatarPreview}
                initials={`${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase()}
                size={110}
              />

              {/* Camera overlay button */}
              <button
                type="button"
                className="avatar-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile photo"
                disabled={uploadingAvatar}
              >
                <Camera size={16} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFilePick}
            />

            <div className="avatar-name-display">
              {firstName} {lastName}
            </div>
            <div style={{ margin: '6px 0 12px' }}>
              <RoleBadge role={user?.role ?? 'STUDENT'} />
            </div>
            <div className="avatar-email-display">{user?.email}</div>

            {avatarError && (
              <div className="avatar-error-msg">
                <AlertCircle size={13} /> {avatarError}
              </div>
            )}

            <div className="avatar-action-row">
              {pendingFile && (
                <button
                  type="button"
                  className="btn-upload-avatar"
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} />}
                  {uploadingAvatar ? 'Uploading…' : 'Apply Photo'}
                </button>
              )}
              {hasAvatar && (
                <button
                  type="button"
                  className="btn-remove-avatar"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  title="Remove current photo"
                >
                  <Trash2 size={13} />
                  {pendingFile ? 'Cancel' : 'Remove'}
                </button>
              )}
            </div>

            <p className="avatar-hint">
              JPEG, PNG, WebP or GIF · max {MAX_SIZE_MB} MB
            </p>

            {/* Member since */}
            {user?.createdAt && (
              <div className="avatar-member-since">
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* ── Right: Edit form ── */}
          <div className="profile-form-card">
            <form onSubmit={handleSaveProfile}>
              {saveSuccess && (
                <div className="profile-alert success">
                  <CheckCircle2 size={15} /> Profile saved successfully!
                </div>
              )}
              {saveError && (
                <div className="profile-alert error">
                  <AlertCircle size={15} /> {saveError}
                </div>
              )}

              {/* ─ Section: Personal Info ─ */}
              <div className="profile-section-title">Personal Information</div>

              <div className="profile-field-row">
                <div className="profile-field-group">
                  <label className="profile-label">
                    <User size={13} /> First Name
                  </label>
                  <input
                    type="text"
                    className="profile-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-label">
                    <User size={13} /> Last Name
                  </label>
                  <input
                    type="text"
                    className="profile-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="DevOps"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-label">
                  <Mail size={13} /> Email Address
                </label>
                <input
                  type="email"
                  className="profile-input profile-input-disabled"
                  value={user?.email ?? ''}
                  disabled
                  title="Email cannot be changed"
                />
                <span className="profile-field-hint">Email address is managed by your account and cannot be changed here.</span>
              </div>

              <div className="profile-field-group">
                <label className="profile-label">
                  <Terminal size={13} /> Bio
                </label>
                <textarea
                  className="profile-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about your DevOps journey, interests, and goals…"
                  maxLength={500}
                  rows={4}
                />
                <span className="profile-field-hint">{bio.length}/500</span>
              </div>

              {/* ─ Section: Social Links ─ */}
              <div className="profile-section-title" style={{ marginTop: 28 }}>Social &amp; Professional Links</div>

              <div className="profile-field-group">
                <label className="profile-label">
                  <GitBranch size={13} /> GitHub URL
                </label>
                <input
                  type="url"
                  className="profile-input"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourhandle"
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-label">
                  <Link size={13} /> LinkedIn URL
                </label>
                <input
                  type="url"
                  className="profile-input"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              {/* ─ Section: Preferences ─ */}
              <div className="profile-section-title" style={{ marginTop: 28 }}>Terminal Preferences</div>

              <div className="profile-field-group">
                <label className="profile-label">
                  <Terminal size={13} /> Preferred Terminal Theme
                </label>
                <div className="theme-picker">
                  {TERMINAL_THEMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`theme-option ${theme === t ? 'selected' : ''}`}
                      onClick={() => setTheme(t)}
                    >
                      <span className={`theme-dot theme-dot-${t}`} />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Save button ─ */}
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={saving || uploadingAvatar}
                >
                  {saving ? (
                    <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  ) : (
                    <><Save size={15} /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .profile-page-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px 64px;
        }

        .profile-page-header {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 32px;
        }

        .btn-back-profile {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          margin-top: 4px;
        }

        .btn-back-profile:hover {
          background: rgba(255,255,255,0.07);
          color: var(--text-primary);
        }

        .profile-page-title {
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }

        .profile-page-subtitle {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 0;
        }

        .profile-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 800px) {
          .profile-layout { grid-template-columns: 1fr; }
        }

        /* ─ Avatar card ─ */
        .profile-avatar-card {
          background: var(--bg-card, rgba(255,255,255,0.03));
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 28px 20px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .avatar-circle-wrapper {
          position: relative;
          width: 110px;
          height: 110px;
          margin-bottom: 16px;
        }

        .avatar-circle-img,
        .avatar-circle-initials {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(0,212,255,0.3);
        }

        .avatar-circle-initials {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%);
          color: #040812;
          font-size: 32px;
          font-weight: 800;
        }

        .avatar-camera-btn {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-cyan, #00d4ff);
          color: #040812;
          border: 2px solid var(--bg-primary, #070a0f);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }

        .avatar-camera-btn:hover:not(:disabled) {
          background: #fff;
          transform: scale(1.1);
        }

        .avatar-camera-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .avatar-name-display {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .avatar-email-display {
          font-size: 12px;
          color: var(--text-muted);
          word-break: break-all;
          margin-bottom: 16px;
        }

        .avatar-error-msg {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #f87171;
          background: rgba(239,68,68,0.10);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 10px;
          text-align: left;
        }

        .avatar-action-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 8px;
        }

        .btn-upload-avatar {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(0,212,255,0.12);
          border: 1px solid rgba(0,212,255,0.35);
          color: var(--accent-cyan);
          padding: 7px 12px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-upload-avatar:hover:not(:disabled) {
          background: rgba(0,212,255,0.20);
        }

        .btn-upload-avatar:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-remove-avatar {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          padding: 7px 12px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-remove-avatar:hover:not(:disabled) { background: rgba(239,68,68,0.15); }
        .btn-remove-avatar:disabled { opacity: 0.5; cursor: not-allowed; }

        .avatar-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin: 4px 0 12px;
        }

        .avatar-member-since {
          font-size: 11px;
          color: var(--text-muted);
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
          width: 100%;
          text-align: center;
        }

        /* ─ Form card ─ */
        .profile-form-card {
          background: var(--bg-card, rgba(255,255,255,0.03));
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 28px 28px 32px;
        }

        .profile-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .profile-alert.success {
          background: rgba(16,185,129,0.10);
          border: 1px solid rgba(16,185,129,0.25);
          color: #34d399;
        }

        .profile-alert.error {
          background: rgba(239,68,68,0.10);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
        }

        .profile-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--text-muted);
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .profile-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .profile-field-row { grid-template-columns: 1fr; }
        }

        .profile-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .profile-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .profile-input,
        .profile-textarea {
          background: var(--bg-secondary, rgba(255,255,255,0.04));
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 10px 13px;
          color: var(--text-primary);
          font-size: 13.5px;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }

        .profile-input:focus,
        .profile-textarea:focus {
          outline: none;
          border-color: var(--accent-cyan);
          box-shadow: 0 0 0 3px rgba(0,212,255,0.08);
        }

        .profile-input-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profile-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .profile-field-hint {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ─ Theme picker ─ */
        .theme-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .theme-option {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 13px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-secondary, rgba(255,255,255,0.04));
          color: var(--text-secondary);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.13s;
        }

        .theme-option:hover { border-color: rgba(0,212,255,0.3); color: var(--text-primary); }

        .theme-option.selected {
          border-color: var(--accent-cyan);
          background: rgba(0,212,255,0.08);
          color: var(--accent-cyan);
          font-weight: 700;
        }

        .theme-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .theme-dot-dracula   { background: #bd93f9; }
        .theme-dot-cyberpunk { background: #00d4ff; }
        .theme-dot-matrix    { background: #00ff41; }
        .theme-dot-monokai   { background: #f92672; }
        .theme-dot-nord      { background: #88c0d0; }
        .theme-dot-solarized { background: #b58900; }

        /* ─ Save button ─ */
        .btn-save-profile {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%);
          color: #040812;
          border: none;
          padding: 11px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(0,212,255,0.25);
        }

        .btn-save-profile:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,212,255,0.35);
        }

        .btn-save-profile:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
};
