'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { Plus, Search, Calendar as CalendarIcon } from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin.api';
import { ShowsTable } from '@/features/admin/components/ShowsTable';
import { CreateShowModal } from '@/features/admin/components/CreateShowModal';
import { LiveSeatMonitor } from '@/features/admin/components/LiveSeatMonitor';

export default function AdminShowsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [monitoringShow, setMonitoringShow] = useState<{ id: string; title: string } | null>(null);
  
  // TODO: Pagination state if needed, currently implementing infinite scroll or basic list
  // For now using basic list with implicit limit from API default

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'shows', { search }],
    queryFn: () => adminApi.getShows({ search }),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteShow,
    onSuccess: () => {
      toast.success('Show deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'shows'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete show');
    },
  });

  const handleDelete = (showId: string) => {
    if (window.confirm('Are you sure you want to delete this show?')) {
      deleteMutation.mutate(showId);
    }
  };

  const handleMonitor = (showId: string, title: string) => {
    setMonitoringShow({ id: showId, title });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Shows Management</h1>
          <p className="text-gray-400">Manage screening schedules and availability</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors font-medium"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Show
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by movie, screen, or theater..."
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Date Filters could be added here */}
      </div>

      <ShowsTable 
        shows={data?.shows || []} 
        isLoading={isLoading} 
        onDelete={handleDelete}
        onMonitor={handleMonitor}
        isDeleting={deleteMutation.isPending}
      />

      <CreateShowModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {monitoringShow && (
        <LiveSeatMonitor 
          showId={monitoringShow.id}
          showTitle={monitoringShow.title}
          onClose={() => setMonitoringShow(null)}
        />
      )}
    </div>
  );
}
