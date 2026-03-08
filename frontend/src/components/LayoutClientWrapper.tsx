'use client';

import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export default function LayoutClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <main className={twMerge('min-h-screen', !isHome && 'pt-24')}>
      {children}
    </main>
  );
}
