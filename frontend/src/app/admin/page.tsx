'use client';

import { Ticket, Film, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex items-start gap-4">
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  );
}

export default function TenantAdminDashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/summary')
      .then(r => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-900 rounded-2xl border border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name ?? 'Admin'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here's what's happening in your tenant today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={String(summary?.totalBookings ?? 0)} icon={Ticket} color="bg-blue-600" />
        <StatCard title="Active Shows" value={String(summary?.activeShows ?? 0)} icon={Film} color="bg-indigo-600" />
        <StatCard title="Revenue Today" value={`₹${((summary?.revenueToday ?? 0) / 100).toLocaleString('en-IN')}`} icon={TrendingUp} color="bg-emerald-600" />
        <StatCard title="Pending Actions" value={String(summary?.pending ?? 0)} icon={Clock} color="bg-amber-600" />
      </div>

      {/* Recent bookings placeholder */}
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="h-5 w-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
        </div>
        <p className="text-gray-500 text-sm">Visit <a href="/admin/bookings" className="text-blue-400 hover:underline">Bookings</a> to see the full list.</p>
      </div>
    </div>
  );
}
