import { supabase } from "./supabase";
import type { StaffRole } from "../types/database";

export type StaffIdentity = {
  id: string;
  role: StaffRole;
  displayName: string | null;
  email: string | null;
};

export async function signInStaff(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Who the signed-in user is as staff (`admin` or `cashier`, from their
 * `profiles` row), or null for a customer / signed-out / revoked session.
 * This is a UX check only — the real enforcement is Postgres RLS via
 * `is_admin()` / `is_staff()`, so a "no" here just means "don't show the
 * staff UI."
 *
 * `getUser()` asks the server (getSession() alone would trust the cached
 * token for up to an hour), so a login revoked elsewhere is noticed here.
 * Only an explicit 401/403 counts as revoked — being offline or a server
 * hiccup must not sign anyone out; the caller handles `revoked`.
 */
export async function getCurrentStaff(): Promise<{ staff: StaffIdentity | null; revoked: boolean }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { staff: null, revoked: userError.status === 401 || userError.status === 403 };
  if (!user) return { staff: null, revoked: false };

  const { data, error } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return { staff: null, revoked: false };
  if (data.role !== "admin" && data.role !== "cashier") return { staff: null, revoked: false };
  return { staff: { id: user.id, role: data.role, displayName: data.display_name, email: user.email ?? null }, revoked: false };
}
