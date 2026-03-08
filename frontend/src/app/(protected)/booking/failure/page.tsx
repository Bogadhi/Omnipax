'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function BookingFailurePage() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center px-4 text-center">
      <XCircle className="mb-4 h-16 w-16 text-red-500" />
      <h1 className="text-3xl font-bold text-gray-900">Booking Failed</h1>
      <p className="mt-2 max-w-md text-gray-600">
        Something went wrong with your payment or reservation. If you were charged, the amount will be refunded shortly.
      </p>
      <div className="mt-8">
        <Link 
          href="/events" 
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
