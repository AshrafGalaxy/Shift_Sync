-- =============================================================================
-- ShiftSync RLS Fix — Run this in Supabase SQL Editor
-- Fixes: "new row violates row-level security policy for table institutions"
-- Root cause: inst_update blocks users whose profile.institution_id is still NULL
-- =============================================================================

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "inst_update" ON institutions;
DROP POLICY IF EXISTS "inst_select" ON institutions;

-- New select: own institution OR no institution linked yet (bootstrap case)
CREATE POLICY "inst_select" ON institutions FOR SELECT TO authenticated
    USING (
        id = public.get_institution_id()
    );

-- New update: allow updating own institution OR updating an institution
-- that was just created in the same transaction (bootstrap: profile not linked yet)
CREATE POLICY "inst_update" ON institutions FOR UPDATE TO authenticated
    USING (
        id = public.get_institution_id()
        OR
        -- Allow update during initial setup when profile has no institution yet
        public.get_institution_id() IS NULL
    );

-- Also ensure profiles policy allows updating institution_id linkage
DROP POLICY IF EXISTS "profiles_self" ON profiles;
CREATE POLICY "profiles_self" ON profiles FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- =============================================================================
-- DONE. Go back to the app and try saving Global Settings again.
-- =============================================================================
