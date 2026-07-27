import { supabase, supabaseAdmin } from "./supabase";

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentFramer() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("certified_framers")
    .select("*")
    .eq("email", user.email)
    .single();

  if (error) {
    console.error("Error fetching framer:", error);
    return null;
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

export async function signupWithEmail(
  email: string,
  password: string,
  name: string
) {
  // Create auth account
  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

  if (authError) throw authError;
  return authData;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
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
