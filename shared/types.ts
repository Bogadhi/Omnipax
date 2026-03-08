export enum EventType {
  MOVIE = 'MOVIE',
  CONCERT = 'CONCERT',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Event {
  id: string;
  title: string;
  type: EventType;
  posterUrl?: string;
}
