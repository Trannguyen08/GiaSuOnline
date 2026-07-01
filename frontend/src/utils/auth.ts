type AuthRole = 'user' | 'tutor' | 'admin';

const LEGACY_KEYS = ['access_token', 'refresh_token', 'user'];
const TUTOR_PORTAL_PATHS = new Set([
  'dashboard',
  'schedule',
  'bookings',
  'students',
  'rooms',
  'reviews',
  'support',
  'settings',
  'courses',
]);

const AUTH_KEYS: Record<AuthRole, { access: string; refresh: string; user: string }> = {
  user: {
    access: 'accessTokenUser',
    refresh: 'refreshTokenUser',
    user: 'authUser',
  },
  tutor: {
    access: 'accessTokenTutor',
    refresh: 'refreshTokenTutor',
    user: 'authTutor',
  },
  admin: {
    access: 'accessTokenAdmin',
    refresh: 'refreshTokenAdmin',
    user: 'authAdmin',
  },
};

const roleFromUser = (user: any): AuthRole => {
  if (user?.is_staff || user?.is_superuser) return 'admin';
  if (user?.is_tutor) return 'tutor';
  return 'user';
};

export const getAuthRoleFromPath = (pathname = window.location.pathname): AuthRole => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'admin') return 'admin';
  if (parts[0] === 'tutor' && parts[1] && TUTOR_PORTAL_PATHS.has(parts[1])) {
    return 'tutor';
  }
  return 'user';
};

const dispatchAuthChanged = () => window.dispatchEvent(new Event('auth-changed'));

const clearLegacyAuth = () => {
  LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
};

export const clearAuth = (role: AuthRole = getAuthRoleFromPath()) => {
  const keys = AUTH_KEYS[role];
  localStorage.removeItem(keys.access);
  localStorage.removeItem(keys.refresh);
  localStorage.removeItem(keys.user);
  clearLegacyAuth();
  dispatchAuthChanged();
};

export const clearAllAuth = () => {
  (Object.keys(AUTH_KEYS) as AuthRole[]).forEach(role => clearAuth(role));
  clearLegacyAuth();
  dispatchAuthChanged();
};

export const saveAuth = (data: { access: string; refresh: string; user: any }) => {
  const role = roleFromUser(data.user);
  const keys = AUTH_KEYS[role];
  localStorage.setItem(keys.access, data.access);
  localStorage.setItem(keys.refresh, data.refresh);
  localStorage.setItem(keys.user, JSON.stringify(data.user));
  clearLegacyAuth();
  dispatchAuthChanged();
};

export const getAccessToken = (role: AuthRole = getAuthRoleFromPath()) =>
  localStorage.getItem(AUTH_KEYS[role].access);

export const getRefreshToken = (role: AuthRole = getAuthRoleFromPath()) =>
  localStorage.getItem(AUTH_KEYS[role].refresh);

export const setAccessToken = (access: string, role: AuthRole = getAuthRoleFromPath()) => {
  localStorage.setItem(AUTH_KEYS[role].access, access);
  dispatchAuthChanged();
};

export const getStoredUser = (role: AuthRole = getAuthRoleFromPath()) => {
  const storedUser = localStorage.getItem(AUTH_KEYS[role].user);
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    clearAuth(role);
    return null;
  }
};
