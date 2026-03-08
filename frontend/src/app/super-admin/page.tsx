'use client';

import { Building2, DollarSign, Users, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface PlatformStats {
  tenantCount: number;
  totalRevenue: number;
  activeUsers: number;
  systemHealth: string;
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 p-6 flex items-start gap-4`}>
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/platform/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats({ tenantCount: 0, totalRevenue: 0, activeUsers: 0, systemHealth: 'unknown' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Global view across all tenants and systems.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Tenants" value={String(stats?.tenantCount ?? 0)} icon={Building2} color="bg-violet-600" />
        <StatCard title="Platform Revenue" value={`₹${((stats?.totalRevenue ?? 0) / 100).toLocaleString('en-IN')}`} icon={DollarSign} color="bg-emerald-600" />
        <StatCard title="Active Users" value={String(stats?.activeUsers ?? 0)} icon={Users} color="bg-blue-600" />
        <StatCard title="System Health" value={stats?.systemHealth ?? 'N/A'} icon={Activity} color="bg-amber-600" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Growth Metrics</h2>
          </div>
          <p className="text-slate-500 text-sm">Tenant onboarding and revenue trends will appear here.</p>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <h2 className="text-sm font-semibold text-white">System Alerts</h2>
          </div>
          <p className="text-slate-500 text-sm">No critical alerts at this time.</p>
        </div>
      </div>
    </div>
  );
}
