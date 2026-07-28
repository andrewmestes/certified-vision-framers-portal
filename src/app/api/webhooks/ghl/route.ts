import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/webhooks/ghl
 *
 * Driven by a GoHighLevel Workflow with a Webhook action, not the GHL API —
 * the workflow payload already carries the contact, so there's no API key to
 * manage and nothing to poll.
 *
 * Auth is a shared secret in the x-portal-secret header, set on both the
 * workflow and GHL_WEBHOOK_SECRET in Vercel.
 *
 * Add a Custom Data pair of action=remove on a "tag removed" workflow to
 * revoke access; anything else is treated as an add.
 */

/** GHL's field naming varies by trigger, so accept the common shapes. */
function pick(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function POST(req: NextRequest) {
  const secret = process.env.GHL_WEBHOOK_SECRET;

  if (!secret) {
    console.error("GHL webhook hit but GHL_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-portal-secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = pick(payload, ["email", "Email", "contact_email"]).toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "No email in payload" },
      { status: 400 }
    );
  }

  const contactId = pick(payload, ["contact_id", "contactId", "id"]);
  const action = pick(payload, ["action"]).toLowerCase();

  const fullName =
    pick(payload, ["full_name", "fullName", "name"]) ||
    [
      pick(payload, ["first_name", "firstName"]),
      pick(payload, ["last_name", "lastName"]),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  try {
    if (action === "remove") {
      await supabaseAdmin
        .from("certified_framers")
        .delete()
        .eq("email", email);

      await supabaseAdmin.from("ghl_sync_log").insert({
        ghl_contact_id: contactId || email,
        status: "success",
      });

      return NextResponse.json({ ok: true, action: "removed", email });
    }

    const { data: existing } = await supabaseAdmin
      .from("certified_framers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      // Already on the list — just keep the GHL link current. Never
      // overwrite an existing name or touch is_admin.
      if (contactId) {
        await supabaseAdmin
          .from("certified_framers")
          .update({ ghl_contact_id: contactId })
          .eq("id", existing.id);
      }
    } else {
      await supabaseAdmin.from("certified_framers").insert({
        email,
        name: fullName || email,
        ghl_contact_id: contactId || null,
      });
    }

    await supabaseAdmin.from("ghl_sync_log").insert({
      ghl_contact_id: contactId || email,
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      action: existing ? "already_present" : "added",
      email,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";

    await supabaseAdmin.from("ghl_sync_log").insert({
      ghl_contact_id: contactId || email,
      status: "failed",
      error_message: message,
    });

    console.error("GHL webhook error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET — quick health check you can hit in a browser. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/ghl",
    configured: Boolean(process.env.GHL_WEBHOOK_SECRET),
  });
}
