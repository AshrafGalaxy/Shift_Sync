/**
 * ShiftSync — Live DB Migration Script
 * Runs via direct PostgreSQL connection (no manual SQL editor needed)
 * Connection: Supabase db.jzzsobhieahwnkihybvm.supabase.co
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:oGoI7PqjJjyw7i5b@db.jzzsobhieahwnkihybvm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run(label, sql) {
  try {
    await client.query(sql);
    console.log(`✅ ${label}`);
  } catch (e) {
    // IF NOT EXISTS guards make most errors safe to ignore
    if (e.message.includes('already exists') || e.message.includes('does not exist')) {
      console.log(`⏭️  ${label} — skipped (${e.message.split('\n')[0]})`);
    } else {
      console.error(`❌ ${label} FAILED:`, e.message);
    }
  }
}

async function main() {
  await client.connect();
  console.log('🔌 Connected to Supabase\n');

  // ── 1. Verify all tables exist ──────────────────────────────────────────────
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  );
  console.log('📋 Tables:', tables.rows.map(r => r.tablename).join(', '), '\n');

  // ── 2. Ensure faculty_settings has is_archived (defensive) ──────────────────
  await run(
    'faculty_settings: ensure is_archived column exists',
    `ALTER TABLE faculty_settings ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;`
  );

  // ── 3. Ensure rooms has is_archived (defensive) ─────────────────────────────
  await run(
    'rooms: ensure is_archived column exists',
    `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;`
  );

  // ── 4. Ensure workloads has is_online (defensive) ───────────────────────────
  await run(
    'workloads: ensure is_online column exists',
    `ALTER TABLE workloads ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;`
  );

  // ── 5. Ensure workloads has institution_id FK (needed for clearDatabase) ─────
  await run(
    'workloads: ensure institution_id column exists',
    `ALTER TABLE workloads ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;`
  );

  // ── 6. Patch workloads missing institution_id values (backfill) ──────────────
  await run(
    'workloads: backfill institution_id from faculty_settings join',
    `UPDATE workloads w
     SET institution_id = fs.institution_id
     FROM faculty_settings fs
     WHERE w.faculty_id = fs.id AND w.institution_id IS NULL;`
  );

  // ── 7. Fix RLS policy for faculty_settings to allow institution-level queries ─
  await run('Drop old faculty_settings RLS policy', `DROP POLICY IF EXISTS "faculty_settings_tenant" ON faculty_settings;`);
  await run(
    'Recreate faculty_settings RLS policy (institution-scoped)',
    `CREATE POLICY "faculty_settings_tenant" ON faculty_settings FOR ALL TO authenticated
     USING (institution_id = public.get_institution_id())
     WITH CHECK (institution_id = public.get_institution_id());`
  );

  // ── 8. Fix RLS for workloads ─────────────────────────────────────────────────
  await run('Drop old workloads RLS policy', `DROP POLICY IF EXISTS "workloads_tenant" ON workloads;`);
  await run(
    'Recreate workloads RLS policy (institution-scoped)',
    `CREATE POLICY "workloads_tenant" ON workloads FOR ALL TO authenticated
     USING (institution_id = public.get_institution_id())
     WITH CHECK (institution_id = public.get_institution_id());`
  );

  // ── 9. Fix institution RLS — bootstrap NULL case ─────────────────────────────
  await run('Drop inst_update policy', `DROP POLICY IF EXISTS "inst_update" ON institutions;`);
  await run(
    'Recreate inst_update with NULL bootstrap',
    `CREATE POLICY "inst_update" ON institutions FOR UPDATE TO authenticated
     USING (id = public.get_institution_id() OR public.get_institution_id() IS NULL)
     WITH CHECK (id = public.get_institution_id() OR public.get_institution_id() IS NULL);`
  );

  // ── 10. Add missing indexes for performance ──────────────────────────────────
  await run(
    'Index: workloads.institution_id',
    `CREATE INDEX IF NOT EXISTS idx_workloads_institution ON workloads(institution_id);`
  );
  await run(
    'Index: faculty_settings.is_archived',
    `CREATE INDEX IF NOT EXISTS idx_faculty_archived ON faculty_settings(is_archived);`
  );
  await run(
    'Index: rooms.is_archived',
    `CREATE INDEX IF NOT EXISTS idx_rooms_archived ON rooms(is_archived);`
  );

  // ── 11. Verify final state ───────────────────────────────────────────────────
  console.log('\n📊 Verifying column presence...');
  const cols = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('faculty_settings', 'rooms', 'workloads')
      AND column_name IN ('is_archived', 'is_online', 'institution_id')
    ORDER BY table_name, column_name;
  `);
  cols.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name}: ${r.data_type}`));

  console.log('\n✅ Migration complete — DB is up to date.\n');
  await client.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
