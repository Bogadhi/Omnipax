'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminEventsApi } from '@/features/admin/api/events.api';
import Link from 'next/link';
import { Plus, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminEventsPage() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', 'admin'],
    queryFn: adminEventsApi.getEvents,
  });

  const deleteMutation = useMutation({
    mutationFn: adminEventsApi.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'admin'] });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="text-white p-8">Loading events...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Events Management</h1>
        <Link 
          href="/admin/events/new"
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Type</th>
              <th className="p-4">Date</th>
              <th className="p-4">Location</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events?.map((event: any) => (
              <tr key={event.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                <td className="p-4 font-medium text-white">{event.title}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    event.type === 'MOVIE' ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'
                  }`}>
                    {event.type}
                  </span>
                </td>
                <td className="p-4 text-gray-400">
                  {format(new Date(event.date), 'PPp')}
                </td>
                <td className="p-4 text-gray-400">{event.location}</td>
                <td className="p-4 flex gap-2">
                  <button 
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {events?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No events found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
