'use client';

/**
 * Portal Guard — Client-side auth verification hook.
 * Used in each portal layout.tsx to prevent UI flicker + unauthorized access.
 *
 * The middleware.ts handles SSR-level protection.
 * This provides the client-side redundant guard.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

type AllowedRole = 'SUPER_ADMIN' | 'ADMIN' | 'THEATER_MANAGER' | 'USER' | 'SCANNER_DEVICE';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  THEATER_MANAGER: '/theatre',
  USER: '/',
  SCANNER_DEVICE: '/scanner',
};

export function usePortalGuard(allowedRoles: AllowedRole[]) {
  const { user, hasHydrated, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return; // Wait for Zustand to rehydrate

    // Not logged in → login
    if (!user || !token) {
      router.replace('/login');
      return;
    }

    // Wrong role → redirect to correct portal
    if (!allowedRoles.includes(user.role as AllowedRole)) {
      const correctHome = ROLE_HOME[user.role] ?? '/login';
      router.replace(correctHome);
    }
  }, [user, hasHydrated, token, router, allowedRoles]);

  return {
    user,
    hasHydrated,
    isAuthorized: hasHydrated && !!user && allowedRoles.includes(user.role as AllowedRole),
  };
}
