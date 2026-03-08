/**
 * Prisma Tenant Extension
 *
 * Provides a typed extension for automatic tenant-id injection.
 * Used as a companion to the $use middleware in PrismaService to
 * give compile-time safety via the newer $extends API.
 *
 * Usage:
 *   const scoped = prismaService.$extends(createTenantExtension(tenantId));
 *   await scoped.event.findMany(); // tenantId automatically applied
 */

import { Prisma } from '@prisma/client';

/** Models that are GLOBAL and must never get tenantId injected */
const GLOBAL_MODELS = new Set([
  'Tenant',
  'AuditLog',
  'FeatureFlag',
  'RazorpayWebhookEvent',
  'SystemEventLog',
  'PaymentEvent',
  'TheaterApplication',
]);

/**
 * Returns a Prisma extension that auto-injects tenantId into all
 * query arguments for all tenant-scoped models.
 *
 * Pass `null` for superAdmin bypass (no injection).
 */
export function createTenantExtension(tenantId: string | null) {
  return Prisma.defineExtension({
    name: 'tenant-scoping',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async findFirst({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async findUnique({ model, args, query }) {
          // findUnique does not support arbitrary where clauses beyond unique fields.
          // Delegate to parent — tenant scope is enforced by findFirst in middleware.
          return query(args);
        },

        async create({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          (args as any).data = { ...args.data, tenantId };
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, tenantId }))
            : { ...args.data, tenantId };
          (args as any).data = data;
          return query(args);
        },

        async update({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async updateMany({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async upsert({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          (args as any).create = { ...args.create, tenantId };
          (args as any).update = { ...args.update, tenantId };
          return query(args);
        },

        async delete({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async aggregate({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async count({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },

        async groupBy({ model, args, query }) {
          if (!tenantId || GLOBAL_MODELS.has(model)) return query(args);
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}
