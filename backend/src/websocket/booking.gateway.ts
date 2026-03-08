import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StructuredLogger } from '../common/logger/structured-logger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class BookingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly logger: StructuredLogger) {
    this.logger.setContext('BookingGateway');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_show')
  handleJoinShow(
    @MessageBody() data: { showId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.showId);
    this.logger.log(`Client ${client.id} joined show room: ${data.showId}`);
    return { event: 'joined_show', data: data.showId };
  }

  emitSeatLocked(showId: string, seatId: string, userId: string) {
    this.server?.to(showId).emit('seat_locked', { showId, seatId, userId });
    this.logger.log(`[WS] Seat locked emitted: ${seatId} for show ${showId}`);
  }

  emitSeatReleased(showId: string, seatId: string) {
    this.server?.to(showId).emit('seat_released', { showId, seatId });
    this.logger.log(`[WS] Seat released emitted: ${seatId} for show ${showId}`);
  }

  emitBookingConfirmed(showId: string, bookingId: string, seatIds: string[]) {
    this.server
      ?.to(showId)
      .emit('booking_confirmed', { showId, bookingId, seatIds });
    this.logger.log(
      `[WS] Booking confirmed emitted: ${bookingId} for show ${showId}`,
    );
  }

  emitSeatBooked(showId: string, seatId: string, userId: string) {
    this.server?.to(showId).emit('seat_booked', { showId, seatId, userId });
    this.logger.log(`[WS] Seat booked emitted: ${seatId} for show ${showId}`);
  }
}
