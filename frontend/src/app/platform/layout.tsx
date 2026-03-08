'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import PlatformSidebar from '@/components/platform/PlatformSidebar';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated) {
      if (!user || user.role !== 'SUPER_ADMIN') {
        router.push('/auth/login');
      }
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated) {
    return <div className="h-screen bg-gray-950 flex items-center justify-center text-gray-500">Initializing...</div>;
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto p-8 pt-20">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
