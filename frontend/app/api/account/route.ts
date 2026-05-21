import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";

export async function DELETE() {
    try {
        // 1. Identify calling user via cookie-session
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(toSet) { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
                },
            }
        );

        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Fetch institution_id from profile
        const admin = createAdminClient();
        const { data: profile } = await admin.from("profiles").select("institution_id, role").eq("id", user.id).single();
        const instId = profile?.institution_id;

        // 3. Delete all institution data (only if this user is the admin/owner)
        if (instId && profile?.role === "admin") {
            await admin.from("generated_timetables").delete().eq("institution_id", instId);
            await admin.from("workloads").delete().eq("institution_id", instId);
            await admin.from("rooms").delete().eq("institution_id", instId);
            await admin.from("faculty_settings").delete().eq("institution_id", instId);
            // Delete all profiles linked to this institution
            await admin.from("profiles").delete().eq("institution_id", instId);
            // Delete institution itself
            await admin.from("institutions").delete().eq("id", instId);
        } else {
            // Faculty: just delete own profile
            await admin.from("profiles").delete().eq("id", user.id);
        }

        // 4. Delete the auth user (requires service role)
        const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
        if (delErr) console.error("Auth delete error:", delErr.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Delete account error:", err);
        return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
    }
}
