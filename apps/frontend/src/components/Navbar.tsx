import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  FolderGit2,
  BookOpen,
  Home,
  LogOut,
  User,
  Plus,
  Settings,
  ChevronDown,
  Award,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { secureLogout, getUserRole, getUserFromStorage, resolveAvatarUrl } from '../utils/auth';

interface NavbarProps {
  currentPage?: 'home' | 'learning' | 'projects' | 'instructor' | 'admin' | 'community' | 'other';
  rightAction?: React.ReactNode;
}

// Small reusable avatar that handles image load errors gracefully
const AvatarCircle: React.FC<{
  src: string | null;
  initials: string;
  size: number;
  style?: React.CSSProperties;
}> = ({ src, initials, size, style }) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state when src changes (e.g. after a new upload)
  useEffect(() => { setImgError(false); }, [src]);

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  };

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={initials}
        style={{ ...base, objectFit: 'cover', display: 'block' }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div style={{
      ...base,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)',
      color: '#040812',
      fontSize: size * 0.36,
      fontWeight: 800,
      letterSpacing: '0.03em',
    }}>
      {initials}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({ currentPage, rightAction }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Re-read user from storage on every route change so avatar updates are reflected
  const [user, setUser] = useState(() => getUserFromStorage());
  const role = user?.role || getUserRole();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-read user from storage on every route change so avatar updates are reflected
  useEffect(() => {
    setUser(getUserFromStorage());
  }, [location.pathname]);

  // Also update immediately when any component saves new user data (e.g. after avatar upload)
  useEffect(() => {
    const handler = (e: Event) => {
      const updated = (e as CustomEvent).detail || getUserFromStorage();
      setUser(updated);
    };
    window.addEventListener('cloudlab:user-updated', handler);
    return () => window.removeEventListener('cloudlab:user-updated', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await secureLogout(navigate);
  };

  const isActive = (pathPrefix: string) => location.pathname.startsWith(pathPrefix);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const avatarUrl = resolveAvatarUrl(user?.avatarUrl, user?.updatedAt || Date.now());

  const initials = user
    ? `${(user.firstName || '?')[0]}${(user.lastName || '?')[0]}`.toUpperCase()
    : '?';

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const displayEmail = user?.email ?? '';

  return (
    <nav className="cloudlab-global-navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="nav-left">
          <Link to="/dashboard" className="brand-logo" aria-label="CloudLab Home">
            <span className="brand-icon">
              <GraduationCap size={18} color="#040812" strokeWidth={2.5} />
            </span>
            <span className="brand-text">
              Cloud<span>Lab</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="nav-links">
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <Home size={15} />
              <span>Home</span>
            </Link>

            <Link
              to="/projects"
              className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
            >
              <FolderGit2 size={15} />
              <span>Projects</span>
              <span className="badge-squads">Squads</span>
            </Link>

            <Link
              to="/skills"
              className={`nav-link ${location.pathname === '/skills' ? 'active' : ''}`}
            >
              <Award size={15} />
              <span>My Skills</span>
            </Link>

            <Link
              to="/learning"
              className={`nav-link ${isActive('/learning') ? 'active' : ''}`}
            >
              <BookOpen size={15} />
              <span>Courses &amp; Tracks</span>
            </Link>

            <Link
              to="/community"
              className={`nav-link ${isActive('/community') ? 'active' : ''}`}
            >
              <MessageSquare size={15} />
              <span>Community &amp; AI</span>
            </Link>

            {(role === 'INSTRUCTOR' || role === 'ADMIN') && (
              <Link
                to="/instructor/dashboard"
                className={`nav-link ${isActive('/instructor') ? 'active' : ''}`}
              >
                <span>Instructor</span>
              </Link>
            )}

            {role === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
              >
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="nav-right">
          {rightAction}

          <NotificationDropdown />

          {isActive('/projects') && location.pathname !== '/projects/create' && (
            <Link to="/projects/create" className="btn-nav-create">
              <Plus size={14} />
              <span>New Project</span>
            </Link>
          )}


          {/* User Avatar + Dropdown */}
          <div className="nav-user-menu" ref={menuRef}>
            <button
              type="button"
              className={`nav-avatar-btn ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              title={displayName}
            >
              <AvatarCircle src={avatarUrl} initials={initials} size={30} />
              <ChevronDown size={12} className="nav-avatar-chevron" />
            </button>

            {menuOpen && (
              <div className="nav-dropdown" role="menu">
                {/* User identity header */}
                <div className="nav-dropdown-header">
                  <AvatarCircle
                    src={avatarUrl}
                    initials={initials}
                    size={38}
                    style={{ border: '2px solid rgba(0,212,255,0.2)' }}
                  />
                  <div className="nav-dropdown-identity">
                    <span className="nav-dropdown-name">{displayName}</span>
                    <span className="nav-dropdown-email">{displayEmail}</span>
                  </div>
                </div>

                <div className="nav-dropdown-divider" />

                <Link
                  to="/profile"
                  className="nav-dropdown-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings size={14} />
                  <span>Modify Profile</span>
                </Link>

                <div className="nav-dropdown-divider" />

                <button
                  type="button"
                  className="nav-dropdown-item nav-dropdown-logout"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .cloudlab-global-navbar {
          background: rgba(13, 18, 29, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
        }

        .navbar-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary, #fff);
          font-weight: 800;
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .brand-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #00d4ff 0%, #0091ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 212, 255, 0.35);
        }

        .brand-text span {
          color: var(--accent-cyan, #00d4ff);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          color: var(--text-secondary, #94a3b8);
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .nav-link:hover {
          color: var(--text-primary, #fff);
          background: rgba(255, 255, 255, 0.04);
          text-decoration: none;
        }

        .nav-link.active {
          color: var(--accent-cyan, #00d4ff);
          background: rgba(0, 212, 255, 0.08);
          font-weight: 600;
        }

        .badge-squads {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-cyan, #00d4ff);
          border: 1px solid rgba(0, 212, 255, 0.3);
          padding: 2px 6px;
          border-radius: 12px;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-nav-create {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 145, 255, 0.15));
          border: 1px solid rgba(0, 212, 255, 0.4);
          color: var(--accent-cyan, #00d4ff);
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .btn-nav-create:hover {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(0, 145, 255, 0.25));
          border-color: var(--accent-cyan, #00d4ff);
          color: #fff;
          text-decoration: none;
          transform: translateY(-1px);
        }

        /* ── Avatar button ── */
        .nav-user-menu {
          position: relative;
        }

        .nav-avatar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 24px;
          padding: 3px 10px 3px 3px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text-secondary, #94a3b8);
        }

        .nav-avatar-btn:hover,
        .nav-avatar-btn.open {
          background: rgba(0, 212, 255, 0.08);
          border-color: rgba(0, 212, 255, 0.3);
          color: var(--text-primary, #fff);
        }

        .nav-avatar-chevron {
          transition: transform 0.15s ease;
        }

        .nav-avatar-btn.open .nav-avatar-chevron {
          transform: rotate(180deg);
        }

        /* ── Dropdown ── */
        .nav-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 220px;
          background: rgba(15, 22, 36, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,212,255,0.06);
          overflow: hidden;
          z-index: 200;
          animation: dropdownFadeIn 0.12s ease;
        }

        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nav-dropdown-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .nav-dropdown-identity {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .nav-dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-dropdown-email {
          font-size: 11px;
          color: var(--text-muted, #64748b);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-dropdown-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 0;
        }

        .nav-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          background: none;
          border: none;
          color: var(--text-secondary, #94a3b8);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.12s ease;
          text-align: left;
        }

        .nav-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary, #fff);
          text-decoration: none;
        }

        .nav-dropdown-logout:hover {
          background: rgba(244, 63, 94, 0.1);
          color: #fda4af;
        }

        @media (max-width: 860px) {
          .nav-links {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};
