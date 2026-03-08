import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'starpass' }
  });

  if (!tenant) {
    console.log('Tenant "starpass" not found');
    return;
  }

  console.log(`Tenant ID: ${tenant.id}`);

  const events = await prisma.event.findMany({
    where: { tenantId: tenant.id },
    include: {
      shows: {
        include: {
          seatAvailability: {
            include: { seat: true },
            take: 5
          }
        }
      }
    }
  });

  console.log(JSON.stringify(events, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
