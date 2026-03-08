'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  role: 'ADMIN' | 'USER';
}

export default function RoleGuard({ children, role }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== role) {
      router.push('/'); // Redirect to home if unauthorized
    }
  }, [isAuthenticated, user, role, router]);

  if (!isAuthenticated || user?.role !== role) {
    return null; // Or unauthorized view
  }

  return <>{children}</>;
}
