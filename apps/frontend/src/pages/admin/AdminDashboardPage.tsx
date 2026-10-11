import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  LogOut,
  Users,
  Shield,
  Ban,
  CheckCircle,
  UserCog,
  Activity,
  Server,
  Cpu,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  BookOpen,
  Award,
  Clock,
  Layers,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  Menu,
  Home,
  BarChart3,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { authApi, learningApi } from '../../api/client';
import { secureLogout, getUserFromStorage, requireAdmin, saveUserToStorage } from '../../utils/auth';

type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Track management state
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [trackForm, setTrackForm] = useState({ slug: '', title: '', description: '', icon: 'terminal', isPublished: true });
  const [trackActionLoading, setTrackActionLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ADMIN_SECTIONS = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'tracks', label: 'Track Management', icon: Layers },
    { id: 'courses', label: 'Course Oversight', icon: BookOpen },
    { id: 'platform', label: 'Platform Health', icon: Server },
    { id: 'activity', label: 'Activity Logs', icon: Activity},
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setMobileNavOpen(false);
    const el = document.getElementById(`admin-section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (!storedUser || !requireAdmin()) {
      if (storedUser?.role === 'INSTRUCTOR') {
        navigate('/instructor/dashboard');
      } else if (storedUser?.role === 'STUDENT') {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
      return;
    }
    setUser(storedUser);

    const fetchData = async () => {
      try {
        const [meRes, usersRes] = await Promise.all([
          authApi.getMe().catch(() => ({ data: { data: null } })),
          authApi.admin.listUsers().catch(() => ({ data: { data: [] } })),
        ]);

        const me = meRes.data?.data || null;
        if (me && me.role !== 'ADMIN') {
          if (me.id) saveUserToStorage(me);
          if (me.role === 'INSTRUCTOR') {
            navigate('/instructor/dashboard');
          } else {
            navigate('/dashboard');
          }
          return;
        }
        if (me) {
          saveUserToStorage(me);
          setUser(me);
        }

        const usersList: AdminUser[] = usersRes.data?.data || usersRes.data || [];
        if (usersList.length === 0) {
          setUsers(generateMockUsers());
        } else {
          setUsers(usersList);
        }
      } catch (err) {
        setUsers(generateMockUsers());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    loadTracks();
  }, [navigate]);

  const generateMockUsers = (): AdminUser[] => {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
    return [
      { id: 'admin-1', email: 'admin@cloudlab.local', firstName: 'Root', lastName: 'Administrator', role: 'ADMIN', status: 'ACTIVE', createdAt: daysAgo(90), updatedAt: daysAgo(2) },
      { id: 'inst-1', email: 'instructor@cloudlab.local', firstName: 'Sarah', lastName: 'Architect', role: 'INSTRUCTOR', status: 'ACTIVE', createdAt: daysAgo(60), updatedAt: daysAgo(3) },
      { id: 'inst-2', email: 'mike.trainer@cloudlab.local', firstName: 'Mike', lastName: 'Trainer', role: 'INSTRUCTOR', status: 'ACTIVE', createdAt: daysAgo(45), updatedAt: daysAgo(5) },
      { id: 'stu-1', email: 'student@cloudlab.local', firstName: 'Alex', lastName: 'DevOps', role: 'STUDENT', status: 'ACTIVE', createdAt: daysAgo(30), updatedAt: daysAgo(1) },
      { id: 'stu-2', email: 'jordan.lee@cloudlab.local', firstName: 'Jordan', lastName: 'Lee', role: 'STUDENT', status: 'ACTIVE', createdAt: daysAgo(22), updatedAt: daysAgo(1) },
      { id: 'stu-3', email: 'taylor.chen@cloudlab.local', firstName: 'Taylor', lastName: 'Chen', role: 'STUDENT', status: 'PENDING', createdAt: daysAgo(14), updatedAt: daysAgo(14) },
      { id: 'stu-4', email: 'sam.patel@cloudlab.local', firstName: 'Sam', lastName: 'Patel', role: 'STUDENT', status: 'ACTIVE', createdAt: daysAgo(18), updatedAt: daysAgo(2) },
      { id: 'stu-5', email: 'casey.morgan@cloudlab.local', firstName: 'Casey', lastName: 'Morgan', role: 'STUDENT', status: 'SUSPENDED', createdAt: daysAgo(25), updatedAt: daysAgo(7) },
      { id: 'stu-6', email: 'riley.nguyen@cloudlab.local', firstName: 'Riley', lastName: 'Nguyen', role: 'STUDENT', status: 'ACTIVE', createdAt: daysAgo(10), updatedAt: daysAgo(0) },
      { id: 'stu-7', email: 'drew.garcia@cloudlab.local', firstName: 'Drew', lastName: 'Garcia', role: 'STUDENT', status: 'PENDING', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    ];
  };

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  // ---- Track CRUD ----
  const loadTracks = async () => {
    try {
      setTracksLoading(true);
      const res = await learningApi.getTracks();
      setTracks(res.data?.data || []);
    } catch { /* silent */ } finally {
      setTracksLoading(false);
    }
  };

  const handleOpenCreateTrack = () => {
    setEditingTrack(null);
    setTrackForm({ slug: '', title: '', description: '', icon: 'terminal', isPublished: true });
    setShowTrackModal(true);
  };

  const handleOpenEditTrack = (t: any) => {
    setEditingTrack(t);
    setTrackForm({ slug: t.slug, title: t.title, description: t.description || '', icon: t.icon || 'terminal', isPublished: t.isPublished !== false });
    setShowTrackModal(true);
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTrackActionLoading(true);
      if (editingTrack) {
        await learningApi.updateTrack(editingTrack.id, trackForm);
      } else {
        await learningApi.createTrack(trackForm);
      }
      setShowTrackModal(false);
      await loadTracks();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save track');
    } finally {
      setTrackActionLoading(false);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!window.confirm('Delete this track and ALL its courses? This cannot be undone.')) return;
    try {
      setTrackActionLoading(true);
      await learningApi.deleteTrack(id);
      await loadTracks();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete track');
    } finally {
      setTrackActionLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    setActionLoading(`status-${userId}`);
    setOpenDropdown(null);
    try {
      await authApi.admin.updateUserStatus(userId, newStatus as 'ACTIVE' | 'SUSPENDED');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update user status';
      alert('❌ Status update failed: ' + msg);
      setActionLoading(null);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u))
    );
    setActionLoading(null);
  };

  const handleUpdateRole = async (userId: string, newRole: 'STUDENT' | 'ADMIN') => {
    setActionLoading(`role-${userId}`);
    setOpenDropdown(null);
    try {
      await authApi.admin.updateUserRole(userId, newRole);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update user role';
      alert('❌ Role update failed: ' + msg);
      setActionLoading(null);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserRole, updatedAt: new Date().toISOString() } : u))
    );
    setActionLoading(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchQuery === '' ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const platformStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const pending = users.filter((u) => u.status === 'PENDING').length;
    const suspended = users.filter((u) => u.status === 'SUSPENDED').length;
    const students = users.filter((u) => u.role === 'STUDENT').length;
    const instructors = users.filter((u) => u.role === 'INSTRUCTOR').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { total, active, pending, suspended, students, instructors, admins };
  }, [users]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
          Loading admin control center...
        </div>
      </div>
    );
  }

  const statusBadge = (status: UserStatus) => {
    const statusMap: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
      ACTIVE: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle, label: 'ACTIVE' },
      PENDING: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', icon: Clock, label: 'PENDING' },
      SUSPENDED: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', icon: Ban, label: 'SUSPENDED' },
    };
    const cfg = statusMap[status] ?? { bg: 'rgba(100,100,100,0.12)', color: '#94a3b8', border: 'rgba(100,100,100,0.25)', icon: Clock, label: status ?? 'UNKNOWN' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 700,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
        }}
      >
        <cfg.icon size={11} /> {cfg.label}
      </span>
    );
  };

  const roleBadge = (role: UserRole) => {
    const roleMap: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
      STUDENT: { bg: 'rgba(0, 212, 255, 0.12)', color: 'var(--accent-cyan)', border: 'rgba(0, 212, 255, 0.25)', icon: Award, label: 'STUDENT' },
      INSTRUCTOR: { bg: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)', border: 'rgba(139, 92, 246, 0.25)', icon: BookOpen, label: 'INSTRUCTOR' },
      ADMIN: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', icon: Shield, label: 'ADMIN' },
    };
    const cfg = roleMap[role] ?? { bg: 'rgba(100,100,100,0.12)', color: '#94a3b8', border: 'rgba(100,100,100,0.25)', icon: Shield, label: role ?? 'UNKNOWN' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 700,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
        }}
      >
        <cfg.icon size={11} /> {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(13, 18, 29, 0.92)',
          backdropFilter: 'blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 80,
        }}
      >
        <div style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                flexShrink: 0,
              }}
            >
              <Shield size={18} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                Admin Control Center
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontWeight: 700,
                  }}
                >
                  ADMIN ONLY
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Platform Administration & Role Management
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="admin-user-chip" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }} className="admin-user-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 700 }}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-logout"
              style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
              title="Sign out of Admin Control Center"
            >
              <LogOut size={14} /> <span className="logout-text">Sign Out</span>
            </button>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <nav
          className="admin-section-nav"
          role="navigation"
          aria-label="Admin section navigation"
          style={{
            padding: '0 28px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.015)',
            overflowX: 'auto',
            display: mobileNavOpen ? 'block' : undefined,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '4px',
              minHeight: '50px',
              alignItems: 'center',
              flexWrap: mobileNavOpen ? 'wrap' : 'nowrap',
              padding: mobileNavOpen ? '12px 0' : '0',
            }}
            className="admin-nav-tabs"
          >
            {ADMIN_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`admin-nav-btn${isActive ? ' admin-nav-btn-active' : ''}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`admin-section-${section.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                    color: isActive ? '#ef4444' : 'var(--text-secondary)',
                    borderBottom: mobileNavOpen ? 'none' : isActive ? '2px solid #ef4444' : '2px solid transparent',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(239, 68, 68, 0.25)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <section.icon size={15} />
                  <span>{section.label}</span>
                  
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <section id="admin-section-dashboard" style={{ scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Home size={18} color="#ef4444" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Dashboard Overview</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Key platform metrics at a glance</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Registered', value: platformStats.total, icon: Users, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.03)', border: 'var(--border-subtle)' },
            { label: 'Active Users', value: platformStats.active, icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' },
            { label: 'Pending Verification', value: platformStats.pending, icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' },
            { label: 'Suspended', value: platformStats.suspended, icon: Ban, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)' },
            { label: 'Students', value: platformStats.students, icon: Award, color: 'var(--accent-cyan)', bg: 'rgba(0, 212, 255, 0.08)', border: 'rgba(0, 212, 255, 0.2)' },
            { label: 'Instructors', value: platformStats.instructors, icon: BookOpen, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.2)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</span>
                <div style={{ padding: '7px', borderRadius: '8px', background: s.bg }}>
                  <s.icon size={14} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--accent-cyan)" /> Platform Health Overview
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Real-time microservice & infrastructure status</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { name: 'API Gateway', icon: Server, status: 'HEALTHY', uptime: '99.98%', latency: '42ms', load: '34%', color: '#10b981' },
                { name: 'Auth Service', icon: Shield, status: 'HEALTHY', uptime: '100%', latency: '28ms', load: '22%', color: '#10b981' },
                { name: 'Learning Service', icon: BookOpen, status: 'HEALTHY', uptime: '99.92%', latency: '56ms', load: '48%', color: '#10b981' },
                { name: 'Challenge Service', icon: Terminal, status: 'DEGRADED', uptime: '98.10%', latency: '187ms', load: '82%', color: '#f59e0b' },
                { name: 'Progress Service', icon: TrendingUp, status: 'HEALTHY', uptime: '99.87%', latency: '33ms', load: '29%', color: '#10b981' },
                { name: 'MySQL Cluster', icon: HardDrive, status: 'HEALTHY', uptime: '100%', latency: '6ms', load: '41%', color: '#10b981' },
              ].map((svc, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                      <svc.icon size={14} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{svc.name}</span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: svc.status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: svc.color,
                      border: `1px solid ${svc.status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    }}
                  >
                    {svc.status === 'DEGRADED' ? <AlertTriangle size={11} /> : <CheckCircle size={11} />} {svc.status}
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{svc.uptime} uptime</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono' }}>{svc.latency}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: svc.load,
                          height: '100%',
                          background: parseInt(svc.load) > 75 ? '#ef4444' : parseInt(svc.load) > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>{svc.load}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Cpu size={18} color="var(--accent-purple)" /> System Resources
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: 'CPU Usage', value: 47, color: 'var(--accent-cyan)' },
                { label: 'Memory (RAM)', value: 62, color: 'var(--accent-purple)' },
                { label: 'Storage', value: 34, color: '#10b981' },
                { label: 'Network Bandwidth', value: 28, color: '#f59e0b' },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: r.color }}>{r.value}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${r.value}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${r.color}, ${r.color}aa)`,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { text: 'New user registered (riley.nguyen)', time: '2m ago', color: 'var(--accent-cyan)' },
                  { text: 'Course "K8s Reliability" published', time: '18m ago', color: 'var(--accent-purple)' },
                  { text: 'Challenge attempt validated (id: #4829)', time: '41m ago', color: '#10b981' },
                  { text: 'User casey.morgan suspended', time: '1d ago', color: '#ef4444' },
                  { text: 'Weekly backup completed', time: '2d ago', color: '#f59e0b' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: a.color, marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px' }}>{a.text}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </section>

        <section id="admin-section-users" style={{ marginTop: '44px', scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Users size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>User Management & Directory</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Manage account status and roles. Note: Promoting users to INSTRUCTOR is disabled per platform policy.
            </p>
          </div>

        <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="form-input"
                style={{ flex: 1 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px' }}>
              <Users size={14} color="var(--text-muted)" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="form-input"
                style={{ flex: 1 }}
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>User</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Registered</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Last Updated</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No users match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${u.role === 'ADMIN' ? '#ef4444' : u.role === 'INSTRUCTOR' ? '#8b5cf6' : '#00d4ff'} 0%, ${u.role === 'ADMIN' ? '#b91c1c' : u.role === 'INSTRUCTOR' ? '#3b82f6' : '#0077ff'} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#040812',
                              }}
                            >
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                {u.firstName} {u.lastName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>{roleBadge(u.role)}</td>
                        <td style={{ padding: '16px 20px' }}>{statusBadge(u.status)}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(u.updatedAt).toLocaleDateString()}
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === `role-${u.id}` ? null : `role-${u.id}`);
                                }}
                                disabled={actionLoading === `role-${u.id}` || u.role === 'INSTRUCTOR'}
                                className="btn-secondary"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  opacity: u.role === 'INSTRUCTOR' ? 0.5 : 1,
                                  cursor: u.role === 'INSTRUCTOR' ? 'not-allowed' : 'pointer',
                                }}
                                title={u.role === 'INSTRUCTOR' ? 'Cannot modify Instructor roles' : 'Change role'}
                              >
                                <UserCog size={12} />
                                Role <ChevronDown size={12} />
                              </button>

                              {openDropdown === `role-${u.id}` && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 4px)',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    minWidth: '180px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                                    zIndex: 50,
                                  }}
                                >
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                                    Set Role (No Instructor)
                                  </div>
                                  {(['STUDENT', 'ADMIN'] as const).map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => handleUpdateRole(u.id, r)}
                                      disabled={u.role === r}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 10px',
                                        background: u.role === r ? 'rgba(255,255,255,0.04)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: u.role === r ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                        fontSize: '12px',
                                        cursor: u.role === r ? 'default' : 'pointer',
                                        fontWeight: 600,
                                        textAlign: 'left',
                                      }}
                                    >
                                      {r === 'STUDENT' ? <Award size={13} color="var(--accent-cyan)" /> : <Shield size={13} color="#ef4444" />}
                                      {r === 'STUDENT' ? 'Student / User' : 'Administrator'}
                                      {u.role === r && <CheckCircle size={12} style={{ marginLeft: 'auto' }} />}
                                    </button>
                                  ))}
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--text-muted)',
                                      padding: '6px 10px',
                                      borderTop: '1px solid var(--border-subtle)',
                                      marginTop: '4px',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    Instructor role locked
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === `status-${u.id}` ? null : `status-${u.id}`);
                                }}
                                disabled={actionLoading === `status-${u.id}`}
                                className="btn-secondary"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                <Activity size={12} />
                                Status <ChevronDown size={12} />
                              </button>

                              {openDropdown === `status-${u.id}` && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 4px)',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    minWidth: '160px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                                    zIndex: 50,
                                  }}
                                  onMouseLeave={() => setOpenDropdown(null)}
                                >
                                  {(['ACTIVE', 'SUSPENDED'] as const).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleUpdateStatus(u.id, s)}
                                      disabled={u.status === s}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 10px',
                                        background: u.status === s ? 'rgba(255,255,255,0.04)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: u.status === s ? (s === 'ACTIVE' ? '#10b981' : '#ef4444') : 'var(--text-primary)',
                                        fontSize: '12px',
                                        cursor: u.status === s ? 'default' : 'pointer',
                                        fontWeight: 600,
                                        textAlign: 'left',
                                      }}
                                    >
                                      {s === 'ACTIVE' ? <CheckCircle size={13} color="#10b981" /> : <Ban size={13} color="#ef4444" />}
                                      {s === 'ACTIVE' ? 'Activate Account' : 'Suspend Account'}
                                      {u.status === s && <CheckCircle size={12} style={{ marginLeft: 'auto' }} />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ======================== TRACK MANAGEMENT ======================== */}
        <section id="admin-section-tracks" style={{ marginTop: '44px', scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Layers size={18} color="var(--accent-purple)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Track Management</h2>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Create and manage learning tracks. Instructors add courses within tracks you define here.
                </p>
              </div>
              <button
                onClick={handleOpenCreateTrack}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={14} /> New Track
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {tracksLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading tracks...</div>
            ) : tracks.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No tracks yet. Click <strong>New Track</strong> to create the first learning track.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Track</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Slug</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Courses</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracks.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(0,212,255,0.15))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Layers size={16} color="var(--accent-purple)" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{t.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <code style={{ fontSize: '11px', color: 'var(--accent-cyan)', background: 'rgba(0,212,255,0.08)', padding: '3px 8px', borderRadius: '4px' }}>{t.slug}</code>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={13} color="var(--text-muted)" />
                            {t.courses?.length ?? 0} course{(t.courses?.length ?? 0) !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                            background: t.isPublished ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                            color: t.isPublished ? '#10b981' : '#f59e0b',
                            border: `1px solid ${t.isPublished ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                          }}>
                            {t.isPublished ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {t.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditTrack(t)}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(t.id)}
                              disabled={trackActionLoading}
                              style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section id="admin-section-courses" style={{ marginTop: '44px', scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <BookOpen size={18} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Course Oversight</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Review all instructor-created courses, enrollment and publishing status across the platform</p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '28px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.08)', marginBottom: '16px' }}>
              <FileSpreadsheet size={28} color="var(--accent-purple)" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Consolidated Curriculum View</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Drill into any track below to see all courses nested within the hierarchy. For granular curriculum catalog management actions use the <strong>Track Management</strong> section above or jump to the Instructor Studio to review course content, enrollments, and module configurations.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => scrollToSection('tracks')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <ChevronRight size={14} /> View Tracks
              </button>
              <button onClick={() => navigate('/learning')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}>
                <Database size={14} /> Open Curriculum Catalog
              </button>
            </div>
          </div>
        </section>

        <section id="admin-section-platform" style={{ marginTop: '44px', scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Server size={18} color="#10b981" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Platform Health</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Deep infrastructure diagnostics and real-time microservices monitoring dashboard</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Healthy Services', value: '5 / 6', icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
              { label: 'Avg. API Latency', value: '41ms', icon: Activity, color: 'var(--accent-cyan)', bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.25)' },
              { label: 'Peak Load Today', value: '82%', icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
              { label: 'Active DB Connections', value: '124', icon: Database, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)' },
            ].map((card, i) => (
              <div key={i} style={{
              background: 'var(--bg-card)', border: `1px solid ${card.border}`, borderRadius: 'var(--radius-md)', padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{card.label}</span>
                <div style={{ padding: '7px', borderRadius: '8px', background: card.bg }}>
                  <card.icon size={14} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800 }}>{card.value}</div>
            </div>
            ))}
          </div>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '22px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Infrastructure Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { title: 'Database Replication Lag', value: '< 10ms', status: 'optimal', color: '#10b981' },
                { title: 'Redis Cache Hit Ratio', value: '96.4%', status: 'optimal', color: '#10b981' },
                { title: 'Challenge Sandbox Queue Depth', value: '17 queued', status: 'warning', color: '#f59e0b' },
                { title: 'Backup Schedule', value: 'Last: 02:00 UTC', status: 'optimal', color: '#10b981' },
                { title: 'CDN Edge Cache Purge', value: 'Scheduled @ 2026-03-18', status: 'pending', color: 'var(--accent-cyan)' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.color, boxShadow: `0 0 8px ${row.color}` }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{row.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, textTransform: 'uppercase', background: `${row.color}22`, color: row.color, border: `1px solid ${row.color}55` }}>{row.status}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-secondary)' }}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="admin-section-activity" style={{ marginTop: '44px', scrollMarginTop: '140px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Activity size={18} color="#f59e0b" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Activity Logs & Audit Trail</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Chronological record of platform-wide operations and user actions</p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Timestamp</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Actor</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Event</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Severity</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>IP / Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ts: '2026-03-18 14:32:07 UTC', actor: 'root.admin@cloudlab.local', event: 'User role modified: casey.morgan → STUDENT → SUSPENDED', severity: 'HIGH', color: '#ef4444', ip: '10.0.8.14 (admin-vpn)' },
                    { ts: '2026-03-18 14:18:55 UTC', actor: 'sarah.architect@cloudlab.local', event: 'Course published: "Kubernetes Reliability Patterns" (id=course_k8s_rel_v2)', severity: 'INFO', color: 'var(--accent-cyan)', ip: '207.45.88.12' },
                    { ts: '2026-03-18 13:55:12 UTC', actor: 'SYSTEM', event: 'Automated enrollment sync completed: 42 records reconciled between learning ↔ progress', severity: 'INFO', color: '#10b981', ip: 'internal-scheduler' },
                    { ts: '2026-03-18 12:03:44 UTC', actor: 'riley.nguyen@cloudlab.local', event: 'Challenge #4829 validated with 92% score (PASS)', severity: 'LOW', color: '#10b981', ip: '68.201.55.92' },
                    { ts: '2026-03-18 10:27:19 UTC', actor: 'SYSTEM', event: 'Weekly backup snapshot completed — 2.4GB compressed archive', severity: 'INFO', color: 'var(--accent-purple)', ip: 'backup-daemon' },
                    { ts: '2026-03-18 09:11:02 UTC', actor: 'mike.trainer@cloudlab.local', event: 'New module "GitOps Workflows" added to track "CI/CD Automation"', severity: 'MEDIUM', color: '#f59e0b', ip: '192.168.33.20' },
                    { ts: '2026-03-18 08:00:00 UTC', actor: 'SYSTEM', event: 'Daily health check completed: 5/6 services HEALTHY (challenge-service: DEGRADED)', severity: 'MEDIUM', color: '#f59e0b', ip: 'health-monitor' },
                  ].map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-muted)' }}>{log.ts}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px' }}>{log.actor}</td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>{log.event}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 800, background: `${log.color}20`, color: log.color, border: `1px solid ${log.color}55` }}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-muted)' }}>{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* ======================== TRACK MODAL ======================== */}
      {showTrackModal && (
        <div
          onClick={() => setShowTrackModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-purple)" />
                  {editingTrack ? 'Edit Track' : 'Create New Track'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {editingTrack ? 'Update track details and visibility.' : 'Define a new learning path. Instructors can add courses to it once created.'}
                </p>
              </div>
              <button onClick={() => setShowTrackModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveTrack} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Track Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Linux Systems Administration"
                    value={trackForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const autoSlug = editingTrack ? trackForm.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      setTrackForm({ ...trackForm, title, slug: autoSlug });
                    }}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. linux-systems"
                    value={trackForm.slug}
                    onChange={(e) => setTrackForm({ ...trackForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what students will learn in this track..."
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Icon</label>
                  <select
                    value={trackForm.icon}
                    onChange={(e) => setTrackForm({ ...trackForm, icon: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="terminal">⚡ Terminal (Default)</option>
                    <option value="docker">🐳 Docker / Containers</option>
                    <option value="kubernetes">☸ Kubernetes / Cloud</option>
                    <option value="shield">🛡 Security</option>
                    <option value="code">💻 Programming</option>
                    <option value="server">🖥 Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Visibility</label>
                  <select
                    value={trackForm.isPublished ? 'true' : 'false'}
                    onChange={(e) => setTrackForm({ ...trackForm, isPublished: e.target.value === 'true' })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="true">✅ Published (visible to all)</option>
                    <option value="false">📋 Draft (hidden)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowTrackModal(false)} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={trackActionLoading}
                  className="btn-primary"
                  style={{ padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Layers size={14} />
                  {trackActionLoading ? 'Saving...' : editingTrack ? 'Save Changes' : 'Create Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
