import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('super123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'super@example.com' },
    update: {
      role: Role.SUPER_ADMIN,
      isVerified: true,
    },
    create: {
      email: 'super@example.com',
      password: password,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isVerified: true,
    },
  });
  console.log('✅ Super Admin created:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
