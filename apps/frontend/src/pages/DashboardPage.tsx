import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  PlayCircle,
  Search,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Star,
  Users,
  Layers,
  Flame,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { authApi, learningApi, progressApi, challengeApi } from '../api/client';
import { secureLogout, getAccessToken } from '../utils/auth';
import { Navbar } from '../components/Navbar';

const COURSE_COVERS = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80',
];

const TEACHERS = [
  { name: 'Amelia Brooks', role: 'Kubernetes Lead', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
  { name: 'Michael Carter', role: 'Linux Systems', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd722bf5d?auto=format&fit=crop&w=400&q=80' },
  { name: 'Jenny Wilson', role: 'SRE Coach', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
  { name: 'James Russell', role: 'Cloud Architect', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80' },
];

const REVIEWS = [
  { name: 'Martha Redmond', text: 'The Kubernetes track finally made production incidents click. Labs feel like real on-call work.', rating: 5 },
  { name: 'Robert J. Connelly', text: 'Clear lessons, no fluff. I shipped my first Helm chart after two weeks.', rating: 5 },
  { name: 'David Allan Ross', text: 'Dark workspace plus real sandboxes — this is how DevOps should be taught.', rating: 5 },
  { name: 'Lena Ortiz', text: 'Progress tracking kept me honest. The syllabus is tight and practical.', rating: 4 },
  { name: 'Kai Park', text: 'Instructors write like senior engineers, not textbook authors.', rating: 5 },
  { name: 'Nova Chen', text: 'Challenges are tough in a good way. Validation is deterministic and fair.', rating: 5 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [coursePage, setCoursePage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchAll = async () => {
      try {
        const meRes = await authApi.getMe();
        const me = meRes.data?.data || null;
        setUser(me);

        if (me?.role === 'ADMIN') {
          navigate('/admin/dashboard');
          return;
        }
        if (me?.role === 'INSTRUCTOR') {
          navigate('/instructor/dashboard');
          return;
        }

        const [tracksRes, coursesRes, enrollRes, chalRes, profRes] = await Promise.all([
          learningApi.getTracks().catch(() => ({ data: { data: [] } })),
          learningApi.getAllCourses('STUDENT').catch(() => ({ data: { data: [] } })),
          learningApi.getMyEnrollments().catch(() => ({ data: { data: [] } })),
          challengeApi.getChallenges().catch(() => ({ data: { data: [] } })),
          progressApi.getMyProfile().catch(() => ({ data: { data: null } })),
        ]);

        setTracks(tracksRes.data?.data || tracksRes.data || []);
        setAllCourses(coursesRes.data?.data || coursesRes.data || []);
        setEnrollments(enrollRes.data?.data || enrollRes.data || []);
        setChallenges(chalRes.data?.data || chalRes.data || []);
        setProfile(profRes.data?.data || profRes.data || null);
      } catch (err) {
        await secureLogout(navigate);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [navigate]);

  const handleLogout = async () => {
    await secureLogout(navigate);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const trackById: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = {};
    tracks.forEach((t: any) => {
      map[t.id] = t;
    });
    return map;
  }, [tracks]);

  const courses = useMemo(() => {
    const courseMap: Record<string, any> = {};
    tracks.forEach((t: any) => {
      (t.courses || []).forEach((c: any) => {
        courseMap[c.id] = { ...c, trackTitle: t.title, trackSlug: t.slug };
      });
    });
    allCourses.forEach((c: any) => {
      if (!c?.id) return;
      courseMap[c.id] = {
        ...courseMap[c.id],
        ...c,
        trackTitle: c.trackTitle || trackById[c.trackId]?.title || 'CloudLab Curriculum',
        trackSlug: c.trackSlug || trackById[c.trackId]?.slug,
        difficultyLevel: c.difficultyLevel || c.difficulty_level || 'BEGINNER',
        enrolledStudentsCount: c.enrolledStudentsCount ?? c.enrolled_students_count ?? 0,
        totalLessons: c.totalLessons ?? c.total_lessons ?? 0,
        estimatedHours: c.estimatedHours ?? c.estimated_hours ?? 4,
      };
    });
    const list = Object.values(courseMap);
    if (list.length > 0) return list;
    return [
      { id: 'k1', title: 'Production Kubernetes Reliability', trackTitle: 'Kubernetes Engineering', difficultyLevel: 'INTERMEDIATE', enrolledStudentsCount: 184, totalLessons: 24, estimatedHours: 18, summary: 'Operate clusters the way production SREs do.' },
      { id: 'l1', title: 'Linux Kernel Diagnostics & Perf', trackTitle: 'Linux Systems Mastery', difficultyLevel: 'ADVANCED', enrolledStudentsCount: 96, totalLessons: 18, estimatedHours: 16, summary: 'Trace, profile, and fix real Linux failures.' },
      { id: 'd1', title: 'Container Runtime Deep Dive', trackTitle: 'Docker & Containerization', difficultyLevel: 'BEGINNER', enrolledStudentsCount: 312, totalLessons: 15, estimatedHours: 10, summary: 'Build, ship, and debug containers with confidence.' },
    ];
  }, [tracks, allCourses, trackById]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c: any) =>
        c.title?.toLowerCase().includes(q) ||
        c.trackTitle?.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q),
    );
  }, [courses, searchQuery]);

  const pageSize = 3;
  const maxPage = Math.max(0, Math.ceil(filteredCourses.length / pageSize) - 1);
  const pagedCourses = filteredCourses.slice(coursePage * pageSize, coursePage * pageSize + pageSize);

  useEffect(() => {
    setCoursePage(0);
  }, [searchQuery]);

  const labList =
    challenges.length > 0
      ? challenges
      : [
        { id: 'c1', title: 'CrashLoopBackOff Triage', category: 'Kubernetes', difficulty: 'INTERMEDIATE', xpReward: 250 },
        { id: 'c2', title: 'Docker Bridge Network Fix', category: 'Docker', difficulty: 'BEGINNER', xpReward: 120 },
        { id: 'c3', title: 'Nginx Ingress Controller 502s', category: 'Kubernetes', difficulty: 'ADVANCED', xpReward: 400 },
      ];

  const enrolledCount = enrollments.length;
  const totalLearners = courses.reduce((acc: number, c: any) => acc + (c.enrolledStudentsCount || 0), 0) || 15256;
  const totalLessons = courses.reduce((acc: number, c: any) => acc + (c.totalLessons || 0), 0) || 506;
  const years = 8;

  const openCourse = async (course: any, enrollFirst: boolean) => {
    try {
      const isEnrolled = enrollments.some((e: any) => e.courseId === course.id);
      if (enrollFirst && !isEnrolled && course.id) {
        try {
          await learningApi.enrollCourse(course.id);
          const res = await learningApi.getMyEnrollments();
          setEnrollments(res.data?.data || res.data || []);
        } catch {
          /* mock catalog ids or already enrolled */
        }
      }
      if (course.slug) navigate(`/learning/courses/${course.slug}`);
      else navigate('/learning');
    } catch {
      navigate('/learning');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>Loading campus...</div>
      </div>
    );
  }

  return (
    <div className="student-home">
      <div className="student-topbar">
        New members get their first 7 days of CloudLab Premium for free. Unlock labs today.
      </div>

      <Navbar currentPage="home" />

      <section id="home" className="student-hero">
        <div className="student-hero-copy">
          <p className="student-kicker">All the best platform</p>
          <h1>
            Best Online Courses
            <br />
            &amp; Upgrade Your Skills
          </h1>
          <p className="student-hero-lead">
            Choose from hands-on DevOps paths published every month. Real clusters, real Linux, no toy labs. Pick up where you left off, {user?.firstName}.
          </p>
          <div className="student-hero-cta">
            <button type="button" className="btn-primary student-cta" onClick={() => navigate('/learning')}>
              Explore All Classes <ArrowRight size={16} />
            </button>

          </div>
        </div>

        <div className="student-hero-collage" aria-hidden="true">
          <div className="hero-orb hero-orb-a" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80)' }} />
          <div className="hero-orb hero-orb-b" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=500&q=80)' }} />
          <div className="hero-orb hero-orb-c" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80)' }} />
        </div>
      </section>

      <section id="about" className="student-section student-about">
        <div className="about-media">
          <div className="about-badge">
            <strong>{years} Years</strong>
            Of Experience
          </div>
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
            alt="Engineers studying together"
          />
          <div className="about-stat-chip">
            <Users size={18} />
            <div>
              <strong>{totalLearners.toLocaleString()}+</strong>
              <span>Active learners</span>
            </div>
          </div>
        </div>
        <div>
          <p className="student-kicker">About CloudLab</p>
          <h2>A new different way to improve your skills.</h2>
          <p className="student-muted">
            Education here is a private on-call simulation. You read production-grade lessons, then prove the skill in a live sandbox — the same way senior engineers actually learn.
          </p>
          <div className="about-cards">
            <article>
              <Briefcase size={22} color="var(--accent-cyan)" />
              <h3>Build your career</h3>
              <p>Online courses you can finish anywhere, anytime.</p>
            </article>
            <article>
              <TrendingUp size={22} color="var(--accent-purple)" />
              <h3>Grow your skills</h3>
              <p>Incident labs that score your real terminal work.</p>
            </article>
          </div>
          <button type="button" className="text-link" onClick={() => scrollTo('courses')}>
            Explore more <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section id="courses" className="student-section">
        <div className="section-head">
          <div>
            <p className="student-kicker">Top course</p>
            <h2>Our featured courses</h2>
          </div>
          <div className="section-head-actions">
            <label className="student-search-field">
              <Search size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
              />
            </label>
            <button type="button" className="icon-round" onClick={() => setCoursePage((p) => Math.max(0, p - 1))} disabled={coursePage === 0}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="icon-round" onClick={() => setCoursePage((p) => Math.min(maxPage, p + 1))} disabled={coursePage >= maxPage}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="course-grid">
          {pagedCourses.length === 0 && <p className="student-muted">No courses match that search. Try another keyword.</p>}
          {pagedCourses.map((course: any, idx: number) => {
            const isEnrolled = enrollments.some((e: any) => e.courseId === course.id);
            const cover = COURSE_COVERS[(coursePage * pageSize + idx) % COURSE_COVERS.length];
            return (
              <article key={course.id} className="course-card">
                <div className="course-cover" style={{ backgroundImage: `url(${cover})` }}>
                  <span className="course-price">${course.estimatedHours ? course.estimatedHours * 25 : 450}</span>
                </div>
                <div className="course-body">
                  <p className="course-track">{course.trackTitle}</p>
                  <h3>{course.title}</h3>
                  <p>{course.summary || 'Hands-on curriculum with lessons, quizzes, and attached labs.'}</p>
                  <div className="course-meta">
                    <span>{course.totalLessons || 12} lessons</span>
                    <span>{course.difficultyLevel}</span>
                    {isEnrolled && <span className="enrolled-pill">Enrolled</span>}
                  </div>
                  <button type="button" className="btn-primary student-cta" onClick={() => openCourse(course, true)}>
                    <PlayCircle size={15} /> {isEnrolled ? 'Resume' : 'Enroll'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="tracks" className="student-section student-tracks">
        <p className="student-kicker" style={{ textAlign: 'center' }}>Browse by path</p>
        <h2 style={{ textAlign: 'center' }}>Explore our top categories</h2>
        <div className="track-pills">
          {(tracks.length > 0 ? tracks : [{ id: 't1', title: 'Linux Systems', description: 'Kernel, perf, networking' }, { id: 't2', title: 'Containers', description: 'Docker & runtimes' }, { id: 't3', title: 'Kubernetes', description: 'Clusters & reliability' }, { id: 't4', title: 'SRE Practice', description: 'Incidents & on-call' }]).map((t: any) => (
            <button
              key={t.id}
              type="button"
              className="track-pill"
              onClick={() => navigate('/learning')}
            >
              <span className="track-pill-icon">
                <Layers size={18} />
              </span>
              <strong>{t.title}</strong>
              <span>{t.description || 'Open this learning path'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="student-stats" aria-label="Platform stats">
        <div>
          <strong>{totalLearners.toLocaleString()}+</strong>
          <span>Learners</span>
        </div>
        <div>
          <strong>{totalLessons}+</strong>
          <span>Lessons</span>
        </div>
        <div>
          <strong>{courses.length || 152}+</strong>
          <span>Courses</span>
        </div>
        <div>
          <strong>{enrolledCount || 1}</strong>
          <span>Your enrollments</span>
        </div>
      </section>
      <footer id="contact" className="student-footer">
        <div className="footer-grid">
          <div>
            <div className="student-brand" style={{ marginBottom: 12 }}>
              <span className="student-brand-mark">
                <GraduationCap size={16} color="#040812" />
              </span>
              Cloud<span>Lab</span>
            </div>
            <p>Hands-on DevOps campus for engineers who want production skills, not slide decks.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <button type="button" onClick={() => navigate('/learning')}>Catalog</button>
            <button type="button" onClick={() => scrollTo('labs')}>Labs</button>
            <button type="button" onClick={() => scrollTo('courses')}>Courses</button>
          </div>
          <div>
            <h4>Account</h4>
            <span>{user?.email}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
          <div>
            <h4>Get in touch</h4>
            <p className="footer-mail">
              <Mail size={14} /> campus@cloudlab.local
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
