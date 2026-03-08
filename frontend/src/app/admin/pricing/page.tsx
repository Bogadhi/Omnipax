'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RoleGuard from '@/components/auth/RoleGuard';

export default function AdminPricingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
  });

  return (
    <RoleGuard role="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Pricing & Revenue</h1>
          <p className="text-gray-400">Platform revenue overview and pricing analytics</p>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-2">
                ₹{Number(data?.totalRevenue ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <p className="text-sm text-gray-400">Total Bookings</p>
              <p className="text-3xl font-bold text-white mt-2">
                {data?.totalBookings ?? 0}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <p className="text-sm text-gray-400">Pending Actions</p>
              <p className="text-3xl font-bold text-white mt-2">
                {data?.pendingActions ?? 0}
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Platform Fee Configuration</h2>
          <p className="text-gray-400 text-sm">
            Platform fee management is available via the Super Admin tenant configuration panel.
            Navigate to <span className="text-brand-400">/super-admin/tenants</span> to update
            fee structures per tenant.
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}
