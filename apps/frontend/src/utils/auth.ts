import { authApi } from '../api/client';

export const TOKEN_KEY = 'cloudlab_access_token';
export const USER_KEY = 'cloudlab_user';
export const REFRESH_TOKEN_KEY = 'cloudlab_refresh_token';

/**
 * Base public URL used to resolve relative upload URLs (e.g. `/uploads/avatars/x.jpg`)
 * into an absolute URL the browser can fetch. Falls back to the gateway default.
 */
const PUBLIC_BASE_URL =
  ((import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:4000';

export const clearAuthStorage = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.clear();
};

export const saveUserToStorage = (user: any): void => {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Notify same-tab listeners (e.g. Navbar) that user data changed
  window.dispatchEvent(new CustomEvent('cloudlab:user-updated', { detail: user }));
};

export const saveTokensToStorage = (access: string | null | undefined, refresh?: string | null | undefined): void => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh != null) {
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getUserFromStorage = (): any | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getUserRole = (): string => {
  const user = getUserFromStorage();
  return user?.role || 'STUDENT';
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

export const resyncUserFromServer = async (): Promise<any | null> => {
  if (!getAccessToken()) return null;
  try {
    const res = await authApi.getMe();
    // Handle safe 401-shaped payload returned by the axios 401 interceptor
    // on stale/invalid tokens (e.g. after manual MySQL role changes).
    if (!res || (res as any).status === 401) {
      clearAuthStorage();
      return null;
    }
    const user = res?.data?.data ?? res?.data ?? null;
    if (user?.id) saveUserToStorage(user);
    return user;
  } catch (err: any) {
    // If the interceptor didn't already handle it, this is either a 5xx or a
    // network issue. Clear auth if we got a real 401 status.
    const status = err?.response?.status;
    if (status === 401) clearAuthStorage();
    return null;
  }
};

export const secureLogout = async (navigate?: (path: string) => void, redirectPath: string = '/login'): Promise<void> => {
  const refreshToken = getRefreshToken();

  try {
    await authApi.logout(refreshToken || undefined);
  } catch (err) {
    // Logout should always succeed client-side even if server call fails
    // (network issues, token already expired, etc.)
  } finally {
    clearAuthStorage();
    if (navigate) {
      navigate(redirectPath);
    } else {
      window.location.href = redirectPath;
    }
  }
};

export const requireRole = (...allowedRoles: string[]): boolean => {
  const role = getUserRole();
  return allowedRoles.includes(role);
};

export const requireAdmin = (): boolean => requireRole('ADMIN');
export const requireInstructor = (): boolean => requireRole('INSTRUCTOR', 'ADMIN');
export const requireStudent = (): boolean => requireRole('STUDENT', 'INSTRUCTOR', 'ADMIN');

/**
 * Convert a stored avatar path (relative or absolute) into a cache-busted
 * absolute URL the browser will actually refresh when the image changes.
 *
 * - Returns `null` for empty/null/whitespace inputs so the caller can fall
 *   back to initials instead of rendering a broken `<img src="">`.
 * - Absolute URLs (http/https/data:) are returned unchanged (plus a cache-bust
 *   query for http/https if they target our public base host).
 * - Relative `/uploads/...` paths are prefixed with the public gateway URL.
 */
export const resolveAvatarUrl = (url?: string | null | undefined, cacheBust?: string | number | null): string | null => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
  const trimmed = url.trim();
  const isAbsolute = /^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:');
  let base = isAbsolute ? trimmed : `${PUBLIC_BASE_URL.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  const version = cacheBust != null && String(cacheBust).length > 0 ? String(cacheBust) : String(Date.now());
  if (base.startsWith('data:')) {
    // data URLs never need cache busting
    return base;
  }
  const joiner = base.includes('?') ? '&' : '?';
  // Do not double-add if already present on the URL
  if (/([?&])v=/.test(base)) {
    return base;
  }
  return `${base}${joiner}v=${encodeURIComponent(version)}`;
};
