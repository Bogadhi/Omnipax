'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,

            // ── Retry policy ──────────────────────────────────────────────
            // RULES:
            //  1. Never retry 4xx — these will never succeed (auth, not found, bad request)
            //  2. Never retry when there is NO status at all — this means the backend is
            //     completely down (ECONNREFUSED). Retrying against a crashed server just
            //     prolongs the outage and causes the 9-request flood visible in the network
            //     panel. Let the process restart, THEN queries will succeed naturally.
            //  3. Only retry genuine transient 5xx errors, max 1 time.
            retry: (failureCount, error: any) => {
              const status = error?.response?.status ?? error?.status;
              // No status = network failure (backend down) — do NOT retry
              if (!status) return false;
              // 4xx = client error — will never succeed on retry
              if (status >= 400 && status < 500) return false;
              // 5xx = transient server error — allow 1 retry
              return failureCount < 1;
            },

            // Don't refetch every time the user focuses the window — reduces
            // background request noise in the network panel.
            refetchOnWindowFocus: false,

            // Prevent Ghost queries from running on pages where the user is
            // not authenticated yet (reduces 401 flood before login redirect).
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
