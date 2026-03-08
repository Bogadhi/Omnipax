'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function RedirectToNewSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId') || searchParams.get('id');

  useEffect(() => {
    if (bookingId) {
      router.replace(`/booking/success/${bookingId}`);
    } else {
      router.replace('/events');
    }
  }, [bookingId, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
