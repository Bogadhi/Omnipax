import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async testPrisma() {
    return this.prisma.event.findMany({
      take: 1,
      include: {
        shows: {
          include: {
            screen: { include: { theater: true } },
            seatAvailability: {
              include: { seat: true },
              orderBy: [{ seat: { row: 'asc' } }, { seat: { number: 'asc' } }],
            },
          },
        },
      },
    });
  }
}
