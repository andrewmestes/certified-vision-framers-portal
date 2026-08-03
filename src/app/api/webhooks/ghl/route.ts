import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { inviteFramer, type InviteOutcome } from "@/lib/invite";

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
 *
 * An add also sends the invitation, matching what adding someone by hand does
 * — being tagged certified but never hearing about it is the whole problem
 * this is meant to solve. A Custom Data pair of invite=false suppresses it,
 * which is what a bulk retag of an existing cohort wants: those people are
 * already in, and a few hundred invitations would hit the mail rate limit and
 * mostly never arrive.
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

    /**
     * Only invite on a genuine add. Re-running a workflow over people who are
     * already on the list is routine in GHL, and each replay would otherwise
     * be another email to someone who has been in the portal for months.
     */
    let invited: InviteOutcome = "skipped";
    let inviteError: string | null = null;

    if (!existing && pick(payload, ["invite"]).toLowerCase() !== "false") {
      const result = await inviteFramer(email, req.nextUrl.origin);
      invited = result.outcome;
      inviteError = result.error;
    }

    await supabaseAdmin.from("ghl_sync_log").insert({
      ghl_contact_id: contactId || email,
      status: invited === "failed" ? "failed" : "success",
      error_message: inviteError,
    });

    // Still a 200 when the invite fails — access was granted, and a non-2xx
    // would make GHL retry the whole thing and duplicate the work.
    return NextResponse.json({
      ok: true,
      action: existing ? "already_present" : "added",
      email,
      invited,
      inviteError,
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
