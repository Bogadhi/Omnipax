export interface SeatLockPayload {
  tenantSlug: string;
  eventId: string;
  seatId: string;
  userId: string;
  token: string;
  lockedAt: string;
}

export interface SeatLockExpiryJobData {
  tenantSlug: string;
  eventId: string;
  seatId: string;
  token: string;
}
