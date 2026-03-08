import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../common/logger/structured-logger.service';
import { Role } from '@prisma/client';

@WebSocketGateway({
  namespace: '/admin',
  cors: {
    origin: '*',
  },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: StructuredLogger,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('AdminGateway');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload.role !== Role.ADMIN) {
        throw new WsException('Forbidden: Admins only');
      }

      // Store user info in socket data
      client.data.user = payload;
      this.logger.log(`Admin connected: ${client.id} (${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | undefined {
    // 1. Check handshake auth
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    // 2. Check query param
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }
    // 3. Check headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    return undefined;
  }

  @SubscribeMessage('monitor_show')
  handleMonitorShow(
    @MessageBody() data: { showId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Double check auth just in case (though connection handles it)
    if (!client.data.user) {
      throw new WsException('Unauthorized');
    }

    client.join(data.showId);
    this.logger.log(`Admin ${client.id} monitoring show: ${data.showId}`);
    return { event: 'monitoring_started', data: data.showId };
  }

  /* ===============================
     EMITTERS
  =============================== */

  emitSeatLocked(showId: string, seatId: string, userId: string) {
    this.server?.to(showId).emit('seat_locked', {
      showId,
      seatId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  emitSeatReleased(showId: string, seatId: string) {
    this.server?.to(showId).emit('seat_released', {
      showId,
      seatId,
      timestamp: new Date().toISOString(),
    });
  }

  emitBookingConfirmed(showId: string, bookingId: string, seatIds: string[]) {
    this.server?.to(showId).emit('booking_confirmed', {
      showId,
      bookingId,
      seatIds,
      timestamp: new Date().toISOString(),
    });
  }
}
