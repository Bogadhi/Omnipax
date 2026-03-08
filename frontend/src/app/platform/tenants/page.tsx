'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Ban
} from 'lucide-react';

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: platformApi.getTenants,
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, plan }: { id: string, plan: string }) => platformApi.updateTenantPlan(id, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  });

  if (isLoading) return <div className="animate-pulse">Loading tenants...</div>;

  const filteredTenants = tenants?.filter((t: any) => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Tenant Management</h2>
          <p className="text-gray-400 mt-1">Govern all theater chains on the platform.</p>
        </div>
      </div>

      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or subdomain..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 focus:border-brand-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-gray-900 border border-gray-800 rounded-xl px-4 flex items-center space-x-2 text-gray-400 hover:text-white transition-all">
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm">
              <th className="px-6 py-4 font-medium">Tenant</th>
              <th className="px-6 py-4 font-medium">Plan</th>
              <th className="px-6 py-4 font-medium">Monthly Usage</th>
              <th className="px-6 py-4 font-medium">Revenue (MTD)</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredTenants?.map((tenant: any) => (
              <tr key={tenant.id} className="hover:bg-gray-800/50 transition-colors group">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-white">{tenant.name}</p>
                    <p className="text-sm text-gray-500">{tenant.subdomain}.tickets.com</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      tenant.plan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-400' :
                      tenant.plan === 'PRO' ? 'bg-brand-500/10 text-brand-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {tenant.plan}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{tenant.monthlyBookingCount} / {tenant.bookingLimit}</span>
                      <span className="text-gray-400">{Math.round((tenant.monthlyBookingCount / tenant.bookingLimit) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-32 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (tenant.monthlyBookingCount / tenant.bookingLimit) > 0.9 ? 'bg-red-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min((tenant.monthlyBookingCount / tenant.bookingLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  ₹{tenant.monthlyRevenue?.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center space-x-1.5 text-xs font-medium ${
                    tenant.isActive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tenant.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <span>{tenant.isActive ? 'Active' : 'Suspended'}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-all" title="View Dashboard">
                      <ExternalLink size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-all" title="Manage Features">
                      <ShieldCheck size={18} />
                    </button>
                    <button className="p-2 hover:bg-red-400/10 rounded-lg text-gray-400 hover:text-red-400 transition-all" title="Suspend Tenant">
                      <Ban size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
