import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDto } from '@shared';

export type User = UserDto & {
  tenantSlug?: string;
  tenantName?: string;
};


export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'THEATER_MANAGER' | 'USER' | 'SCANNER_DEVICE';

// ─── Role → Default Portal Path ──────────────────────────────────────────────
export const PORTAL_HOME: Record<string, string> = {
  SUPER_ADMIN:      '/super-admin',
  ADMIN:            '/admin',
  THEATER_MANAGER:  '/theatre',
  USER:             '/',
  SCANNER_DEVICE:   '/scanner',
};

interface AuthState {
  user: User | null;
  token: string | null;
  hasHydrated: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;

  /** Returns the correct portal landing page for the current user */
  getPortalHome: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hasHydrated: false,

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          // ── localStorage (for axios interceptor) ──────────────────────────
          localStorage.setItem('token', token);
          if (user.tenantSlug) localStorage.setItem('tenant_slug', user.tenantSlug);

          // ── Cookie (for Next.js middleware) ───────────────────────────────
          // CRITICAL: The middleware reads `access_token` from cookies (SSR-safe).
          // Without this write, router.replace() appears to not execute because
          // the middleware intercepts the navigation and redirects back to /login.
          // SameSite=Lax + path=/ ensures it is sent on all same-origin navigations.
          document.cookie = `access_token=${token}; path=/; SameSite=Lax`;
        }
        set({ user, token });
      },


      logout: () => {
        // Clear all stored state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('tenant_slug');
          // Clear auth cookie so middleware doesn't allow re-entry
          document.cookie = 'access_token=; max-age=0; path=/;';
        }
        set({ user: null, token: null });
      },

      setHasHydrated: (state) => set({ hasHydrated: state }),

      getPortalHome: () => {
        const role = get().user?.role;
        return PORTAL_HOME[role ?? ''] ?? '/';
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Re-sync the access_token cookie on every page load.
        // This bridges sessions that were created before the cookie-writing fix:
        // the token lives in localStorage/Zustand but the middleware needs the cookie.
        if (state?.token && typeof window !== 'undefined') {
          document.cookie = `access_token=${state.token}; path=/; SameSite=Lax`;
        }
        state?.setHasHydrated(true);
      },
    },

  ),
);