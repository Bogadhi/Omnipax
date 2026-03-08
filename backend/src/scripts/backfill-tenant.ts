import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting tenant backfill...');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create default tenant
    const defaultTenant = await tx.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        slug: 'default',
        name: 'Default Tenant',
      },
    });

    console.log(`Default tenant created/found: ${defaultTenant.id}`);

    const models = [
      'user',
      'theater',
      'screen',
      'event',
      'show',
      'seat',
      'seatAvailability',
      'booking',
      'bookingSeat',
      'coupon',
      'giftCard',
      'wishlist',
    ];

    for (const modelName of models) {
      console.log(`Backfilling ${modelName}...`);
      // @ts-ignore - dynamic model access
      const count = await tx[modelName].updateMany({
        where: { tenantId: null },
        data: { tenantId: defaultTenant.id },
      });
      console.log(`Updated ${count.count} rows in ${modelName}.`);
    }

    return defaultTenant;
  });

  console.log('Backfill completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
