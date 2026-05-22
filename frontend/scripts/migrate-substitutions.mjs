// Run: node scripts/migrate-substitutions.mjs
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
CREATE TABLE IF NOT EXISTS public.substitutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL,
    timetable_id UUID,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    room TEXT,
    subject_code TEXT NOT NULL,
    division TEXT,
    original_faculty_id UUID,
    original_faculty_name TEXT,
    substitute_faculty_id UUID,
    substitute_faculty_name TEXT,
    substitute_request_id UUID,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const { data, error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();

if (error) {
    console.log("rpc exec_sql not available, trying direct insert check...");
    // Verify table exists by attempting a select
    const { error: checkErr } = await supabase.from("substitutions").select("id").limit(1);
    if (checkErr && checkErr.code === "42P01") {
        console.error("Table does not exist and could not be created via JS client.");
        console.log("Please run this SQL in the Supabase SQL Editor:\n");
        console.log(sql);
    } else {
        console.log("✅ substitutions table already exists!");
    }
} else {
    console.log("✅ Migration complete:", data);
}
