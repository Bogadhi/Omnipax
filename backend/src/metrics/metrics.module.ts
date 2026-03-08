import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MetricsController],
})
export class MetricsModule {}
