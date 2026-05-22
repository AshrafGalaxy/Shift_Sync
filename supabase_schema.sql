-- =============================================================================
-- ShiftSync — Complete Fresh Schema (All Phases 1–36)
-- =============================================================================
-- HOW TO USE:
--   1. In Supabase Dashboard → SQL Editor, paste and run this entire file.
--   2. This DROPS everything first, then recreates cleanly.
--   3. All previous data will be permanently deleted.
-- =============================================================================


-- =============================================================================
-- STEP 0: TEARDOWN — drop everything in dependency-safe reverse order
-- =============================================================================

DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth.institution_id() CASCADE;

DROP TABLE IF EXISTS constraint_templates   CASCADE;
DROP TABLE IF EXISTS notifications          CASCADE;
DROP TABLE IF EXISTS substitute_requests    CASCADE;
DROP TABLE IF EXISTS generated_timetables   CASCADE;
DROP TABLE IF EXISTS workloads              CASCADE;
DROP TABLE IF EXISTS rooms                  CASCADE;
DROP TABLE IF EXISTS faculty_settings       CASCADE;
DROP TABLE IF EXISTS profiles               CASCADE;
DROP TABLE IF EXISTS institutions           CASCADE;

DROP TYPE IF EXISTS user_role  CASCADE;
DROP TYPE IF EXISTS class_type CASCADE;


-- =============================================================================
-- STEP 1: CUSTOM TYPES
-- =============================================================================

CREATE TYPE user_role  AS ENUM ('admin', 'faculty', 'student');
CREATE TYPE class_type AS ENUM ('Theory', 'Lab', 'Tutorial');


-- =============================================================================
-- STEP 2: CORE TABLES
-- =============================================================================

-- 1. institutions
CREATE TABLE institutions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    days_active           JSONB NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]'::jsonb,
    time_slots            JSONB NOT NULL DEFAULT '[8,9,10,11,12,13,14,15,16]'::jsonb,
    lunch_slot            JSONB NOT NULL DEFAULT '{"Mon":13,"Tue":13,"Wed":13,"Thu":13,"Fri":13}'::jsonb,
    max_continuous_lectures INTEGER DEFAULT 2,
    created_at            TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. profiles  (extends Supabase auth.users)
CREATE TABLE profiles (
    id             UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role           user_role NOT NULL DEFAULT 'faculty',
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    full_name      TEXT NOT NULL DEFAULT 'User',
    created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Auto-create a profile row when a user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    'faculty'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. faculty_settings
CREATE TABLE faculty_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    faculty_csv_id  TEXT,                          -- stores the CSV faculty ID for workload linking
    max_load_hrs    INTEGER NOT NULL DEFAULT 20,
    max_continuous_hrs INTEGER NOT NULL DEFAULT 3,
    shift_hours     JSONB NOT NULL DEFAULT '[8,9,10,11,12,13,14,15]'::jsonb,
    blocked_slots   JSONB NOT NULL DEFAULT '[]'::jsonb,
    class_teacher_for TEXT,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. rooms
CREATE TABLE rooms (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL DEFAULT 'Classroom',
    capacity       INTEGER NOT NULL DEFAULT 60,
    tags           JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_archived    BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. workloads
CREATE TABLE workloads (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id    UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    faculty_id        UUID REFERENCES faculty_settings(id) ON DELETE CASCADE NOT NULL,
    subject_code      TEXT NOT NULL,
    type              class_type NOT NULL DEFAULT 'Theory',
    target_groups     JSONB NOT NULL DEFAULT '[]'::jsonb,
    weekly_hours      INTEGER NOT NULL DEFAULT 2,
    consecutive_hours INTEGER NOT NULL DEFAULT 1,
    required_tags     JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_online         BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 6. generated_timetables
CREATE TABLE generated_timetables (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    is_active      BOOLEAN DEFAULT false,
    matrix_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
    status         TEXT NOT NULL DEFAULT 'success',   -- 'success' | 'success_with_overflow' | 'failed'
    error_message  TEXT,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 7. substitute_requests  (Phase 27)
CREATE TABLE substitute_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    requester_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    substitute_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subject_code   TEXT NOT NULL,
    room           TEXT NOT NULL,
    day            TEXT NOT NULL,
    time_slot      INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'accepted' | 'declined'
    created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 8. notifications  (Phase 28)
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sender_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type         TEXT NOT NULL DEFAULT 'info',
    message      TEXT NOT NULL,
    metadata     JSONB DEFAULT '{}'::jsonb,
    is_read      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 9. constraint_templates  (Phase 31)
CREATE TABLE constraint_templates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name           TEXT NOT NULL,
    snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_faculty_settings_institution ON faculty_settings(institution_id);
CREATE INDEX idx_faculty_settings_archived    ON faculty_settings(is_archived);
CREATE INDEX idx_rooms_institution            ON rooms(institution_id);
CREATE INDEX idx_rooms_archived               ON rooms(is_archived);
CREATE INDEX idx_workloads_institution        ON workloads(institution_id);
CREATE INDEX idx_workloads_faculty            ON workloads(faculty_id);
CREATE INDEX idx_generated_timetables_inst    ON generated_timetables(institution_id);
CREATE INDEX idx_notifications_recipient      ON notifications(recipient_id);
CREATE INDEX idx_substitute_requests_inst     ON substitute_requests(institution_id);
CREATE INDEX idx_constraint_templates_inst    ON constraint_templates(institution_id);


-- =============================================================================
-- STEP 4: HELPER FUNCTION — resolves institution_id for the calling user
-- NOTE: Must live in 'public' schema on hosted Supabase (auth schema is restricted)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_institution_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;


-- =============================================================================
-- STEP 5: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE institutions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE workloads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_templates ENABLE ROW LEVEL SECURITY;

-- institutions
CREATE POLICY "inst_select" ON institutions FOR SELECT TO authenticated
    USING (id = public.get_institution_id());
CREATE POLICY "inst_update" ON institutions FOR UPDATE TO authenticated
    USING (
        id = public.get_institution_id()
        OR public.get_institution_id() IS NULL  -- allow bootstrap: profile not yet linked
    );
CREATE POLICY "inst_insert" ON institutions FOR INSERT TO authenticated
    WITH CHECK (true);

-- profiles: own row only (WITH CHECK ensures users can only write their own row)
CREATE POLICY "profiles_self" ON profiles FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- faculty_settings
CREATE POLICY "faculty_settings_tenant" ON faculty_settings FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());

-- rooms
CREATE POLICY "rooms_tenant" ON rooms FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());

-- workloads
CREATE POLICY "workloads_tenant" ON workloads FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());

-- generated_timetables
CREATE POLICY "timetables_tenant" ON generated_timetables FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());

-- substitute_requests
CREATE POLICY "sub_requests_tenant" ON substitute_requests FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());

-- notifications: own row only
CREATE POLICY "notifications_self" ON notifications FOR ALL TO authenticated
    USING (recipient_id = auth.uid());

-- constraint_templates
CREATE POLICY "templates_tenant" ON constraint_templates FOR ALL TO authenticated
    USING (institution_id = public.get_institution_id())
    WITH CHECK (institution_id = public.get_institution_id());


-- =============================================================================
-- DONE — fresh ShiftSync schema ready.
-- Next step: open /register in the app to create your institution and admin account.
-- =============================================================================
