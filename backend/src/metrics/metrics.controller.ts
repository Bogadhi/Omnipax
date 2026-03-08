import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
// import { Roles } from '../auth/roles.decorator';
// import { Role } from '@prisma/client';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';

@Controller('metrics')
export class MetricsController {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get('extended')
  //   @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment for security in real prod
  //   @Roles(Role.ADMIN)
  async getExtendedMetrics() {
    // 1. DB Connection Stats (Postgres specific)
    const dbStats: any = await this.prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active';
    `;

    // 2. Redis Stats
    const redisInfo = await this.redis.info();

    // 3. Parse Redis Info (simplified)
    const redisMemory =
      redisInfo.match(/used_memory_human:(\w+\.\w+)/)?.[1] || 'unknown';
    const redisClients =
      redisInfo.match(/connected_clients:(\d+)/)?.[1] || 'unknown';

    return {
      database: {
        active_connections: dbStats[0]?.active_connections
          ? Number(dbStats[0].active_connections)
          : 0,
        pool_mode: 'transaction (via pgbouncer)',
      },
      redis: {
        used_memory_human: redisMemory,
        connected_clients: Number(redisClients),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
