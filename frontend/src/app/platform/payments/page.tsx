'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditCard, TrendingUp, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  SUCCESS:   'bg-green-500/10 text-green-400 border-green-500/20',
  FAILED:    'bg-red-500/10 text-red-400 border-red-500/20',
  PENDING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  REFUNDED:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function PlatformPaymentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'payments', page, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/platform/payments', { params });
      return res.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['platform', 'payments-summary'],
    queryFn: async () => {
      const res = await api.get('/platform/payments/summary');
      return res.data;
    },
  });

  const payments: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const summaryCards = [
    { label: 'Total Revenue', value: `₹${Number(summary?.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Successful', value: summary?.successful ?? 0, icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Failed', value: summary?.failed ?? 0, icon: AlertCircle, color: 'text-red-400' },
    { label: 'Refunded', value: `₹${Number(summary?.refunded ?? 0).toLocaleString()}`, icon: CreditCard, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Payments</h2>
          <p className="text-gray-400 mt-1">All payment transactions across tenants</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-300 transition-colors">
          <Download size={16} /> Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{card.label}</span>
                <Icon size={16} className={card.color} />
              </div>
              <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all ${
              statusFilter === s
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white hover:border-gray-600'
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
              {['Payment ID', 'Tenant', 'Booking', 'Amount', 'Status', 'Method', 'Date'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(7)].map((__, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-800 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-500">No payments found</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-gray-400">{p.razorpayPaymentId ?? p.id?.slice(0, 12)}</td>
                <td className="px-5 py-4 text-white font-medium">{p.tenant?.name ?? p.tenantId?.slice(0, 8)}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-400">{p.bookingId?.slice(0, 8)}…</td>
                <td className="px-5 py-4 text-white font-semibold">₹{Number(p.amount ?? 0).toLocaleString()}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[p.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs">{p.method ?? 'Razorpay'}</td>
                <td className="px-5 py-4 text-gray-500 text-xs">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-40 hover:border-gray-600">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-40 hover:border-gray-600">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
