import { supabase } from "./supabase";
import type { StaffRole } from "../types/database";

export async function signInStaff(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutStaff() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * The signed-in user's staff role (`admin` or `cashier`) from their
 * `profiles` row, or null for a customer / anyone else. This is a UX
 * check only — the real enforcement is Postgres RLS via `is_admin()` /
 * `is_staff()`, so a "no" here just means "don't show the staff UI."
 */
export async function getCurrentUserRole(): Promise<StaffRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.role === "admin" || data.role === "cashier" ? data.role : null;
}
