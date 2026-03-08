'use client';

import { Clock, Users, Calendar, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TheatreDashboard() {
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shows?today=true')
      .then(r => setShows(r.data?.data ?? r.data ?? []))
      .catch(() => setShows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900 rounded-2xl border border-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Today's Shows</h1>
        <p className="text-zinc-400 text-sm mt-1">Operational overview for your theatre.</p>
      </div>

      {/* Show cards */}
      {shows.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-12 text-center">
          <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No shows scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shows.map((show: any) => (
            <div key={show.id} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{show.event?.title ?? 'Show'}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {show.startTime ? new Date(show.startTime).toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{show.remainingCapacity ?? 0}/{show.totalCapacity ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
