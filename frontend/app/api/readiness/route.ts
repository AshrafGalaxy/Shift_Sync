import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        
        const pythonRes = await fetch(`${apiUrl}/api/v1/readiness`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await pythonRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: pythonRes.status });

    } catch (err: any) {
        console.error("Readiness API proxy error:", err);
        return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
    }
}
