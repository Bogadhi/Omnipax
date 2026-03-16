import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { SeatUpdatesGateway } from '../realtime/seat-updates.gateway';
import { RedisService } from '../redis/redis.service';
import { SeatLockExpiryJobData, SeatLockPayload } from './seat-lock.types';

@Injectable()
export class SeatLocksService {
  private readonly seatLockTtlSeconds: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly seatUpdatesGateway: SeatUpdatesGateway,
    @InjectQueue('seat-lock-expiry')
    private readonly seatLockExpiryQueue: Queue<SeatLockExpiryJobData>,
  ) {
    this.seatLockTtlSeconds = Number(
      this.configService.getOrThrow<string>('SEAT_LOCK_TTL_SECONDS'),
    );
  }

  async lockSeat(
    tenantSlug: string,
    eventId: string,
    seatId: string,
    userId: string,
  ) {
    const redis = this.redisService.getClient();
    const key = this.getLockKey(tenantSlug, eventId, seatId);
    const token = randomUUID();
    const payload: SeatLockPayload = {
      tenantSlug,
      eventId,
      seatId,
      userId,
      token,
      lockedAt: new Date().toISOString(),
    };

    const lockResult = await redis.set(
      key,
      JSON.stringify(payload),
      'PX',
      this.seatLockTtlSeconds * 1000,
      'NX',
    );

    if (lockResult !== 'OK') {
      throw new ConflictException('Seat is already locked');
    }

    await this.seatLockExpiryQueue.add('expire', {
      tenantSlug,
      eventId,
      seatId,
      token,
    }, {
      delay: this.seatLockTtlSeconds * 1000,
      removeOnComplete: true,
      removeOnFail: 50,
      jobId: `${key}:${token}`,
    });

    this.seatUpdatesGateway.emitSeatLocked(tenantSlug, eventId, seatId, userId);

    return {
      seatId,
      eventId,
      expiresInSeconds: this.seatLockTtlSeconds,
    };
  }

  async unlockSeat(
    tenantSlug: string,
    eventId: string,
    seatId: string,
    userId: string,
    force = false,
  ) {
    const redis = this.redisService.getClient();
    const key = this.getLockKey(tenantSlug, eventId, seatId);
    const existing = await redis.get(key);

    if (!existing) {
      return { released: false };
    }

    const lock = this.parseLock(existing);

    if (!force && lock.userId !== userId) {
      throw new ForbiddenException('Cannot unlock seats locked by another user');
    }

    await redis.del(key);
    this.seatUpdatesGateway.emitSeatUnlocked(
      tenantSlug,
      eventId,
      seatId,
      force ? 'system' : 'user',
    );

    return { released: true };
  }

  async validateLocksOwned(
    tenantSlug: string,
    eventId: string,
    seatIds: string[],
    userId: string,
  ) {
    const locks = await Promise.all(
      seatIds.map(async (seatId) => {
        const key = this.getLockKey(tenantSlug, eventId, seatId);
        const value = await this.redisService.getClient().get(key);
        return value ? this.parseLock(value) : null;
      }),
    );

    const invalid = locks.some((lock) => !lock || lock.userId !== userId);
    if (invalid) {
      throw new ConflictException(
        'All seats must be actively locked by the same user before booking',
      );
    }
  }

  async releaseMany(
    tenantSlug: string,
    eventId: string,
    seatIds: string[],
    userId: string,
  ) {
    await Promise.all(
      seatIds.map((seatId) =>
        this.unlockSeat(tenantSlug, eventId, seatId, userId, true),
      ),
    );
  }

  async getLocksForEvent(tenantSlug: string, eventId: string) {
    const redis = this.redisService.getClient();
    const keys = await redis.keys(`seat-lock:${tenantSlug}:${eventId}:*`);
    if (!keys.length) {
      return [] as SeatLockPayload[];
    }

    const values = await redis.mget(...keys);
    return values
      .filter((value): value is string => Boolean(value))
      .map((value) => this.parseLock(value));
  }

  async handleExpiryJob(data: SeatLockExpiryJobData) {
    const key = this.getLockKey(data.tenantSlug, data.eventId, data.seatId);
    const redis = this.redisService.getClient();
    const currentValue = await redis.get(key);

    if (!currentValue) {
      this.seatUpdatesGateway.emitSeatUnlocked(
        data.tenantSlug,
        data.eventId,
        data.seatId,
        'expired',
      );
      return;
    }

    const lock = this.parseLock(currentValue);
    if (lock.token === data.token) {
      const ttl = await redis.pttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        this.seatUpdatesGateway.emitSeatUnlocked(
          data.tenantSlug,
          data.eventId,
          data.seatId,
          'expired',
        );
      }
    }
  }

  private getLockKey(tenantSlug: string, eventId: string, seatId: string) {
    return `seat-lock:${tenantSlug}:${eventId}:${seatId}`;
  }

  private parseLock(value: string): SeatLockPayload {
    return JSON.parse(value) as SeatLockPayload;
  }
}
