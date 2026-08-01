import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  isGhlConfigured,
  tagContactAsCertifiedFramer,
  untagContactAsCertifiedFramer,
  type GhlTagResult,
} from "@/lib/ghl";

/** Turn a GHL result into something an admin can act on, or null if silent. */
function ghlNotice(result: GhlTagResult, email: string): string | null {
  switch (result.status) {
    case "disabled":
      return null; // Integration isn't set up; saying so on every add is noise.
    case "tagged":
      return null; // Worked — the success message already covers it.
    case "not_found":
      return `No GoHighLevel contact matches ${email}, so no tag was applied.`;
    case "failed":
      return `Portal access is set, but GoHighLevel tagging failed: ${result.message}`;
  }
}

/**
 * Admin management of the certified framers allowlist.
 *
 * Everything runs through the service-role client after an explicit admin
 * check, which lets us also report whether each person has actually created
 * their login yet (auth.users isn't reachable with the anon key).
 */

type Caller = { email: string; framerId: string; isAdmin: boolean };

async function requireAdmin(req: NextRequest): Promise<Caller | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) return null;

  const { data: framer } = await supabaseAdmin
    .from("certified_framers")
    .select("id,is_admin")
    .eq("email", user.email)
    .single();

  if (!framer?.is_admin) return null;

  return { email: user.email, framerId: framer.id, isAdmin: true };
}

const denied = () =>
  NextResponse.json({ error: "Admin access required" }, { status: 403 });

/** GET — list the allowlist, flagged with who has signed up. */
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const { data: framers, error } = await supabaseAdmin
    .from("certified_framers")
    .select("id,email,name,is_admin,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Which of these emails have created a login, and is it confirmed yet?
  // confirmed_at covers both password signups (set on email click) and
  // OAuth signups (set immediately, since Google already vouched for the
  // address) — checking it alone gives the right answer for both paths.
  const confirmedAt = new Map<string, string | null>();
  let page = 1;
  for (;;) {
    const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (listErr) break;
    data.users.forEach((u) => {
      if (u.email) confirmedAt.set(u.email.toLowerCase(), u.confirmed_at ?? null);
    });
    if (data.users.length < 1000) break;
    page += 1;
  }

  return NextResponse.json({
    callerEmail: caller.email,
    ghlConfigured: isGhlConfigured(),
    framers: (framers || []).map((f) => {
      const key = f.email.toLowerCase();
      const hasAccount = confirmedAt.has(key);
      const isConfirmed = hasAccount && Boolean(confirmedAt.get(key));
      return {
        ...f,
        hasAccount,
        accountStatus: !hasAccount
          ? "no_account"
          : isConfirmed
            ? "confirmed"
            : "pending",
      };
    }),
  });
}

/**
 * PUT — nudge someone by email.
 *
 * Two different situations need two different emails, which is why this
 * takes an action rather than assuming one:
 *
 *   resend — they started signing up but never clicked the confirmation
 *            link. Re-sends the same "Confirm signup" template.
 *   invite — they're on the allowlist but have never created a login at
 *            all, so there is no signup to confirm and `resend` would fail.
 *            Sends Supabase's invite email instead.
 */
export async function PUT(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const { email, action } = await req.json();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const mode = action === "invite" ? "invite" : "resend";

  if (!cleanEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  if (mode === "invite") {
    // Land them on the callback route, which establishes the session and
    // sends them into the portal; they can set a password from Account.
    const origin = req.nextUrl.origin;
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      cleanEmail,
      { redirectTo: `${origin}/auth/callback` }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: "invite" });
  }

  // Public GoTrue endpoint (no admin key needed) — it re-sends whatever
  // template is configured for "Confirm signup", same as a fresh signup would.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: "confirmation" });
}

/** POST — add someone to the allowlist. */
export async function POST(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const { email, name } = await req.json();

  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
  const cleanName = String(name || "").trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  if (!cleanName) {
    return NextResponse.json({ error: "Enter a name" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("certified_framers")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `${cleanEmail} is already on the list` },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from("certified_framers")
    .insert({ email: cleanEmail, name: cleanName });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Portal access is already granted at this point. GHL tagging is a
  // best-effort follow-on: a CRM outage must not undo or block access.
  const ghl = await tagContactAsCertifiedFramer(cleanEmail);

  return NextResponse.json(
    { ok: true, ghl: ghl.status, warning: ghlNotice(ghl, cleanEmail) },
    { status: 201 }
  );
}

/** PATCH — grant or revoke admin. */
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const { id, isAdmin } = await req.json();

  if (id === caller.framerId && !isAdmin) {
    return NextResponse.json(
      { error: "You can't remove your own admin access" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("certified_framers")
    .update({ is_admin: Boolean(isAdmin) })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — revoke access. Leaves their login intact. */
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (id === caller.framerId) {
    return NextResponse.json(
      { error: "You can't remove your own access" },
      { status: 400 }
    );
  }

  // Read the email before deleting so the CRM side can be kept in step.
  const { data: target } = await supabaseAdmin
    .from("certified_framers")
    .select("email")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("certified_framers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ghl = target?.email
    ? await untagContactAsCertifiedFramer(target.email)
    : ({ status: "disabled" } as GhlTagResult);

  return NextResponse.json({
    ok: true,
    ghl: ghl.status,
    warning: target?.email ? ghlNotice(ghl, target.email) : null,
  });
}
