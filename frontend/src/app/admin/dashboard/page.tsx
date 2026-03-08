'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RoleGuard from '@/components/auth/RoleGuard';
import { adminApi } from '@/features/admin/api/admin.api';
import { CreateEventForm } from '@/features/admin/components/CreateEventForm';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'bookings'>('events');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats });
  const eventsQuery = useQuery({ queryKey: ['admin-events'], queryFn: adminApi.getAllEvents });
  const bookingsQuery = useQuery({ queryKey: ['admin-bookings'], queryFn: adminApi.getAllBookings });

  // Mutations
  const cancelBookingMutation = useMutation({
    mutationFn: adminApi.cancelBooking,
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to cancel booking'),
  });

  const handleCancelBooking = (id: string) => {
    if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      cancelBookingMutation.mutate(id);
    }
  };

  return (
    <RoleGuard role="ADMIN">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showCreateModal ? 'Close Form' : 'Create New Event'}
          </button>
        </div>

        {/* Create Event Modal / section */}
        {showCreateModal && (
          <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Create New Event</h2>
            <CreateEventForm onSuccess={() => setShowCreateModal(false)} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${statsQuery.data?.totalRevenue || 0}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {statsQuery.data?.totalBookings || 0}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Active Events</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {statsQuery.data?.totalEvents || 0}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'events' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'bookings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings
          </button>
        </div>

        {/* Events Table */}
        {activeTab === 'events' && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sold/Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {eventsQuery.isLoading ? (
                  <tr><td colSpan={4} className="p-4 text-center">Loading events...</td></tr>
                ) : eventsQuery.data?.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{event.title}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{new Date(event.date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {event.totalSeats - event.availableSeats} / {event.totalSeats}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${event.availableSeats > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {event.availableSeats > 0 ? 'Active' : 'Sold Out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bookings Table */}
        {activeTab === 'bookings' && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {bookingsQuery.isLoading ? (
                  <tr><td colSpan={6} className="p-4 text-center">Loading bookings...</td></tr>
                ) : bookingsQuery.data?.map((booking) => (
                  <tr key={booking.id}>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">{booking.id.slice(0, 8)}...</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900">{booking.user?.email || 'N/A'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{booking.event?.title || 'Unknown Event'}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      ${(booking.discountAmount ?? 0) > 0 && booking.finalAmount != null
                        ? booking.finalAmount
                        : booking.totalAmount}
                      {(booking.discountAmount ?? 0) > 0 && (
                        <span className="block text-[10px] text-gray-400 line-through">
                          was ${booking.totalAmount}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 
                        ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 
                          booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {booking.status === 'CONFIRMED' && (
                        <button 
                          onClick={() => handleCancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
