import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { QrUtil } from '../tickets/qr.util';
import { OfflineScanDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerDevice(name: string, tenantId: string) {
    // 1. Generate random 256-bit deviceKey (32 bytes)
    const rawKey = crypto.randomBytes(32).toString('hex');

    // 2. Salted Hash via bcrypt
    const hashedKey = await bcrypt.hash(rawKey, 10);

    // 3. Store in DB
    const device = await this.prisma.scannerDevice.create({
      data: {
        name,
        deviceKey: hashedKey,
        tenantId,
        isActive: true,
      },
    });

    // 4. Return deviceId and rawKey (ONLY ONCE)
    return {
      deviceId: device.id,
      deviceKey: rawKey,
      name: device.name,
      tenantId: device.tenantId,
    };
  }

  async authenticateDevice(deviceId: string, rawKey: string) {
    const device = await this.prisma.scannerDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    if (!device.isActive) {
      throw new UnauthorizedException('Device is deactivated');
    }

    // Constant-time comparison via bcrypt
    const isMatch = await bcrypt.compare(rawKey, device.deviceKey);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    // Update lastSeenAt
    await this.prisma.scannerDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });

    // Issue Device JWT
    const payload = {
      deviceId: device.id,
      tenantId: device.tenantId,
      role: 'SCANNER_DEVICE',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 900, // 15 minutes
    };
  }

  async deactivateDevice(id: string, tenantId: string) {
    const device = await this.prisma.scannerDevice.findFirst({
      where: { id, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.scannerDevice.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validateDeviceActive(id: string, tenantId: string) {
    const device = await this.prisma.scannerDevice.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!device) {
      return false;
    }

    // Update lastSeenAt asynchronously to avoid blocking the scan flow
    this.prisma.scannerDevice.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    }).catch(err => console.error('Failed to update lastSeenAt', err));

    return true;
  }

  async syncOfflineScans(deviceId: string, tenantId: string, scans: OfflineScanDto[]) {
    // 1. Guard batch size
    if (scans.length > 500) {
      throw new BadRequestException('Batch size exceeds maximum limit of 500');
    }

    // 2. Health check & update lastSeenAt
    const device = await this.prisma.scannerDevice.findFirst({
      where: { id: deviceId, tenantId, isActive: true },
    });

    if (!device) {
      console.error('Sync unauthorized:', {
        deviceId,
        tokenTenantId: tenantId,
        scansCount: scans.length
      });
      throw new UnauthorizedException('Device inactive or unauthorized');
    }

    await this.prisma.scannerDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });

    const results = [];
    const secret = this.configService.get('QR_SECRET') || 'dev_secret_unsecure_override';

    // 3. Process each scan transactionally (per scan to avoid blocking the whole batch)
    for (const scan of scans) {
      const { qrToken, scannedAt } = scan;
      const scannedAtDate = new Date(scannedAt);

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // Idempotency check: ticketId + deviceId + scannedAt
          // First validate token locally to get ticketId info
          const { isValid, payload } = QrUtil.validateToken(qrToken, secret);
          if (!isValid || !payload) {
            return { qrToken, status: 'INVALID' };
          }

          const ticketId = payload.t;

          // Check for exact duplicate in scan log or sync queue
          const existingLog = await tx.ticketScanLog.findFirst({
            where: {
              ticketId,
              deviceId,
              createdAt: scannedAtDate, // Precise timestamp match for idempotency
            },
          });

          if (existingLog) {
            return { qrToken, status: 'DUPLICATE_IGNORED' };
          }

          const existingQueue = await tx.offlineScanQueue.findFirst({
            where: {
              ticketId,
              deviceId,
              scannedAt: scannedAtDate,
            },
          });

          if (existingQueue) {
            return { qrToken, status: 'DUPLICATE_IGNORED' };
          }

          // Lookup ticket via qrHash
          const qrHash = QrUtil.hashToken(qrToken);
          const ticket = await tx.ticket.findUnique({
            where: { qrHash },
          });

          if (!ticket) {
            return { qrToken, status: 'INVALID' };
          }

          if (ticket.tenantId !== tenantId) {
            return { qrToken, status: 'WRONG_TENANT' };
          }

          let finalStatus = 'SUCCESS';

          if (ticket.status === 'USED') {
            finalStatus = 'CONFLICT_ALREADY_USED';
          } else if (ticket.status !== 'ACTIVE') {
            finalStatus = 'INVALID';
          } else {
            // Update ticket
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: 'USED',
                scannedAt: scannedAtDate,
                scannedBy: deviceId,
              },
            });
          }

          // Insert into sync queue for audit
          await tx.offlineScanQueue.create({
            data: {
              ticketId: ticket.id,
              deviceId,
              scannedAt: scannedAtDate,
              synced: true,
              result: finalStatus,
              tenantId,
            },
          });

          // Insert Scan Log
          await tx.ticketScanLog.create({
            data: {
              ticketId: ticket.id,
              scannedBy: deviceId,
              deviceId,
              scanSource: 'DEVICE',
              result: finalStatus,
              tenantId,
              createdAt: scannedAtDate,
            },
          });

          return { qrToken, status: finalStatus };
        });

        results.push(result);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error processing offline scan sync', error);
        results.push({ qrToken, status: 'ERROR', message: error.message });
      }
    }

    return { results };
  }
}

