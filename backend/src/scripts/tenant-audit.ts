import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
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

  console.log('=== Tenant Population Audit ===');
  
  for (const model of models) {
    // @ts-ignore
    const total = await prisma[model].count();
    // @ts-ignore
    const withTenant = await prisma[model].count({
      where: { NOT: { tenantId: null } }
    });
    // @ts-ignore
    const withoutTenant = await prisma[model].count({
      where: { tenantId: null }
    });

    console.log(`${model.padEnd(20)}: Total=${total.toString().padEnd(5)} | WithTenant=${withTenant.toString().padEnd(5)} | WithoutTenant=${withoutTenant.toString().padEnd(5)}`);
  }

  const tenants = await prisma.tenant.findMany();
  console.log('\n=== Registered Tenants ===');
  console.log(JSON.stringify(tenants, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
