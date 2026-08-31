import { supabase } from "./supabase";

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * True if the current session belongs to a user with an admin `profiles`
 * row. This is a UX check only — the real enforcement is Postgres RLS via
 * `is_admin()`, so a "no" here just means "don't show the admin UI."
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "admin";
}
