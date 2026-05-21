const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:oGoI7PqjJjyw7i5b@db.jzzsobhieahwnkihybvm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // 1. Check if get_institution_id is SECURITY DEFINER (critical!)
  const fn = await client.query(`
    SELECT proname, prosecdef, prosrc
    FROM pg_proc WHERE proname = 'get_institution_id'
  `);
  console.log('=== get_institution_id() ===');
  console.log('  SECURITY DEFINER:', fn.rows[0]?.prosecdef);
  console.log('  Body:', fn.rows[0]?.prosrc);

  // 2. Show all policies on all tables
  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, cmd
  `);
  console.log('\n=== ALL RLS Policies ===');
  policies.rows.forEach(r =>
    console.log(`  [${r.tablename}] [${r.cmd}] ${r.policyname}`)
  );

  // 3. Check RLS enabled on each table
  const rls = await client.query(`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname IN ('institutions','profiles','faculty_settings','rooms','workloads','generated_timetables','substitute_requests','notifications','constraint_templates')
    ORDER BY relname
  `);
  console.log('\n=== RLS Enabled ===');
  rls.rows.forEach(r => console.log(`  ${r.relname}: RLS=${r.relrowsecurity} FORCE=${r.relforcerowsecurity}`));

  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
