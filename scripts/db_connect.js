const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:oGoI7PqjJjyw7i5b@db.jzzsobhieahwnkihybvm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('✅ Connected! Tables:', res.rows.map(x => x.tablename).join(', '));
  
  // Test RLS function
  const rls = await client.query("SELECT proname FROM pg_proc WHERE proname = 'get_institution_id'");
  console.log('RLS function exists:', rls.rows.length > 0 ? 'YES' : 'NO');
  
  await client.end();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
