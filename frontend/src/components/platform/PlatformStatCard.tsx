'use client';

import { LucideIcon } from 'lucide-react';

interface PlatformStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function PlatformStatCard({ title, value, icon: Icon, trend }: PlatformStatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl hover:border-brand-500/30 transition-all group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white group-hover:text-brand-400 transition-colors">
            {value}
          </p>
        </div>
        <div className="p-3 bg-gray-800 rounded-xl text-gray-400 group-hover:bg-brand-500/10 group-hover:text-brand-400 transition-all">
          <Icon size={24} />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center space-x-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {trend.isPositive ? '+' : '-'}{trend.value}%
          </span>
          <span className="text-xs text-gray-500">from last month</span>
        </div>
      )}
    </div>
  );
}
