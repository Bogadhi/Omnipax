import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const slug = dto.slug.toLowerCase();
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    return this.prisma.tenant.create({
      data: {
        slug,
        name: dto.name || slug,
      },
      select: { id: true, slug: true, name: true, createdAt: true },
    });
  }

  getBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, createdAt: true },
    });
  }
}
