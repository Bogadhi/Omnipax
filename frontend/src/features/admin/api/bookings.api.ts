import { api } from '@/lib/api';

export const adminBookingsApi = {
  getBookings: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/admin/bookings', { params });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/admin/analytics/overview');
    return response.data;
  },
};
