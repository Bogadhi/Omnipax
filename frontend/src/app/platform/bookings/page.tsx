'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Search, Download, ChevronDown, BadgeCheck, Clock, XCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-500/10 text-green-400 border-green-500/20',
  LOCKED:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PENDING:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const STATUS_ICONS: Record<string, any> = {
  CONFIRMED: BadgeCheck,
  LOCKED:    Clock,
  CANCELLED: XCircle,
};

export default function PlatformBookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'bookings', page, statusFilter, search],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/platform/bookings', { params });
      return res.data;
    },
  });

  const bookings: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">All Bookings</h2>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} total bookings across all tenants</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-300 transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by booking ID, user, event…"
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {['ALL', 'CONFIRMED', 'LOCKED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              statusFilter === s
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Booking ID', 'Tenant', 'Event', 'User', 'Seats', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(8)].map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3 bg-gray-800 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : bookings.map((b: any) => {
              const StatusIcon = STATUS_ICONS[b.status] ?? Clock;
              return (
                <tr key={b.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-400">{b.id?.slice(0, 8)}…</td>
                  <td className="px-5 py-4 text-white font-medium">{b.tenant?.name ?? b.tenantId?.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-gray-300">{b.show?.event?.title ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-400 text-xs">{b.user?.email ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-300">{b.bookingSeats?.length ?? '—'}</td>
                  <td className="px-5 py-4 text-white font-semibold">₹{Number(b.totalAmount ?? 0).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      <StatusIcon size={11} />
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-40 hover:border-gray-600 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-40 hover:border-gray-600 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
