import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ── Types ──────────────────────────────────────────────────────────────────

type EmailType =
    | "substitute_request"
    | "substitute_accepted"
    | "substitute_declined"
    | "timetable_generated";

interface EmailPayload {
    to: string;
    subject: string;
    recipientName: string;
    type: EmailType;
    payload: Record<string, string>;
}

// ── Transporter (Gmail SMTP) ───────────────────────────────────────────────

function createTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        throw new Error(
            "GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env.local"
        );
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
}

// ── HTML Templates ─────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: linear-gradient(135deg, #6d28d9, #4f46e5); padding: 32px 40px; }
  .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -.3px; }
  .header p { margin: 6px 0 0; color: rgba(255,255,255,.75); font-size: 13px; }
  .body { padding: 32px 40px; }
  .slot-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
  .slot-card .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
  .slot-card .row:last-child { margin-bottom: 0; }
  .slot-card .label { color: #64748b; font-weight: 500; }
  .slot-card .value { color: #0f172a; font-weight: 600; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .footer { border-top: 1px solid #f1f5f9; padding: 20px 40px; text-align: center; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
  h2 { color: #0f172a; font-size: 18px; margin: 0 0 8px; }
  p { color: #334155; line-height: 1.6; font-size: 14px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>⚡ ShiftSync</h1>
    <p>Intelligent Timetable Management</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer"><p>This is an automated message from ShiftSync. Do not reply to this email.</p></div>
</div>
</body>
</html>`;
}

function substituteRequestTemplate(p: Record<string, string>): string {
    return baseTemplate(
        "Substitute Request",
        `
<h2>Substitute Request</h2>
<p>Hi <strong>${p.recipientName}</strong>,</p>
<p><strong>${p.requesterName}</strong> is unable to take a class and has requested you as a substitute. Please check the details below and respond via the ShiftSync Faculty Portal.</p>
<div class="slot-card">
  <div class="row"><span class="label">Subject</span><span class="value">${p.subject}</span></div>
  <div class="row"><span class="label">Day</span><span class="value">${p.day}</span></div>
  <div class="row"><span class="label">Time Slot</span><span class="value">${p.timeSlot}</span></div>
  <div class="row"><span class="label">Room</span><span class="value">${p.room}</span></div>
  ${p.division ? `<div class="row"><span class="label">Division</span><span class="value">${p.division}</span></div>` : ""}
  <div class="row"><span class="label">Status</span><span class="badge badge-amber">Pending Response</span></div>
</div>
<p>Please open the <strong>ShiftSync Faculty Portal</strong> to accept or decline this request. Your response will be emailed back to <strong>${p.requesterName}</strong>.</p>
`
    );
}

function substituteAcceptedTemplate(p: Record<string, string>): string {
    return baseTemplate(
        "Substitute Accepted",
        `
<h2>Substitute Accepted ✅</h2>
<p>Hi <strong>${p.recipientName}</strong>,</p>
<p>Your substitute request has been <strong>accepted</strong> by <strong>${p.substituteName}</strong>.</p>
<div class="slot-card">
  <div class="row"><span class="label">Subject</span><span class="value">${p.subject}</span></div>
  <div class="row"><span class="label">Day</span><span class="value">${p.day}</span></div>
  <div class="row"><span class="label">Time Slot</span><span class="value">${p.timeSlot}</span></div>
  <div class="row"><span class="label">Room</span><span class="value">${p.room}</span></div>
  <div class="row"><span class="label">Substitute</span><span class="value">${p.substituteName}</span></div>
  <div class="row"><span class="label">Status</span><span class="badge badge-green">Accepted</span></div>
</div>
<p>The class is covered. The substitution is now reflected in the timetable.</p>
`
    );
}

function substituteDeclinedTemplate(p: Record<string, string>): string {
    return baseTemplate(
        "Substitute Declined",
        `
<h2>Substitute Declined</h2>
<p>Hi <strong>${p.recipientName}</strong>,</p>
<p>Unfortunately, <strong>${p.substituteName}</strong> has <strong>declined</strong> your substitute request.</p>
<div class="slot-card">
  <div class="row"><span class="label">Subject</span><span class="value">${p.subject}</span></div>
  <div class="row"><span class="label">Day</span><span class="value">${p.day}</span></div>
  <div class="row"><span class="label">Time Slot</span><span class="value">${p.timeSlot}</span></div>
  <div class="row"><span class="label">Status</span><span class="badge badge-red">Declined</span></div>
</div>
<p>Please open the <strong>ShiftSync Faculty Portal</strong> to find another substitute for this slot.</p>
`
    );
}

function timetableGeneratedTemplate(p: Record<string, string>): string {
    return baseTemplate(
        "New Timetable Published",
        `
<h2>New Timetable Published 📅</h2>
<p>Hi <strong>${p.recipientName}</strong>,</p>
<p>A new timetable has been generated and published by the admin for <strong>${p.institutionName || "your institution"}</strong>.</p>
<p>Log into the ShiftSync Faculty Portal to view your updated schedule.</p>
`
    );
}

function buildHtml(type: EmailType, p: Record<string, string>): string {
    switch (type) {
        case "substitute_request":  return substituteRequestTemplate(p);
        case "substitute_accepted": return substituteAcceptedTemplate(p);
        case "substitute_declined": return substituteDeclinedTemplate(p);
        case "timetable_generated": return timetableGeneratedTemplate(p);
    }
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body: EmailPayload = await req.json();
        const { to, subject, recipientName, type, payload } = body;

        if (!to || !subject || !type) {
            return NextResponse.json(
                { error: "Missing required fields: to, subject, type" },
                { status: 400 }
            );
        }

        const html = buildHtml(type, { ...payload, recipientName });
        const transporter = createTransporter();

        const info = await transporter.sendMail({
            from: `"ShiftSync" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
        console.error("[email] Error:", err?.message);
        return NextResponse.json(
            { error: err?.message || "Email sending failed" },
            { status: 500 }
        );
    }
}
