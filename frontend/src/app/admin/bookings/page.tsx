'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminBookingsApi } from '@/features/admin/api/bookings.api';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import { formatINR } from '@/lib/formatINR';

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings', statusFilter],
    queryFn: () => adminBookingsApi.getBookings(statusFilter || undefined),
  });

  if (isLoading) return <div className="text-white p-8">Loading bookings...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bookings Management</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              placeholder="Search bookings..." 
              className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-brand-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="p-4">Booking ID</th>
              <th className="p-4">User</th>
              <th className="p-4">Event</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings?.map((booking: any) => (
              <tr key={booking.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                <td className="p-4 font-mono text-xs text-gray-400">{booking.id.slice(0, 8)}...</td>
                <td className="p-4">
                  <div className="font-medium text-white">{booking.user.name}</div>
                  <div className="text-xs text-gray-500">{booking.user.email}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-white">{booking.show.event.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(booking.show.startTime), 'PPp')}
                  </div>
                </td>
                <td className="p-4 font-bold text-brand-400">
                  {formatINR((booking.discountAmount ?? 0) > 0 && booking.finalAmount != null
                    ? booking.finalAmount
                    : booking.totalAmount)}
                  {(booking.discountAmount ?? 0) > 0 && (
                    <span className="block text-[10px] font-normal text-gray-500 line-through">
                      was {formatINR(booking.totalAmount)}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    booking.status === 'CONFIRMED' ? 'bg-green-900 text-green-200' : 
                    booking.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 
                    'bg-red-900 text-red-200'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm">
                  {format(new Date(booking.createdAt), 'PP')}
                </td>
              </tr>
            ))}
            {bookings?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
