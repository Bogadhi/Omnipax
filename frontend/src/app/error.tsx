'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
        An unexpected error occurred. We've been notified and are working to fix it.
        {error.digest && (
          <span className="block mt-2 font-mono text-xs opacity-50">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
        <button
          className="px-6 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg font-medium transition-colors"
          onClick={() => window.location.href = '/'}
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
