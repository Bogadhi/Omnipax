import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { StructuredLogger } from '../common/logger/structured-logger.service';

@Injectable()
export class RecommendationService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext('RecommendationService');
  }

  async getRecommendations(userId: string) {
    const cacheKey = `user:${userId}:recommendations`;

    // 1. Try Cache (null-guard: Redis may be unavailable in dev)
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error: any) {
        this.logger.warn(`Redis cache failed: ${error.message}`);
      }
    }

    // 2. Compute Recommendations
    const recommendations = await this.computeRecommendations(userId);

    // 3. Cache Result (120s) — null-guard: Redis may be unavailable in dev
    if (this.redis) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(recommendations),
          'EX',
          120,
        );
      } catch (error: any) {
        this.logger.warn(`Redis set failed: ${error.message}`);
      }
    }

    return recommendations;
  }

  /*
    Scoring Formula:
    + 4 if same event type
    + 3 if same language
    + 2 if same city trending
    + 2 if similar time preference
    + demandMultiplier (1–3 based on occupancy %)
  */
  private async computeRecommendations(userId: string) {
    // Fetch user history to infer preferences
    const userBookings = await this.prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED' },
      include: {
        show: {
          include: { event: true, screen: { include: { theater: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Infer Preferences
    const typeCounts: Record<string, number> = {};
    const langCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const timeCounts: Record<string, number> = {}; // 'morning', 'afternoon', 'evening'

    for (const b of userBookings) {
      const event = b.show.event;
      const theater = b.show.screen.theater;
      const hour = b.show.startTime.getHours();

      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
      langCounts[event.language] = (langCounts[event.language] || 0) + 1;
      cityCounts[theater.city] = (cityCounts[theater.city] || 0) + 1;

      let timeOfDay = 'evening';
      if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      timeCounts[timeOfDay] = (timeCounts[timeOfDay] || 0) + 1;
    }

    const preferredType = this.getTopKey(typeCounts);
    const preferredLang = this.getTopKey(langCounts);
    const preferredCity = this.getTopKey(cityCounts);
    const preferredTime = this.getTopKey(timeCounts);

    // Fetch Candidates (Upcoming Shows)
    // Optimization: Filter by city if known, otherwise widespread
    // For MVP, fetch a candidate set of upcoming shows
    const now = new Date();
    const candidates = await this.prisma.show.findMany({
      where: { startTime: { gt: now } },
      include: {
        event: true,
        screen: { include: { theater: true } },
        _count: { select: { bookings: true } },
      },
      take: 100, // Process top 100 candidates
    });

    // Score Candidates
    const scored = candidates.map((show) => {
      let score = 0;

      // Feature matching
      if (preferredType && show.event.type === preferredType) score += 4;
      if (preferredLang && show.event.language === preferredLang) score += 3;
      if (preferredCity && show.screen.theater.city === preferredCity)
        score += 2;

      const hour = show.startTime.getHours();
      let timeOfDay = 'evening';
      if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      if (preferredTime && timeOfDay === preferredTime) score += 2;

      // Demand Multiplier
      // Occupancy = bookings / totalSeats
      // But _count.bookings includes failed/cancelled? We usually want active.
      // Approximation for MVP:
      const bookedCount = show._count.bookings;
      const capacity = show.screen.totalRows * show.screen.seatsPerRow;
      const occupancy = bookedCount / capacity;

      let demandMultiplier = 1;
      if (occupancy > 0.8) demandMultiplier = 3;
      else if (occupancy > 0.5) demandMultiplier = 2;

      return {
        ...show,
        score: score * demandMultiplier,
      };
    });

    // Sort Descending
    scored.sort((a, b) => b.score - a.score);

    // Return top 10
    return scored.slice(0, 10);
  }

  private getTopKey(counts: Record<string, number>): string | null {
    let max = -1;
    let topKey = null;
    for (const k in counts) {
      if (counts[k] > max) {
        max = counts[k];
        topKey = k;
      }
    }
    return topKey;
  }
}
