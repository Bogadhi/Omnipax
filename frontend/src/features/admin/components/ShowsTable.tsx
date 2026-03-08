import React from 'react';
import { format } from 'date-fns';
import { Trash2, Film, Monitor, MapPin } from 'lucide-react';
import { AdminShow } from '../types';

interface ShowsTableProps {
  shows: AdminShow[];
  isLoading: boolean;
  onDelete: (showId: string) => void;
  onMonitor: (showId: string, title: string) => void;
  isDeleting: boolean;
}

export const ShowsTable: React.FC<ShowsTableProps> = ({ shows, isLoading, onDelete, onMonitor, isDeleting }) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        Loading shows...
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Film className="w-8 h-8 opacity-50" />
        <p>No shows found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="bg-gray-800 text-xs uppercase text-gray-400">
          <tr>
            <th className="px-6 py-3">Event</th>
            <th className="px-6 py-3">Date & Time</th>
            <th className="px-6 py-3">Location</th>
            <th className="px-6 py-3">Price</th>
            <th className="px-6 py-3">Bookings</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {shows.map((show) => (
            <tr key={show.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                <div className="w-8 h-10 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {show.posterUrl ? (
                    <img src={show.posterUrl} alt={show.eventTitle} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-full h-full p-2 text-gray-500" />
                  )}
                </div>
                <span>{show.eventTitle}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-white">{format(new Date(show.startTime), 'MMM d, yyyy')}</span>
                  <span className="text-xs text-gray-500">{format(new Date(show.startTime), 'h:mm a')}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span className="text-white">{show.theater}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-brand-400">
                    <Monitor className="w-3 h-3" />
                    <span>{show.screen}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-white">
                ₹{show.price}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${show.totalBookings > 0 ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                  {show.totalBookings} booked
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onMonitor(show.id, show.eventTitle)}
                    className="text-brand-400 hover:text-brand-300 hover:bg-brand-900/20 p-2 rounded-lg transition-colors"
                    title="Monitor live seats"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(show.id)}
                    disabled={isDeleting || show.totalBookings > 0}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={show.totalBookings > 0 ? "Cannot delete show with bookings" : "Delete show"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
