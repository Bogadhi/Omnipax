'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, Users, CreditCard, BarChart3, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function PlatformAnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/platform/analytics');
      return res.data;
    },
  });

  const { data: growth } = useQuery({
    queryKey: ['platform', 'analytics-growth'],
    queryFn: async () => {
      const res = await api.get('/platform/analytics/growth');
      return res.data;
    },
  });

  const kpis = [
    {
      label: 'GMV (30 days)',
      value: `₹${Number(stats?.gmv30d ?? 0).toLocaleString()}`,
      delta: stats?.gmvDelta ?? 0,
      icon: CreditCard,
    },
    {
      label: 'Total Bookings',
      value: Number(stats?.totalBookings ?? 0).toLocaleString(),
      delta: stats?.bookingsDelta ?? 0,
      icon: BarChart3,
    },
    {
      label: 'Active Users (30d)',
      value: Number(stats?.activeUsers30d ?? 0).toLocaleString(),
      delta: stats?.usersDelta ?? 0,
      icon: Users,
    },
    {
      label: 'Active Tenants',
      value: Number(stats?.activeTenants ?? 0).toLocaleString(),
      delta: stats?.tenantsDelta ?? 0,
      icon: TrendingUp,
    },
  ];

  const topTenants: any[] = stats?.topTenants ?? [];
  const recentEvents: any[] = stats?.recentEvents ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Analytics</h2>
        <p className="text-gray-400 mt-1">Platform-wide performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-900 border border-gray-800 rounded-2xl p-6 h-28" />
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isPositive = kpi.delta >= 0;
              return (
                <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{kpi.label}</span>
                    <Icon size={16} className="text-violet-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{kpi.value}</p>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(kpi.delta)}% vs last month
                  </div>
                </div>
              );
            })}
      </div>

      {/* Two-column: Top Tenants + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants by Revenue */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Top Tenants by Revenue</h3>
          <div className="space-y-3">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-4 bg-gray-800 rounded w-full" />
                  </div>
                ))
              : topTenants.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">No data available</p>
              : topTenants.map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-600 w-4">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.bookingsCount} bookings</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-violet-400">₹{Number(t.revenue).toLocaleString()}</span>
                  </div>
                ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Recent Events (All Tenants)</h3>
          <div className="space-y-3">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-4 bg-gray-800 rounded w-full" />
                ))
              : recentEvents.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">No events yet</p>
              : recentEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{e.title}</p>
                      <p className="text-xs text-gray-500">{e.tenant?.name} · {e._count?.shows ?? 0} shows</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar size={11} />
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Monthly Bookings Trend (text-based) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Monthly Booking Trend</h3>
        <div className="flex gap-2 h-32 items-end">
          {(growth?.monthly ?? []).map((m: any, i: number) => {
            const max = Math.max(...(growth?.monthly ?? [{ count: 1 }]).map((x: any) => x.count || 1));
            const height = Math.max(8, ((m.count / max) * 100));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-violet-500/60 hover:bg-violet-500 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${m.month}: ${m.count} bookings`}
                />
                <span className="text-[9px] text-gray-600 font-bold">{m.month?.slice(0, 3)}</span>
              </div>
            );
          })}
          {!growth && <p className="text-gray-600 text-sm mx-auto">No trend data yet</p>}
        </div>
      </div>
    </div>
  );
}
