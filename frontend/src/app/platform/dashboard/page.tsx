'use client';

import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  ShieldAlert 
} from 'lucide-react';
import PlatformStatCard from '@/components/platform/PlatformStatCard';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform';

export default function PlatformDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: platformApi.getStats,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 w-64 bg-gray-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Platform Overview</h2>
        <p className="text-gray-400 mt-1">Real-time governance and healthy system metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PlatformStatCard
          title="Total Tenants"
          value={stats?.tenants?.total || 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <PlatformStatCard
          title="Active Monthly Revenue"
          value={`₹${stats?.revenue?.monthly?.toLocaleString() || '0'}`}
          icon={TrendingUp}
          trend={{ value: 8.4, isPositive: true }}
        />
        <PlatformStatCard
          title="Processing Volume"
          value={stats?.bookings?.totalCount || 0}
          icon={CreditCard}
        />
        <PlatformStatCard
          title="System Alerts"
          value={stats?.alerts?.count || 0}
          icon={ShieldAlert}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-6">Recent Tenant Activity</h3>
          <div className="space-y-6">
            {stats?.recentActivity?.map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold">
                    {activity.tenantName[0]}
                  </div>
                  <div>
                    <p className="font-medium">{activity.tenantName}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-6">Plan Distribution</h3>
          <div className="space-y-4">
            {stats?.planDistribution?.map((plan: any) => (
              <div key={plan.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{plan.name}</span>
                  <span className="text-white font-medium">{plan.count} ({plan.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 rounded-full" 
                    style={{ width: `${plan.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
