"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const client = new pg_1.Client({
    connectionString: 'postgresql://postgres:change_me_in_production_password@postgres:5432/ticket_booking'
});
async function run() {
    try {
        await client.connect();
        console.log('✅ Connected successfully to Postgres direct!');
        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        await client.end();
    }
    catch (err) {
        console.error('❌ Direct connection failed:', err.message);
        process.exit(1);
    }
}
run();
//# sourceMappingURL=test-db-direct.js.map