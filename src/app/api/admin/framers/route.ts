import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

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

/** Re-send the branded confirmation email to someone stuck unconfirmed. */
export async function PUT(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return denied();

  const { email } = await req.json();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
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

  return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true }, { status: 201 });
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

  const { error } = await supabaseAdmin
    .from("certified_framers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
