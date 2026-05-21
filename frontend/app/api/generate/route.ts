import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("institution_id")
            .eq("id", session.user.id)
            .single();

        const instId = profile?.institution_id;
        if (!instId) {
            return NextResponse.json({ error: "No institution configured" }, { status: 400 });
        }

        const payload = await req.json();

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        
        // 1. Call Python Backend
        const pythonRes = await fetch(`${apiUrl}/api/v1/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await pythonRes.json().catch(() => ({}));
        
        if (!pythonRes.ok) {
            // Python returned error/infeasible
            const detail = data.detail || data;
            let errorMsg = "Unknown error";
            if (typeof detail === "string") errorMsg = detail;
            else if (detail?.message) errorMsg = detail.message;
            else if (detail?.validation_errors) errorMsg = (detail.validation_errors as string[]).join(" | ");
            else errorMsg = JSON.stringify(detail);

            // Save the failed attempt asynchronously
            supabase.from("generated_timetables").insert({
                institution_id: instId,
                is_active: false,
                matrix_data: { error: errorMsg },
                status: 'failed',
                error_message: errorMsg
            }).then();

            return NextResponse.json(detail, { status: pythonRes.status });
        }

        // 2. Successful generation (or success_with_overflow)
        // Ensure this saves to Supabase before returning, fulfilling the decouple requirement
        const { error: insertErr } = await supabase.from("generated_timetables").insert({
            institution_id: instId,
            is_active: true,
            matrix_data: data,
            status: data.status || 'success'
        });

        if (insertErr) {
            console.error("Supabase Insert Error:", insertErr);
            return NextResponse.json({ error: "Failed to save generated timetable to database", details: insertErr.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Generate API proxy error:", err);
        return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
    }
}
