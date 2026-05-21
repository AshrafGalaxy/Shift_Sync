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
  // Add faculty_csv_id column for clean CSV ID mapping (replaces blocked_slots hack)
  await run('faculty_settings: add faculty_csv_id', `ALTER TABLE faculty_settings ADD COLUMN IF NOT EXISTS faculty_csv_id TEXT;`);
  await run('Index on faculty_csv_id', `CREATE INDEX IF NOT EXISTS idx_faculty_csv_id ON faculty_settings(faculty_csv_id);`);
  // Backfill faculty_csv_id from legacy blocked_slots[0]._csv_id for existing rows
  await run('Backfill faculty_csv_id from blocked_slots', `
    UPDATE faculty_settings
    SET faculty_csv_id = blocked_slots->0->>'_csv_id'
    WHERE faculty_csv_id IS NULL
      AND jsonb_array_length(blocked_slots::jsonb) > 0
      AND blocked_slots::jsonb->0->>'_csv_id' IS NOT NULL;
  `);
  console.log('\n✅ Schema ready for CSV uploads.');
  await client.end();
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
