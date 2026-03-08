import { Event } from '@/features/events/types';
import { Booking } from '@/features/booking/types';
import { CreateEventDto, TheaterDto, ScreenDto, CreateShowDto } from '@shared';

export interface DashboardStats {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
}

export type CreateEventPayload = CreateEventDto;

export interface AdminEvent extends Event {
  // Add any admin-specific fields if needed
}

export interface AdminBooking extends Booking {
  user?: {
    email: string;
    name: string;
  };
  event?: {
    title: string;
  };
}

export interface AdminShow {
  id: string;
  startTime: string;
  price: number;
  eventTitle: string;
  screen: string;
  theater: string;
  totalBookings: number;
  posterUrl: string;
}

export interface GetShowsResponse {
  shows: AdminShow[];
  nextCursor: string | null;
}

export interface GetShowsFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

export type CreateShowPayload = CreateShowDto;

export type Theater = TheaterDto;
export type Screen = ScreenDto;
