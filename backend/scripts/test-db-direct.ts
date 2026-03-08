
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:change_me_in_production_password@postgres:5432/ticket_booking'
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected successfully to Postgres direct!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('❌ Direct connection failed:', err.message);
    process.exit(1);
  }
}

run();
