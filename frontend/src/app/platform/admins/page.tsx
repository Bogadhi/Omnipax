'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShieldCheck, UserCog, Plus, Trash2, Mail } from 'lucide-react';

export default function PlatformAdminsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'admins'],
    queryFn: async () => {
      const res = await api.get('/platform/admins');
      return res.data;
    },
  });

  const admins: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Platform Admins</h2>
          <p className="text-gray-400 mt-1">Users with Super Admin or Platform Admin privileges</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Invite Admin
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Admin', 'Email', 'Role', 'Tenant', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-800 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-500">No platform admins found</td>
              </tr>
            ) : admins.map((admin: any) => (
              <tr key={admin.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <UserCog size={14} className="text-violet-400" />
                    </div>
                    <span className="font-semibold text-white">{admin.name ?? 'Unnamed'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-gray-600" />
                    {admin.email}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    admin.role === 'SUPER_ADMIN'
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    <ShieldCheck size={11} />
                    {admin.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs">{admin.tenant?.name ?? 'Platform'}</td>
                <td className="px-5 py-4 text-gray-500 text-xs">
                  {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-5 py-4">
                  {admin.role !== 'SUPER_ADMIN' && (
                    <button className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
