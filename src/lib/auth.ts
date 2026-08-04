import { supabase, supabaseAdmin } from "./supabase";

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Thrown when we genuinely could not find out whether someone has access,
 * as opposed to finding out that they don't.
 *
 * Those two need to look different to the caller: "you aren't on the list"
 * is a real answer worth showing the access-pending screen for, while a
 * dropped connection is not. Collapsing both to null told certified framers
 * their access was pending because their wifi hiccuped.
 */
export class FramerLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FramerLookupError";
  }
}

export async function getCurrentFramer() {
  const user = await getCurrentUser();
  if (!user) return null;

  // maybeSingle, not single: "no row" is an ordinary answer here, and single()
  // reports it as an error, which is what made the two cases indistinguishable.
  const { data, error } = await supabase
    .from("certified_framers")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    console.error("Error fetching framer:", error);
    throw new FramerLookupError(error.message);
  }

  return data;
}

export async function isAdmin() {
  const framer = await getCurrentFramer();
  return framer?.is_admin ?? false;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Removed on purpose — this portal has no self-signup.
 *
 * Access follows certification: an admin adds the person to the allowlist and
 * invites them, which is what creates their login. Keeping a signUp() helper
 * around invited a future caller to reintroduce a path that the product
 * doesn't want, so it's gone rather than merely unused.
 */

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Google sign-in. Worth having beyond convenience: Google vouches for the
 * address, so someone can't claim an allowlisted email that isn't theirs.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Admin functions
export async function addCertifiedFramer(email: string, name: string) {
  // Check if already exists
  const { data: existing } = await supabase
    .from("certified_framers")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    throw new Error("Email already exists in certified framers list");
  }

  const { data, error } = await supabaseAdmin
    .from("certified_framers")
    .insert({ email, name })
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function removeCertifiedFramer(email: string) {
  const { error } = await supabaseAdmin
    .from("certified_framers")
    .delete()
    .eq("email", email);

  if (error) throw error;
}

export async function updateFramerRole(email: string, isAdmin: boolean) {
  const { error } = await supabaseAdmin
    .from("certified_framers")
    .update({ is_admin: isAdmin })
    .eq("email", email);

  if (error) throw error;
}

export async function listCertifiedFramers() {
  const { data, error } = await supabaseAdmin
    .from("certified_framers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
