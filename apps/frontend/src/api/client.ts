import axios from 'axios';
import { clearAuthStorage, TOKEN_KEY, getRefreshToken } from '../utils/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prevent redirect storms when the 401 handler redirects to /login while
// a /login page background request (e.g. getMe during RoleGuard on
// /login-derived path) also 401s.
let authRedirectInProgress = false;
const redirectToLogin = (): void => {
  if (authRedirectInProgress) return;
  authRedirectInProgress = true;
  try {
    clearAuthStorage();
  } catch (_) {
    /* ignore */
  }
  // Avoid triggering React Router loops by using a full page navigation if
  // we're on an already-auth-required page; otherwise let a location change
  // happen without calling history twice.
  try {
    const current = window.location.pathname || '/';
    if (current === '/login' || current === '/register' || current === '/forgot-password' || current === '/reset-password') {
      // Already on a public page — no need to navigate again.
      authRedirectInProgress = false;
      return;
    }
    const dest = '/login';
    if (window.location.pathname !== dest) {
      window.location.href = dest;
    } else {
      authRedirectInProgress = false;
    }
  } catch (_) {
    window.location.href = '/login';
  }
};

// Interceptor to attach access token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Safety: also attach refresh token as a body fallback for logout if the
  // caller didn't pass it. Only applies to logout requests. Leave others alone.
  if (
    config.url &&
    typeof config.url === 'string' &&
    config.url.endsWith('/auth/logout') &&
    (config.method === 'post' || config.method === 'POST')
  ) {
    const dataIsObj = config.data && typeof config.data === 'object';
    const hasRefresh = dataIsObj && !!(config.data as any).refreshToken;
    if (!hasRefresh) {
      const rt = getRefreshToken();
      if (rt) {
        try {
          if (config.data instanceof FormData) {
            config.data.append('refreshToken', rt);
          } else if (dataIsObj) {
            (config.data as any).refreshToken = rt;
          } else if (!config.data) {
            config.data = { refreshToken: rt };
          }
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
  return config;
});

// Interceptor to handle stale/invalid tokens and role-change invalidations
// (e.g. a manual MySQL role edit leaves localStorage roles inconsistent).
// Any 401 except on explicit public endpoints clears local auth and routes
// back to /login so the user can re-authenticate cleanly instead of seeing
// endless "401 Unauthorized" and null-dereference renders.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const isUnauthorized = status === 401;
    const requestUrl: string | undefined = error?.config?.url;
    const isPublicEndpoint =
      requestUrl &&
      (/\/auth\/(register|login|verify-email|resend-verification|forgot-password|reset-password|refresh)([?/]|$)/.test(
        requestUrl,
      ) ||
        requestUrl.endsWith('/auth/logout'));

    const isAuthEndpoint =
      requestUrl && (requestUrl.includes('/auth/me') || requestUrl.includes('/auth/refresh'));

    if (isUnauthorized && isAuthEndpoint && !isPublicEndpoint) {
      redirectToLogin();
      return Promise.resolve({
        data: {
          success: false,
          error: 'Unauthorized',
          message: 'Session expired or role changed. Redirecting to login.',
          code: 'SESSION_INVALID',
        },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: error?.config || {},
      } as any);
    }


    // On /auth/me specifically, even though RoleGuard already checks first,
    // swallow 401 with a safe payload so RoleGuard can fall back to deny.
    if (
      isUnauthorized &&
      requestUrl &&
      (requestUrl.endsWith('/auth/me') || requestUrl.includes('/auth/me?'))
    ) {
      try {
        clearAuthStorage();
      } catch (_) {
        /* ignore */
      }
      return Promise.resolve({
        data: {
          success: false,
          error: 'Unauthorized',
          message: 'Session invalid — cleared local auth.',
          code: 'SESSION_INVALID',
        },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: error?.config || {},
      } as any);
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: 'STUDENT' | 'INSTRUCTOR' }, avatarFile?: File | null) => {
    if (avatarFile) {
      const form = new FormData();
      form.append('email', data.email);
      form.append('password', data.password);
      form.append('firstName', data.firstName);
      form.append('lastName', data.lastName);
      if (data.role) form.append('role', data.role);
      form.append('avatar', avatarFile);
      return apiClient.post('/auth/register', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return apiClient.post('/auth/register', data);
  },

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),

  verifyEmail: (token: string) =>
    apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', data),

  getMe: () =>
    apiClient.get('/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken?: string) =>
    apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {}),

  admin: {
    listUsers: () =>
      apiClient.get('/auth/admin/users'),

    updateUserStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED') =>
      apiClient.patch(`/auth/admin/users/${encodeURIComponent(userId)}/status`, { status }),

    updateUserRole: (userId: string, role: 'STUDENT' | 'ADMIN') =>
      apiClient.patch(`/auth/admin/users/${encodeURIComponent(userId)}/role`, { role }),
  },
};

export const learningApi = {
  // Read operations
  getTracks: () =>
    apiClient.get('/learning/tracks'),

  getTrackById: (id: string) =>
    apiClient.get(`/learning/tracks/id/${encodeURIComponent(id)}`),

  getTrackBySlug: (slug: string) =>
    apiClient.get(`/learning/tracks/${encodeURIComponent(slug)}`),

  getCourses: () =>
    apiClient.get('/learning/courses'),

  getAllCourses: (role?: string) =>
    apiClient.get('/learning/courses', role ? { params: { role } } : {}),

  getCourseById: (id: string) =>
    apiClient.get(`/learning/courses/id/${encodeURIComponent(id)}`),

  getCourseBySlug: (slug: string) =>
    apiClient.get(`/learning/courses/${encodeURIComponent(slug)}`),

  getLessonById: (id: string) =>
    apiClient.get(`/learning/lessons/${encodeURIComponent(id)}`),

  submitQuiz: (lessonId: string, answers: { questionId: string; selectedIndex: number }[], courseId?: string) =>
    apiClient.post(`/learning/lessons/${encodeURIComponent(lessonId)}/quiz`, { answers, courseId }),

  // Track CRUD
  createTrack: (data: any) =>
    apiClient.post('/learning/tracks', data),

  updateTrack: (id: string, data: any) =>
    apiClient.put(`/learning/tracks/${encodeURIComponent(id)}`, data),

  deleteTrack: (id: string) =>
    apiClient.delete(`/learning/tracks/${encodeURIComponent(id)}`),

  // Course CRUD & Publishing
  createCourse: (data: any) =>
    apiClient.post('/learning/courses', data),

  updateCourse: (id: string, data: any) =>
    apiClient.put(`/learning/courses/${encodeURIComponent(id)}`, data),

  setCoursePublishStatus: (id: string, isPublished: boolean) =>
    apiClient.patch(`/learning/courses/${encodeURIComponent(id)}/publish`, { isPublished }),

  deleteCourse: (id: string) =>
    apiClient.delete(`/learning/courses/${encodeURIComponent(id)}`),

  // Module CRUD & Reorder
  createModule: (data: any) =>
    apiClient.post('/learning/modules', data),

  updateModule: (id: string, data: any) =>
    apiClient.put(`/learning/modules/${encodeURIComponent(id)}`, data),

  reorderModules: (courseId: string, moduleIds: string[]) =>
    apiClient.post('/learning/modules/reorder', { courseId, moduleIds }),

  deleteModule: (id: string) =>
    apiClient.delete(`/learning/modules/${encodeURIComponent(id)}`),

  // Lesson CRUD & Reorder
  createLesson: (data: any) =>
    apiClient.post('/learning/lessons', data),

  updateLesson: (id: string, data: any) =>
    apiClient.put(`/learning/lessons/${encodeURIComponent(id)}`, data),

  reorderLessons: (moduleId: string, lessonIds: string[]) =>
    apiClient.post('/learning/lessons/reorder', { moduleId, lessonIds }),

  deleteLesson: (id: string) =>
    apiClient.delete(`/learning/lessons/${encodeURIComponent(id)}`),

  // Student Enrollment & Progress
  enrollCourse: (courseId: string) =>
    apiClient.post(`/learning/courses/${encodeURIComponent(courseId)}/enroll`),

  getEnrollment: (courseId: string) =>
    apiClient.get(`/learning/courses/${encodeURIComponent(courseId)}/enrollment`),

  getMyEnrollments: () =>
    apiClient.get('/learning/enrollments/my'),

  completeLesson: (courseId: string, lessonId: string) =>
    apiClient.post('/learning/lessons/complete', { courseId, lessonId }),

  // Module Access & Module Quizzes (Gated Progression)
  checkModuleAccess: (moduleId: string) =>
    apiClient.get(`/learning/modules/${encodeURIComponent(moduleId)}/access`),

  getModuleQuiz: (moduleId: string) =>
    apiClient.get(`/learning/modules/${encodeURIComponent(moduleId)}/quiz`),

  submitModuleQuiz: (moduleId: string, answers: { questionId: string; selectedIndex: number }[]) =>
    apiClient.post(`/learning/modules/${encodeURIComponent(moduleId)}/quiz`, { answers }),

  generateModuleQuiz: (moduleId: string) =>
    apiClient.post(`/learning/modules/${encodeURIComponent(moduleId)}/quiz/generate`, {}),

  saveModuleQuiz: (moduleId: string, data: { title?: string; passingScore?: number; questions: any[] }) =>
    apiClient.post(`/learning/modules/${encodeURIComponent(moduleId)}/quiz/save`, data),

  // Course Final Exam Quizzes
  getCourseQuiz: (courseId: string) =>
    apiClient.get(`/learning/courses/${encodeURIComponent(courseId)}/quiz`),

  submitCourseQuiz: (courseId: string, answers: { questionId: string; selectedIndex: number }[]) =>
    apiClient.post(`/learning/courses/${encodeURIComponent(courseId)}/quiz`, { answers }),

  generateCourseQuiz: (courseId: string) =>
    apiClient.post(`/learning/courses/${encodeURIComponent(courseId)}/quiz/generate`, {}),

  saveCourseQuiz: (courseId: string, data: { title?: string; passingScore?: number; questions: any[]; xpOnPass?: number; skillPointsOnPass?: number }) =>
    apiClient.post(`/learning/courses/${encodeURIComponent(courseId)}/quiz/save`, data),

  // Instructor Analytics
  getCourseAnalytics: (courseId: string) =>
    apiClient.get(`/learning/courses/${encodeURIComponent(courseId)}/analytics`),

  // PDF & Resource File Upload
  uploadResource: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/learning/resources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const challengeApi = {
  getChallenges: () =>
    apiClient.get('/challenges'),

  getChallenge: (idOrSlug: string) =>
    apiClient.get(`/challenges/${encodeURIComponent(idOrSlug)}`),

  startAttempt: (challengeId: string) =>
    apiClient.post('/challenges/attempt', { challengeId }),

  validateAttempt: (attemptId: string) =>
    apiClient.post(`/challenges/attempt/${encodeURIComponent(attemptId)}/validate`),
};

export const progressApi = {
  getMyProfile: () =>
    apiClient.get('/progress/me'),

  getLeaderboard: () =>
    apiClient.get('/progress/leaderboard'),
};

export const projectsApi = {
  getSkills: () =>
    apiClient.get('/projects/skills'),

  getMySkills: () =>
    apiClient.get('/projects/skills/my'),

  getProjects: (params?: { status?: string; search?: string }) =>
    apiClient.get('/projects', { params }),

  getProject: (id: string) =>
    apiClient.get(`/projects/${encodeURIComponent(id)}`),

  createProject: (data: any) =>
    apiClient.post('/projects', data),

  generateAiPlan: (data: any) =>
    apiClient.post('/projects/ai-plan', data),

  approveAiPlan: (id: string, data: { tasks: any[]; startRecruiting?: boolean }) =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/approve-plan`, data),

  applyToProject: (id: string, message: string) =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/apply`, { message }),

  reviewApplication: (id: string, applicationId: string, decision: 'ACCEPT' | 'REJECT') =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/applications/${encodeURIComponent(applicationId)}/review`, { decision }),

  getSchedule: (id: string) =>
    apiClient.get(`/projects/${encodeURIComponent(id)}/schedule`),

  getRecommendations: (id: string) =>
    apiClient.get(`/projects/${encodeURIComponent(id)}/recommendations`),

  assignTask: (id: string, taskId: string, assignedTo: string | null) =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}/assign`, { assignedTo }),

  submitTask: (id: string, taskId: string, data: { files?: string[]; screenshots?: string[]; gitUrl?: string; deploymentUrl?: string; explanation: string }) =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}/submit`, data),

  reviewSubmission: (id: string, taskId: string, submissionId: string, data: { decision: 'VALIDATE' | 'REJECT'; feedback: string }) =>
    apiClient.post(`/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}/submissions/${encodeURIComponent(submissionId)}/review`, data),

  getActivity: (id: string) =>
    apiClient.get(`/projects/${encodeURIComponent(id)}/activity`),

  getNotifications: () =>
    apiClient.get('/projects/user/notifications'),

  markNotificationRead: (id: string) =>
    apiClient.post(`/projects/user/notifications/${encodeURIComponent(id)}/read`),
};

export const profileApi = {
  /** Update displayable profile fields (name, bio, links, theme) */
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    preferredTerminalTheme?: string;
  }) => apiClient.patch('/auth/me/profile', data),

  /** Upload a new avatar image (multipart/form-data, field name: avatar) */
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Remove the current avatar */
  deleteAvatar: () => apiClient.delete('/auth/me/avatar'),
};
