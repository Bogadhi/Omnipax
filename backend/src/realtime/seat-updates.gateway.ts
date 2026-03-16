import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/seats',
  cors: { origin: '*' },
})
export class SeatUpdatesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(_client: Socket) {
    return;
  }

  handleDisconnect(_client: Socket) {
    return;
  }

  @SubscribeMessage('join_event')
  handleJoinEvent(
    @MessageBody() payload: { tenantSlug: string; eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(this.buildRoom(payload.tenantSlug, payload.eventId));
    return { joined: true };
  }

  emitSeatLocked(tenantSlug: string, eventId: string, seatId: string, userId: string) {
    this.server.to(this.buildRoom(tenantSlug, eventId)).emit('seat_update', {
      type: 'SEAT_LOCKED',
      seatId,
      userId,
      eventId,
      tenantSlug,
    });
  }

  emitSeatUnlocked(
    tenantSlug: string,
    eventId: string,
    seatId: string,
    reason: 'user' | 'expired' | 'system',
  ) {
    this.server.to(this.buildRoom(tenantSlug, eventId)).emit('seat_update', {
      type: 'SEAT_UNLOCKED',
      seatId,
      eventId,
      tenantSlug,
      reason,
    });
  }

  emitSeatsReserved(tenantSlug: string, eventId: string, seatIds: string[]) {
    this.server.to(this.buildRoom(tenantSlug, eventId)).emit('seat_update', {
      type: 'SEATS_RESERVED_PENDING_PAYMENT',
      seatIds,
      eventId,
      tenantSlug,
    });
  }

  emitBookingConfirmed(tenantSlug: string, eventId: string, seatIds: string[]) {
    this.server.to(this.buildRoom(tenantSlug, eventId)).emit('seat_update', {
      type: 'BOOKING_CONFIRMED',
      seatIds,
      eventId,
      tenantSlug,
    });
  }

  emitBookingExpired(tenantSlug: string, eventId: string, seatIds: string[]) {
    this.server.to(this.buildRoom(tenantSlug, eventId)).emit('seat_update', {
      type: 'BOOKING_EXPIRED',
      seatIds,
      eventId,
      tenantSlug,
    });
  }

  private buildRoom(tenantSlug: string, eventId: string) {
    return `${tenantSlug}:${eventId}`;
  }
}
