"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });
    console.log('--- Model: Show ---');
    try {
        const show = await prisma.show.findFirst();
        console.log('Success!', show);
    }
    catch (e) {
        console.error('FAILED!', e.message);
    }
    await prisma.$disconnect();
}
main();
//# sourceMappingURL=debug-prisma.js.map