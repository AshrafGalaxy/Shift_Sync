const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:oGoI7PqjJjyw7i5b@db.jzzsobhieahwnkihybvm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run(label, sql) {
  try { await client.query(sql); console.log(`✅ ${label}`); }
  catch(e) { console.error(`❌ ${label}: ${e.message}`); }
}

async function main() {
  await client.connect();

  // ── profiles: remove duplicate/conflicting policies ────────────────────────
  // The old ALL policy + new per-cmd policies conflict. Drop ALL, keep per-cmd.
  await run('Drop profiles ALL (duplicate)', `DROP POLICY IF EXISTS "profiles_self" ON profiles;`);
  // Also ensure per-cmd policies are correct
  await run('Drop profiles_select', `DROP POLICY IF EXISTS "profiles_select" ON profiles;`);
  await run('Drop profiles_insert', `DROP POLICY IF EXISTS "profiles_insert" ON profiles;`);
  await run('Drop profiles_update', `DROP POLICY IF EXISTS "profiles_update" ON profiles;`);
  await run('profiles SELECT', `CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR institution_id = public.get_institution_id());`);
  await run('profiles INSERT', `CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());`);
  await run('profiles UPDATE', `CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());`);

  // ── workloads: ensure institution_id NOT NULL enforcement is removed ─────────
  // The column was added as nullable so old rows still work
  await run('workloads institution_id nullable', `ALTER TABLE workloads ALTER COLUMN institution_id DROP NOT NULL;`);

  // ── faculty_settings: add name column if missing ────────────────────────────
  await run('faculty_settings: add name column', `ALTER TABLE faculty_settings ADD COLUMN IF NOT EXISTS name TEXT;`);

  console.log('\n✅ DB cleanup complete.');

  // Verify no duplicate policies
  const dup = await client.query(`
    SELECT tablename, policyname, cmd FROM pg_policies
    WHERE schemaname='public' ORDER BY tablename, cmd
  `);
  console.log('\n=== Final policy list ===');
  dup.rows.forEach(r => console.log(`  [${r.tablename}] [${r.cmd}] ${r.policyname}`));

  await client.end();
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
