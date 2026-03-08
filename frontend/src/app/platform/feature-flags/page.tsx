'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform';
import { 
  Settings, 
  ToggleRight, 
  ToggleLeft,
  Info,
  ShieldCheck
} from 'lucide-react';

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { data: flags, isLoading } = useQuery({
    queryKey: ['platform', 'feature-flags'],
    queryFn: platformApi.getFeatureFlags,
  });

  const toggleFlag = useMutation({
    mutationFn: ({ id, enabled }: { id: string, enabled: boolean }) => 
      platformApi.toggleFeature(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'feature-flags'] });
    },
  });

  if (isLoading) return <div className="text-gray-400">Loading system overrides...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Feature Governance</h2>
        <p className="text-gray-400 mt-1">Global and selective feature overrides for platform stability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flags?.map((flag: any) => (
          <div key={flag.id} className="bg-gray-900 border border-gray-800 p-6 rounded-3xl hover:border-brand-500/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${flag.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Settings size={20} />
                </div>
                <h3 className="font-bold text-lg">{flag.key}</h3>
              </div>
              <button 
                onClick={() => toggleFlag.mutate({ id: flag.id, enabled: !flag.enabled })}
                className={`transition-all ${flag.enabled ? 'text-brand-500' : 'text-gray-600'}`}
              >
                {flag.enabled ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {flag.description || 'No description provided for this feature key.'}
            </p>

            <div className="bg-gray-800/50 rounded-2xl p-4 flex items-start space-x-3">
              <Info className="text-brand-400 mt-0.5" size={16} />
              <div className="text-xs text-gray-400">
                <p><span className="text-white font-medium">Scope:</span> {flag.scope || 'Global'}</p>
                <p className="mt-1"><span className="text-white font-medium">Last Modified:</span> {new Date(flag.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-brand-500/5 border border-brand-500/10 p-6 rounded-3xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-brand-500/10 text-brand-400 rounded-full">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold">Safe Mode Status</h4>
            <p className="text-sm text-gray-500">Enable to immediately disable all non-critical booking features platform-wide.</p>
          </div>
        </div>
        <button className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20">
          Activate Platform Safe Mode
        </button>
      </div>
    </div>
  );
}
