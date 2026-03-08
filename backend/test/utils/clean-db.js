"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.cleanDatabase = cleanDatabase;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
async function cleanDatabase() {
    const tablenames = await exports.prisma.$queryRaw `SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');
    try {
        await exports.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
    }
    catch (error) {
        console.log({ error });
    }
}
//# sourceMappingURL=clean-db.js.map