import { api } from '@/lib/api';
import { DashboardStats, CreateEventPayload, AdminEvent, AdminBooking, CreateShowPayload, Theater, Screen } from '../types';

export const adminApi = {
  // /admin/summary is the primary stats endpoint for the dashboard
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/admin/summary');
    return response.data;
  },

  getSummary: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/admin/summary');
    return response.data;
  },

  getAllEvents: async (): Promise<AdminEvent[]> => {
    const response = await api.get<AdminEvent[]>('/admin/events');
    return response.data;
  },

  createEvent: async (payload: CreateEventPayload): Promise<AdminEvent> => {
    const response = await api.post<AdminEvent>('/admin/events', payload);
    return response.data;
  },

  getAllBookings: async (): Promise<AdminBooking[]> => {
    const response = await api.get<AdminBooking[]>('/admin/bookings');
    return response.data;
  },

  cancelBooking: async (bookingId: string): Promise<void> => {
    await api.post(`/admin/bookings/${bookingId}/cancel`);
  },

  getShows: async (filters?: import('../types').GetShowsFilters) => {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.cursor) params.append('cursor', filters.cursor);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<import('../types').GetShowsResponse>(`/admin/shows?${params.toString()}`);
    return response.data;
  },

  deleteShow: async (showId: string): Promise<void> => {
    await api.post(`/shows/${showId}/delete`); // Backend uses POST for delete currently
  },

  createShow: async (payload: CreateShowPayload): Promise<void> => {
    await api.post('/shows', payload);
  },

  getTheaters: async (): Promise<Theater[]> => {
    const response = await api.get<Theater[]>('/admin/theaters');
    return response.data;
  },

  getScreens: async (theaterId: string): Promise<Screen[]> => {
    const response = await api.get<Screen[]>(`/admin/theaters/${theaterId}/screens`);
    return response.data;
  },
};
