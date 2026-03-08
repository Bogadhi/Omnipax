import { api } from '@/lib/api';
import { Event as BaseEvent, EventFilters, PaginatedResponse } from '../types';

/*
  🔥 Extended relational + backend-complete Event type
  This must match Prisma include:
  event -> shows -> screen -> theater
*/

export interface Theater {
  id: string;
  name: string;
  location?: string;
}

export interface Screen {
  id: string;
  name: string;
  theater: Theater;
}

export interface Show {
  id: string;
  startTime: string;
  screen: Screen;
}

export type Event = BaseEvent & {
  type?: 'MOVIE' | 'CONCERT' | 'EVENT' | 'GENERAL_ADMISSION';
  language?: string;
  posterUrl?: string;
  bannerUrl?: string;
  description?: string;
  duration?: number;
  genre?: string;
  shows?: Show[];
};

export const eventsApi = {
  getEvents: async (
    filters: EventFilters = {}
  ): Promise<PaginatedResponse<Event>> => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.date) params.append('date', filters.date);
    
    if (filters.minPrice !== undefined && filters.minPrice !== ('' as any)) {
      params.append('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== ('' as any)) {
      params.append('maxPrice', filters.maxPrice.toString());
    }
    
    if (filters.cursor) params.append('cursor', filters.cursor);

    const response = await api.get<PaginatedResponse<Event>>(
      `/events?${params.toString()}`
    );

    return response.data;
  },

  getEventById: async (id: string): Promise<Event> => {
    const response = await api.get<Event>(`/events/${id}`);
    return response.data;
  },
};