// Triggering rebuild for diagnostic logging

// ─── Dev-only Redis noise suppression ────────────────────────────────────────
// BullMQ bundles its own copy of ioredis (node_modules/bullmq/node_modules/ioredis)
// which does NOT inherit our retryStrategy setting. When Redis is unavailable,
// its internal promise rejections ("Connection is closed.") and ECONNREFUSED
// errors surface as unhandledRejections that Node prints to console by default.
// In dev, we silence only those specific Redis-origin errors; everything else
// still crashes the process as expected.
if (process.env.NODE_ENV !== 'production') {
  const isRedisError = (err: any): boolean => {
    if (!err) return false;
    return (
      (err.code === 'ECONNREFUSED' && err.port === 6379) ||
      err.message === 'Connection is closed.'               ||
      err.message?.startsWith('connect ECONNREFUSED 127.0.0.1:6379')
    );
  };

  process.on('unhandledRejection', (reason: unknown) => {
    if (isRedisError(reason)) return; // suppress — Redis is simply not running
    console.error('[UNHANDLED REJECTION]', reason);
  });

  process.on('uncaughtException', (err: Error) => {
    if (isRedisError(err)) return; // suppress
    console.error('[UNCAUGHT EXCEPTION]', err);
    process.exit(1);
  });
}

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { BookingService } from './booking/booking.service';

const logFile = path.join(process.cwd(), 'debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Preserve original console
const originalLog = console.log;
const originalError = console.error;

// Override console.log
console.log = (...args: any[]) => {
  const msg = `[LOG ${new Date().toISOString()}] ${args.join(' ')}\n`;
  logStream.write(msg);
  originalLog.apply(console, args);
};

// Override console.error — includes Redis noise filter for dev
console.error = (...args: any[]) => {
  // BullMQ's bundled ioredis calls console.error directly when Redis is
  // unavailable. Intercept and suppress those specific messages in dev so
  // they don't flood the terminal when Redis simply isn't running locally.
  if (process.env.NODE_ENV !== 'production') {
    const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    if (
      text.includes('ECONNREFUSED 127.0.0.1:6379') ||
      text.includes('Connection is closed.')
    ) {
      return; // Suppress — Redis is not running, this is expected in dev
    }
  }
  const msg = `[ERR ${new Date().toISOString()}] ${args.join(' ')}\n`;
  logStream.write(msg);
  originalError.apply(console, args);
};


async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    console.log(`\n🔍 DIAGNOSTIC INFO:`);
    console.log(`   - Main file: ${__filename}`);
    console.log(`   - Root dir:  ${process.cwd()}`);
    try {
      const prismaPath = require.resolve('@prisma/client');
      console.log(`   - Prisma Client: ${prismaPath}`);
    } catch (_e) {
      console.log(`   - Prisma Client: NOT FOUND via require.resolve`);
    }
    console.log(`================================================\n`);

    const configService = app.get(ConfigService);

    /**
     * 🩺 Runtime Diagnosis
     */
    const port = configService.get<number>('PORT') || 5001;
    const isDocker = fs.existsSync('/.dockerenv');
    const isWsl =
      process.platform === 'linux' &&
      fs
        .readFileSync('/proc/version', 'utf8')
        .toLowerCase()
        .includes('microsoft');
    const nodeVersion = process.version;
    const platform = process.platform;

    // Mask DB URL
    const dbUrl = configService.get<string>('DATABASE_URL') || '';
    const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

    console.log('================================================');
    console.log('🚀 STARPASS BACKEND RUNTIME STATUS');
    console.log('================================================');
    console.log(`📍 Port:        ${port}`);
    console.log(`🌐 Host:        0.0.0.0`);
    console.log(`📦 Container:   ${isDocker ? 'YES (Docker)' : 'NO'}`);
    console.log(`🐧 WSL:         ${isWsl ? 'YES' : 'NO'}`);
    console.log(`💻 Platform:    ${platform}`);
    console.log(`🟢 Node:        ${nodeVersion}`);
    console.log(`🗄️ Database:    ${maskedDbUrl}`);
    console.log('================================================');

    /**
     * 📖 Swagger
     */
    const config = new DocumentBuilder()
      .setTitle('StarPass Backend API')
      .setDescription('Production-grade Ticket Booking Platform API')
      .setVersion('1.0')
      .addTag('auth', 'Authentication and OTP')
      .addTag('admin', 'Administrative operations')
      .addTag('booking', 'Seat locking and booking')
      .addBearerAuth()
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-tenant-slug',
          in: 'header',
          description: 'Multi-tenant resolution header (Required: starpass)',
        },
        'x-tenant-slug',
      )
      .addSecurityRequirements('x-tenant-slug')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    console.log('--- [DEBUG] Swagger setup complete ---');

    /**
     * 🔐 Security
     */
    app.use(helmet());
    app.use(compression());
    console.log('--- [DEBUG] Security middlewares complete ---');

    /**
     * ✅ FIXED CORS CONFIG (Multi-Tenant Safe)
     */
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'x-tenant-slug',
      ],
    });
    console.log('--- [DEBUG] CORS setup complete ---');

    /**
     * 📡 WebSocket (Redis)
     */
    const redisIoAdapter = new RedisIoAdapter(app, configService);
    console.log('--- [DEBUG] Attempting Redis connection ---');
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    console.log('--- [DEBUG] Redis adapter setup complete ---');

    /**
     * 📦 Validation
     */
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    /**
     * 🛑 Global Exception Filter
     */
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
    console.log('--- [DEBUG] Filters and Pipes complete ---');

    /**
     * 🔎 Critical ENV Check
     */
    const requiredEnv = [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ];

    for (const envVar of requiredEnv) {
      if (!configService.get(envVar)) {
        console.error(`❌ MISSING CRITICAL ENV VAR: ${envVar}`);
        process.exit(1);
      }
    }

    /**
     * 🛠 Dev Auto Repair
     */
    if (
      configService.get('NODE_ENV') === 'development' ||
      !configService.get('NODE_ENV')
    ) {
      const bookingService = app.get(BookingService);
      console.log('🔄 Running bulk show repair...');
      try {
        await bookingService.repairAllShows();
      } catch (repairErr: any) {
        const isProd = configService.get('NODE_ENV') === 'production';
        if (isProd) {
          // Production: re-throw — a broken DB at startup is a hard fail
          throw repairErr;
        }
        // Development: skip repair, warn, and continue
        console.warn(
          `⚠️  repairAllShows() skipped — database unavailable: ${repairErr.message}. ` +
          `Server will start without running the repair. Check your DATABASE_URL.`,
        );
      }
    }


    /**
     * 🚀 Start Server
     */

    console.log(process.env.DATABASE_URL);
    await app.listen(port, '0.0.0.0');

    console.log('🚦 All routes registered and server is live.');

    console.log(`\n✅ Server is LIVE and listening for connections!`);
    console.log(`   - http://localhost:${port}`);
    console.log(`   - http://127.0.0.1:${port}`);
    console.log(`================================================\n`);
  } catch (err) {
    console.error('❌ Error during bootstrap:', err);
    process.exit(1);
  }
}

// ─── Memory Watchdog ─────────────────────────────────────────────────────────
// Monitors heap utilisation every 30 seconds.
// Exits cleanly at 70% of the heap cap so the process manager restarts before
// reaching the hard V8 OOM limit.
//
// Threshold: --max-old-space-size=1536 MB × 0.70 = ~1075 MB
// Override via HEAP_WARN_THRESHOLD_MB env variable if needed.
const HEAP_WARN_THRESHOLD_MB = parseInt(
  process.env.HEAP_WARN_THRESHOLD_MB ?? '1075',
  10,
);

setInterval(() => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const rssMB = Math.round(used.rss / 1024 / 1024);

  // Always log at debug level so heap trend is visible in logs
  console.log(
    `[WATCHDOG] Heap: ${heapUsedMB}/${heapTotalMB} MB used/total | RSS: ${rssMB} MB | Threshold: ${HEAP_WARN_THRESHOLD_MB} MB`,
  );

  if (heapUsedMB > HEAP_WARN_THRESHOLD_MB) {
    console.error(
      `[WATCHDOG] 🚨 Heap ${heapUsedMB} MB exceeds threshold ${HEAP_WARN_THRESHOLD_MB} MB ` +
      `(RSS: ${rssMB} MB). Exiting cleanly to prevent OOM crash.`,
    );
    process.exit(1); // Process manager restarts automatically
  }
}, 30_000);


bootstrap().catch((err) => {
  console.error('❌ Fatal bootstrap error:', err);
  process.exit(1);
});
