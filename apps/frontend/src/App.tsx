import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';

import { LearningCatalogPage } from './pages/learning/LearningCatalogPage';
import { LessonReaderPage } from './pages/learning/LessonReaderPage';
import { ModuleQuizPage } from './pages/learning/ModuleQuizPage';
import { StudentCourseViewPage } from './pages/learning/StudentCourseViewPage';
import { InstructorDashboardPage } from './pages/instructor/InstructorDashboardPage';
import { CourseModuleSetupPage } from './pages/instructor/CourseModuleSetupPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ProjectsCatalogPage } from './pages/projects/ProjectsCatalogPage';
import { CreateProjectPage } from './pages/projects/CreateProjectPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectPlanPage } from './pages/projects/ProjectPlanPage';
import { ProjectMySkillsPage } from './pages/projects/ProjectMySkillsPage';
import { StudentProfilePage } from './pages/profile/StudentProfilePage';
import { CommunityHubPage } from './pages/communication/CommunityHubPage';
import { DiscussionDetailPage } from './pages/communication/DiscussionDetailPage';
import { getUserRole, getAccessToken, resyncUserFromServer } from './utils/auth';


const RoleGuard: React.FC<{
  children: React.ReactElement;
  allowedRoles: Array<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>;
  fallback?: string;
}> = ({ children, allowedRoles, fallback = '/login' }) => {
  const token = getAccessToken();
  const location = useLocation();
  const [verified, setVerified] = useState<'loading' | 'allow' | 'deny'>('loading');
  const [denyRedirect, setDenyRedirect] = useState<string>('/login');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!token) {
        if (!cancelled) { setDenyRedirect('/login'); setVerified('deny'); }
        return;
      }
      const storedRole = getUserRole();
      if (allowedRoles.includes(storedRole as any)) {
        if (!cancelled) setVerified('allow');
        return;
      }
      const remote = await resyncUserFromServer();
      if (cancelled) return;
      const remoteRole: string | undefined = remote?.role;
      if (remoteRole && allowedRoles.includes(remoteRole as any)) {
        setVerified('allow');
        return;
      }
      const effectiveRole = remoteRole || storedRole;
      const defaultFallback =
        effectiveRole === 'ADMIN' ? '/admin/dashboard' :
        effectiveRole === 'INSTRUCTOR' ? '/instructor/dashboard' : '/dashboard';
      setDenyRedirect(fallback || defaultFallback);
      setVerified('deny');
    };
    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname, allowedRoles.join('|'), fallback]);

  if (verified === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070a0f' }}>
        <div style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}>
          Verifying role &amp; syncing permissions...
        </div>
      </div>
    );
  }
  if (verified === 'deny') return <Navigate to={denyRedirect} replace />;
  return children;
};

const AuthenticatedGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <AuthenticatedGuard>
              <DashboardPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/learning"
          element={
            <AuthenticatedGuard>
              <LearningCatalogPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/learning/courses/:slug"
          element={
            <AuthenticatedGuard>
              <StudentCourseViewPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/learning/lessons/:id"
          element={
            <AuthenticatedGuard>
              <LessonReaderPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/learning/modules/:moduleId/quiz"
          element={
            <AuthenticatedGuard>
              <ModuleQuizPage />
            </AuthenticatedGuard>
          }
        />

        {/* Projects Module */}
        <Route
          path="/projects"
          element={
            <AuthenticatedGuard>
              <ProjectsCatalogPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/projects/create"
          element={
            <AuthenticatedGuard>
              <CreateProjectPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/projects/id/:id"
          element={
            <AuthenticatedGuard>
              <ProjectDetailPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/projects/id/:id/plan"
          element={
            <AuthenticatedGuard>
              <ProjectPlanPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <AuthenticatedGuard>
              <ProjectDetailPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/projects/:id/plan"
          element={
            <AuthenticatedGuard>
              <ProjectPlanPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/skills"
          element={
            <AuthenticatedGuard>
              <ProjectMySkillsPage />
            </AuthenticatedGuard>
          }
        />

        <Route
          path="/instructor/dashboard"
          element={
            <RoleGuard allowedRoles={['INSTRUCTOR', 'ADMIN']}>
              <InstructorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/instructor/courses/:courseId/modules"
          element={
            <RoleGuard allowedRoles={['INSTRUCTOR', 'ADMIN']}>
              <CourseModuleSetupPage />
            </RoleGuard>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </RoleGuard>
          }
        />

        <Route
          path="/profile"
          element={
            <AuthenticatedGuard>
              <StudentProfilePage />
            </AuthenticatedGuard>
          }
        />

        {/* Communication & AI Module Routes */}
        <Route
          path="/community"
          element={
            <AuthenticatedGuard>
              <CommunityHubPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/community/forum/discussions/:id"
          element={
            <AuthenticatedGuard>
              <DiscussionDetailPage />
            </AuthenticatedGuard>
          }
        />
        <Route
          path="/communication/*"
          element={<Navigate to="/community" replace />}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
