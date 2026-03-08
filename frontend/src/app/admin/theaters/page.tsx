'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin.api';
import RoleGuard from '@/components/auth/RoleGuard';

export default function AdminTheatersPage() {
  const { data: theaters, isLoading } = useQuery({
    queryKey: ['admin', 'theaters'],
    queryFn: adminApi.getTheaters,
  });

  return (
    <RoleGuard role="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Theaters Management</h1>
          <p className="text-gray-400">View and manage theaters and their screens</p>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading theaters...</p>
        ) : (
          <div className="grid gap-4">
            {theaters?.length === 0 && (
              <p className="text-gray-500">No theaters found.</p>
            )}
            {theaters?.map((theater) => (
              <div
                key={theater.id}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{theater.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">{theater.city} — {theater.address}</p>
                  </div>
                  <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full">
                    {theater.screens?.length ?? 0} screen{theater.screens?.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {theater.screens && theater.screens.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {theater.screens.map((screen) => (
                      <div
                        key={screen.id}
                        className="bg-gray-800 rounded p-3 text-sm"
                      >
                        <p className="font-medium text-white">{screen.name}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {screen.totalRows} rows × {screen.seatsPerRow} seats
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
