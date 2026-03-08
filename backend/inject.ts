import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const hash = '$2b$10$5Krh3mNr7BRWwNXMnW8LX.DjqMu2HY8HSdYXWN0BeItXb61d4hhVVi';
  await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { password: hash }
  });
  console.log('Successfully injected exact hash:', hash);
  const check = await prisma.user.findUnique({where: {email: 'admin@example.com'}});
  console.log('Verified stored hash:', check?.password);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
