import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus, Prisma, Role } from '@prisma/client';
import { slugify } from '../utils/slugify';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateTheaterApplicationDto, ReviewTheaterApplicationDto, ReviewAction } from 'ticket-booking-shared';

@Injectable()
export class TheaterOnboardingService {
  private readonly logger = new Logger(TheaterOnboardingService.name);

  constructor(private prisma: PrismaService) {}

  async apply(dto: CreateTheaterApplicationDto) {
    const { theaterName, email, ...rest } = dto;
    const theaterSlug = slugify(theaterName);
 
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: theaterSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Theater name is already taken');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const existingPending = await this.prisma.theaterApplication.findFirst({
      where: { email, status: ApplicationStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException('An application with this email is already pending review');
    }

    return this.prisma.theaterApplication.create({
      data: {
        theaterName,
        theaterSlug,
        ownerName: dto.ownerName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        gstNumber: dto.gstNumber,
        status: ApplicationStatus.PENDING,
      },
      select: {
          theaterName: true,
          status: true,
          createdAt: true,
      }
    });
  }

  async getApplications(status?: ApplicationStatus, skip = 0, take = 10) {
    return this.prisma.theaterApplication.findMany({
      where: status ? { status } : {},
      include: {
        documents: true,
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewApplication(applicationId: string, reviewerId: string, dto: ReviewTheaterApplicationDto) {
    const { action, reviewNotes } = dto;
 
    const application = await this.prisma.theaterApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application has already been reviewed');
    }

    if (action === ReviewAction.APPROVE) {
      return this.approveApplication(application, reviewerId, reviewNotes);
    } else {
      return this.rejectApplication(applicationId, reviewerId, reviewNotes);
    }
  }

  private async approveApplication(application: any, reviewerId: string, reviewNotes?: string) {
    const { theaterName, theaterSlug, email, ownerName } = application;
    const finalTheaterName = theaterName;

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const slugCheck = await tx.tenant.findUnique({ where: { slug: theaterSlug } });
        if (slugCheck) throw new ConflictException('Theater slug became unavailable');
 
        const emailCheck = await tx.user.findUnique({ where: { email } });
        if (emailCheck) throw new ConflictException('User email became unavailable');

        const tenant = await tx.tenant.create({
          data: {
            name: finalTheaterName,
            slug: theaterSlug,
            isActive: true,
            platformFeeEnabled: true,
            platformFeeType: 'PERCENTAGE',
            platformFeeValue: new Prisma.Decimal(2.00),
          },
        });

        await tx.monetizationAudit.create({
          data: {
            tenantId: tenant.id,
            newFeeType: 'PERCENTAGE',
            newPercentage: new Prisma.Decimal(2.00),
            changedByUserId: reviewerId,
          },
        });
 
        const theater = await tx.theater.create({
          data: {
            name: finalTheaterName,
            address: application.address,
            city: application.city,
            tenantId: tenant.id,
          },
        });

        await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name: ownerName,
            role: Role.TENANT_ADMIN,
            tenantId: tenant.id,
            theaterId: theater.id,
            forcePasswordReset: true,
          },
        });
 
        await tx.theaterApplication.update({
          where: { id: application.id },
          data: {
            status: ApplicationStatus.APPROVED,
            reviewNotes,
            reviewedById: reviewerId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
            data: {
                userId: reviewerId,
                action: 'APPROVE_THEATER_APPLICATION',
                metadata: { applicationId: application.id, tenantId: tenant.id } as Prisma.JsonObject,
            }
        });

        this.logger.log(`Approved theater application ${application.id}. Credentials: ${email} / ${tempPassword}`);
        
        return {
          status: 'APPROVED',
          email,
          tempPassword,
          tenantId: tenant.id,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to approve application ${application.id}: ${error.message}`);
      throw error;
    }
  }

  private async rejectApplication(applicationId: string, reviewerId: string, reviewNotes?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.theaterApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
          reviewNotes,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'REJECT_THEATER_APPLICATION',
          metadata: { applicationId, reviewNotes } as Prisma.JsonObject,
        }
      });

      return updatedApp;
    });
  }
}
