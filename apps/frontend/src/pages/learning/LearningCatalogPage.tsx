import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  BookOpen,
  ArrowRight,
  Plus,
  Clock,
  Layers,
  Sparkles,
  Search,
  Server,
  Cloud,
  X,
  Edit,
  Trash2,
  LogOut,
} from 'lucide-react';
import { learningApi } from '../../api/client';
import { secureLogout, getUserRole, getAccessToken } from '../../utils/auth';

export const LearningCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Instructor/Admin modal states
  const [userRole, setUserRole] = useState<string>('STUDENT');
  const [showModal, setShowModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [formSlug, setFormSlug] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('terminal');

  useEffect(() => {
    if (!getAccessToken()) {
      navigate('/login');
      return;
    }
    setUserRole(getUserRole());
    loadTracks();
  }, [navigate]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const [tracksRes, coursesRes] = await Promise.all([
        learningApi.getTracks(),
        learningApi.getAllCourses()
      ]);
      setTracks(tracksRes.data?.data || []);
      setCourses(coursesRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load tracks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTrack(null);
    setFormSlug('');
    setFormTitle('');
    setFormDesc('');
    setFormIcon('terminal');
    setShowModal(true);
  };

  const handleOpenEdit = (track: any) => {
    setEditingTrack(track);
    setFormSlug(track.slug);
    setFormTitle(track.title);
    setFormDesc(track.description || '');
    setFormIcon(track.icon || 'terminal');
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this track and all its courses?')) return;
    try {
      await learningApi.deleteTrack(id);
      await loadTracks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete track');
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTrack) {
        await learningApi.updateTrack(editingTrack.id, {
          slug: formSlug,
          title: formTitle,
          description: formDesc,
          icon: formIcon,
        });
      } else {
        await learningApi.createTrack({
          slug: formSlug,
          title: formTitle,
          description: formDesc,
          icon: formIcon,
        });
      }
      setShowModal(false);
      await loadTracks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save track');
    }
  };

  const getTrackIcon = (icon: string) => {
    switch (icon) {
      case 'docker':
        return <Server size={24} color="#00d4ff" />;
      case 'kubernetes':
        return <Cloud size={24} color="#8b5cf6" />;
      case 'terminal':
      default:
        return <Terminal size={24} color="#10b981" />;
    }
  };

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const isAuthor = userRole === 'INSTRUCTOR' || userRole === 'ADMIN';

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Navbar Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(13, 18, 29, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
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
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Cloud<span style={{ color: 'var(--accent-cyan)' }}>Lab</span>
            </span>
          </Link>
          <span style={{ color: 'var(--border-subtle)' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Curriculum & Tracks</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {isAuthor && (
            <>
              <Link
                to="/instructor/dashboard"
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderColor: '#8b5cf6' }}
              >
                <BookOpen size={15} /> Instructor Studio
              </Link>
            </>
          )}

          <Link to="/dashboard" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            Home
          </Link>
          <button type="button" onClick={handleLogout} className="btn-logout" title="Log out">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Hero Section */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
            <Sparkles size={14} /> Production Engineering Catalog
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.5px' }}>
            DevOps & Cloud Curriculum
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '700px', lineHeight: 1.6 }}>
            Master real-world infrastructure through curated paths. Complete theory readings, inspect architecture patterns, and validate your knowledge with rigorous scenario assessments.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tracks, systems, or tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', height: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredCourses.length} Course{filteredCourses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>



        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono' }}>
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>No courses found</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => {
                  navigate(`/learning/courses/${course.slug}`);
                }}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 212, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
                    {course.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                    {course.summary || 'No summary available.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: 'var(--accent-purple)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    {course.difficultyLevel || 'BEGINNER'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 600 }}>
                    View Course <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Author/Instructor Modal for Create/Update Track */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingTrack ? 'Edit Learning Track' : 'Create New Track'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTrack}>
              <div className="form-group">
                <label className="form-label">Track Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CI/CD & GitOps Automation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug (URL Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cicd-gitops-automation"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief summary of skills taught..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '14px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Icon Concept</label>
                <select
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                >
                  <option value="terminal">Terminal / Linux</option>
                  <option value="docker">Docker / Containers</option>
                  <option value="kubernetes">Kubernetes / Cloud</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingTrack ? 'Save Changes' : 'Create Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
