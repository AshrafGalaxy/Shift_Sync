/**
 * migrate.js — runs supabase_schema.sql against the live Supabase database.
 * Usage:  node migrate.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.db') });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
    console.error('❌  SUPABASE_DB_URL not set in .env.db');
    process.exit(1);
}

const sqlFile = path.join(__dirname, 'supabase_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

(async () => {
    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗  Connecting to Supabase...');
        await client.connect();
        console.log('✅  Connected.');
        console.log('⚙️   Running supabase_schema.sql ...');
        await client.query(sql);
        console.log('✅  Migration complete — fresh schema applied!');
    } catch (err) {
        console.error('❌  Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
