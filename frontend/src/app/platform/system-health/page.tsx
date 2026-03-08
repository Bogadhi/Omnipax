'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, AlertCircle, XCircle, Server, Database, Wifi, Clock } from 'lucide-react';

const STATUS_ICON: Record<string, any> = {
  healthy: CheckCircle2,
  degraded: AlertCircle,
  down: XCircle,
};
const STATUS_COLOR: Record<string, string> = {
  healthy: 'text-green-400',
  degraded: 'text-yellow-400',
  down: 'text-red-400',
};
const STATUS_BG: Record<string, string> = {
  healthy: 'bg-green-400/10 border-green-400/20',
  degraded: 'bg-yellow-400/10 border-yellow-400/20',
  down: 'bg-red-400/10 border-red-400/20',
};

export default function SystemHealthPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['platform', 'system-health'],
    queryFn: async () => {
      const res = await api.get('/health');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const services = [
    { name: 'API Server',    icon: Server,   key: 'api',      status: data?.status ?? 'healthy' },
    { name: 'Database',      icon: Database, key: 'database', status: data?.checks?.database ?? 'healthy' },
    { name: 'Redis',         icon: Server,   key: 'redis',    status: data?.checks?.redis ?? 'healthy' },
    { name: 'WebSocket',     icon: Wifi,     key: 'ws',       status: data?.checks?.websocket ?? 'healthy' },
  ];

  const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy'
    : services.some(s => s.status === 'down') ? 'down' : 'degraded';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">System Health</h2>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
            <Clock size={13} />
            Last checked: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
            <span className="text-gray-600">· auto-refreshes every 30s</span>
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${STATUS_BG[overallStatus]} ${STATUS_COLOR[overallStatus]}`}>
          {overallStatus === 'healthy' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Degraded' : 'Incident Active'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          const StatusIcon = STATUS_ICON[svc.status] ?? CheckCircle2;
          return (
            <div key={svc.key} className={`rounded-2xl border p-6 space-y-3 ${STATUS_BG[svc.status] ?? 'bg-gray-900 border-gray-800'}`}>
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-gray-400" />
                <StatusIcon size={18} className={STATUS_COLOR[svc.status] ?? 'text-green-400'} />
              </div>
              <p className="font-bold text-white">{svc.name}</p>
              <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[svc.status]}`}>
                {svc.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Additional info */}
      {data && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Details</h3>
          <pre className="text-xs text-gray-400 overflow-auto max-h-64 font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
