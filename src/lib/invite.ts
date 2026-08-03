import { supabaseAdmin } from "./supabase";

/**
 * What happened when we tried to invite someone.
 *
 * `already_has_login` is a success, not a failure: Supabase rejects inviting
 * an existing user, and there'd be nothing to invite them to — they can
 * already sign in. Re-adding a previously removed framer is exactly this case.
 */
export type InviteOutcome =
  | "sent"
  | "already_has_login"
  | "skipped"
  | "failed";

export type InviteResult = {
  outcome: InviteOutcome;
  error: string | null;
};

/**
 * Send the portal invitation for someone already on the allowlist.
 *
 * Shared by the admin screen and the GoHighLevel webhook so both routes into
 * the portal behave the same way — someone granted access hears about it,
 * however they were granted it.
 *
 * Never throws. Access has already been granted by the time this runs, and a
 * mail outage must not read as a failed add — but the caller does need the
 * outcome so it can say "added, invitation failed, try again" rather than
 * claiming an email went out that didn't.
 */
export async function inviteFramer(
  email: string,
  origin: string
): Promise<InviteResult> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: userList, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    // A failed lookup must not become a blind invite: the call would fail
    // anyway for an existing user, and reporting that as a mail problem
    // would send the admin chasing the wrong thing.
    if (listErr) {
      return { outcome: "failed", error: listErr.message };
    }

    const hasLogin = (userList?.users || []).some(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (hasLogin) return { outcome: "already_has_login", error: null };

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      cleanEmail,
      { redirectTo: `${origin}/auth/callback` }
    );

    if (error) return { outcome: "failed", error: error.message };

    return { outcome: "sent", error: null };
  } catch (err) {
    return {
      outcome: "failed",
      error: err instanceof Error ? err.message : "Could not send invitation",
    };
  }
}
