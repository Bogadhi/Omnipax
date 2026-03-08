import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async addToWishlist(userId: string, eventId: string) {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Event already in wishlist');
    }

    return this.prisma.wishlist.create({
      data: {
        userId,
        eventId,
        tenantId,
      },
      include: {
        event: true,
      },
    });
  }

  async removeFromWishlist(userId: string, eventId: string) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.wishlist.deleteMany({
      where: {
        userId,
        eventId,
        tenantId,
      },
    });
  }

  async getUserWishlist(userId: string) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.wishlist.findMany({
      where: {
        userId,
        tenantId,
      },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
