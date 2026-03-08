import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/services/tenant-context.service';

/**
 * Models that are GLOBAL and must NEVER receive tenantId auto-injection.
 * These are either platform-level or have no tenant FK.
 */
const GLOBAL_MODELS = new Set([
  'Tenant',
  'AuditLog',
  'FeatureFlag',
  'RazorpayWebhookEvent',
  'SystemEventLog',
  'PaymentEvent',
  'TheaterApplication',
  'User', // User lookup is global (email lookup on login spans tenants)
]);

/**
 * Actions that apply tenantId to the WHERE clause
 */
const WHERE_SCOPED_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'aggregate',
  'count',
  'groupBy',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log: process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    this.registerTenantMiddleware();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PrismaService connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected');
  }

  /**
   * Get a tenant-scoped Prisma client for use in raw transaction contexts.
   * Prefer this when calling $transaction() to ensure all nested ops are scoped.
   */
  getScopedClient(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            if (GLOBAL_MODELS.has(model)) return query(args);

            if (WHERE_SCOPED_ACTIONS.has(operation)) {
              args.where = { ...args.where, tenantId };
            }

            if (operation === 'create') {
              args.data = { ...args.data, tenantId };
            }

            if (operation === 'createMany') {
              const data = Array.isArray(args.data)
                ? args.data.map((d: any) => ({ ...d, tenantId }))
                : { ...args.data, tenantId };
              args.data = data;
            }

            if (operation === 'upsert') {
              args.create = { ...args.create, tenantId };
              args.update = { ...args.update, tenantId };
            }

            return query(args);
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // $use middleware: catches ALL operations including transactional ones.
  // This is the primary enforcement layer.
  // ─────────────────────────────────────────────────────────────────────────
  private registerTenantMiddleware() {
    this.$use(async (params, next) => {
      // Prevent infinite recursion: raw queries shouldn't trigger RLS config queries
      if (params.action === 'executeRaw' || params.action === 'queryRaw') {
        return next(params);
      }

      const model = params.model as string;

      // 1. Global models: never inject
      if (GLOBAL_MODELS.has(model)) {
        return next(params);
      }

      // 2. Get tenant context (AsyncLocalStorage)
      const store = this.tenantContext.getStore();

      // 3. SUPER_ADMIN bypass: skip scoping, proceed globally
      if (store?.isSuperAdmin) {
        return next(params);
      }

      const tenantId = store?.tenantId;

      // 4. No tenant context (background jobs, seed, health endpoint) → skip
      if (!tenantId) {
        return next(params);
      }

      // 5. Convert findUnique → findFirst to allow extra WHERE fields
      if (params.action === 'findUnique') {
        params.action = 'findFirst';
      }

      // 6. Inject tenantId into WHERE clause
      if (WHERE_SCOPED_ACTIONS.has(params.action)) {
        // Special bypass: Ticket lookup by qrHash (validated via HMAC separately)
        if (model === 'Ticket' && params.args?.where?.qrHash) {
          return next(params);
        }

        params.args = {
          ...params.args,
          where: {
            ...params.args?.where,
            tenantId,
          },
        };
      }

      // 7. Inject tenantId into CREATE data
      if (params.action === 'create') {
        params.args = {
          ...params.args,
          data: {
            ...params.args?.data,
            tenantId,
          },
        };
      }

      // 8. Inject tenantId into CREATEMANY data
      if (params.action === 'createMany') {
        const data = Array.isArray(params.args?.data)
          ? params.args.data.map((d: any) => ({ ...d, tenantId }))
          : { ...params.args?.data, tenantId };
        params.args = { ...params.args, data };
      }

      // 9. Inject tenantId into UPSERT
      if (params.action === 'upsert') {
        params.args = {
          ...params.args,
          create: { ...params.args?.create, tenantId },
          update: { ...params.args?.update, tenantId },
        };
      }

      // 10. Database-Level RLS Enforcement — ONLY when there is an active tenant context.
      //
      // ⚠️ PREVIOUS BUG: This block was reached even when tenantId was null (background jobs,
      //    health checks, cron workers). For every such query, we were firing 2 extra DB round-trips
      //    (executeRawUnsafe × 2), saturating the connection pool under load.
      //
      // FIX: Skip entirely if tenantId is absent. Background workers run without RLS enforcement
      //    (they already operate without tenant scope), which is the correct and intended behaviour.
      if (tenantId) {
        // Use SET LOCAL so the setting is scoped to the current transaction only.
        // This avoids session-level pollution across pooled connections.
        await this.$executeRawUnsafe(
          `SELECT set_config('app.tenant_id', '${tenantId}', true)`,
        );
        await this.$executeRawUnsafe(
          `SELECT set_config('app.bypass_rls', '${store?.isSuperAdmin ? 'true' : 'false'}', true)`,
        );
      }

      return next(params);
    });
  }
}

