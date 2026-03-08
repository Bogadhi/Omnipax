import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  console.log('--- Model: Show ---');
  try {
    const show = await prisma.show.findFirst();
    console.log('Success!', show);
  } catch (e: any) {
    console.error('FAILED!', e.message);
  }

  await prisma.$disconnect();
}

main();
