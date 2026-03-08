'use client';

import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform';
import { 
  ShieldCheck, 
  User, 
  AtSign, 
  History,
  AlertCircle
} from 'lucide-react';

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['platform', 'audit-logs'],
    queryFn: () => platformApi.getAuditLogs(),
  });

  if (isLoading) return <div className="text-gray-400">Loading audit trail...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">System Audit Trail</h2>
        <p className="text-gray-400 mt-1">Immutable record of all governance and privileged actions.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="divide-y divide-gray-800/50">
          {logs?.map((log: any) => (
            <div key={log.id} className="p-6 hover:bg-gray-800/20 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-2xl ${
                    log.action.includes('SUSPEND') || log.action.includes('DELETE')
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    <History size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white group-hover:text-brand-400 transition-colors">
                      {log.action}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User size={14} />
                        <span>Admin ID: {log.userId?.substring(0, 8) || 'SYSTEM'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AtSign size={14} />
                        <span>Tenant: {log.tenantId || 'GLOBAL'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-brand-400 font-bold mt-1 uppercase tracking-wider">
                    {log.actorRole || 'INTERNAL'}
                  </p>
                </div>
              </div>

              {log.metadata && (
                <div className="mt-4 ml-14 p-4 bg-gray-950/50 border border-gray-800 rounded-2xl">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">
                    <AlertCircle size={12} />
                    <span>Metadata Details</span>
                  </div>
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
