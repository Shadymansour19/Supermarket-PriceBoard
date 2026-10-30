import type { Session } from "@supabase/supabase-js";
import { getCurrentStaff, type StaffIdentity } from "./auth";
import { supabase } from "./supabase";
import type { StaffRole } from "../types/database";

// Several staff accounts can be signed in on one device (a shared till
// phone, an admin who also works the desk) and switched between without
// retyping passwords. The Supabase client holds ONE session at a time, so
// "switching" swaps the active session for a saved one. Only session
// tokens are stored — never passwords — in the same localStorage the
// client itself already keeps its session in, so exposure is unchanged in
// kind. On a shared device, "sign out of all accounts" wipes them.

const KEY = "hamada_accounts";

type SavedAccount = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: StaffRole;
  access_token: string;
  refresh_token: string;
};

export type AccountSummary = Pick<SavedAccount, "id" | "email" | "display_name" | "role">;

function read(): SavedAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(accounts: SavedAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(accounts));
  } catch {
    // Storage unavailable (private browsing) — switching just won't persist.
  }
}

export function listAccounts(): AccountSummary[] {
  return read().map(({ id, email, display_name, role }) => ({ id, email, display_name, role }));
}

function toEntry(session: Session, staff: StaffIdentity): SavedAccount {
  return {
    id: staff.id,
    email: staff.email,
    display_name: staff.displayName,
    role: staff.role,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
}

function upsert(entry: SavedAccount) {
  const all = read();
  const index = all.findIndex((a) => a.id === entry.id);
  if (index >= 0) all[index] = entry;
  else all.push(entry);
  write(all);
}

function removeLocal(id: string) {
  write(read().filter((a) => a.id !== id));
}

/** Called whenever the signed-in staff member is (re)loaded: remembers them
 * on this device, so signing in normally also makes them switchable. */
export function rememberAccount(session: Session, staff: StaffIdentity) {
  upsert(toEntry(session, staff));
}

// Session tokens rotate; keep the saved copy of whoever is active fresh so
// a later switch back to them still works. Only for already-saved accounts
// (a sign-out removes the entry first, so it isn't resurrected here).
supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) return;
  const all = read();
  const saved = all.find((a) => a.id === session.user.id);
  if (!saved) return;
  saved.access_token = session.access_token;
  saved.refresh_token = session.refresh_token;
  write(all);
});

/** Revokes ONE session on the server without touching the client's active
 * session (used for a saved account that isn't the active one). Best
 * effort: an expired access token just means it lapses on its own. */
function revokeSession(accessToken: string) {
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

// Bring the first saved account back after a failed attempt — a failed
// setSession / sign-in can drop the session that was active before.
async function goBackTo(prev: SavedAccount | undefined) {
  if (!prev) return;
  await supabase.auth.setSession({ access_token: prev.access_token, refresh_token: prev.refresh_token });
}

/** Refreshes the saved tokens of the current account before leaving it. */
async function rememberCurrent() {
  const { data } = await supabase.auth.getSession();
  const prev = data.session ? read().find((a) => a.id === data.session!.user.id) : undefined;
  if (prev && data.session) {
    prev.access_token = data.session.access_token;
    prev.refresh_token = data.session.refresh_token;
    upsert(prev);
  }
  return prev;
}

export type SwitchResult = { ok: true; role: StaffRole } | { ok: false; reason: "expired" | "invalid_login" | "not_staff" };

/** Switches to a saved account. A saved account whose session was
 * revoked, expired or whose profile is gone is forgotten on the first
 * failed attempt, and the account that was active stays active. */
export async function switchTo(id: string): Promise<SwitchResult> {
  const target = read().find((a) => a.id === id);
  if (!target) return { ok: false, reason: "expired" };
  const prev = await rememberCurrent();
  if (prev?.id === id) return { ok: true, role: target.role };

  const { data, error } = await supabase.auth.setSession({
    access_token: target.access_token,
    refresh_token: target.refresh_token,
  });
  if (error || data.session?.user.id !== id) {
    removeLocal(id);
    await goBackTo(prev);
    return { ok: false, reason: "expired" };
  }
  const { staff } = await getCurrentStaff();
  if (!staff || staff.id !== id) {
    removeLocal(id);
    await goBackTo(prev);
    return { ok: false, reason: "expired" };
  }
  upsert(toEntry(data.session, staff));
  return { ok: true, role: staff.role };
}

/** Signs in to another account WITHOUT signing out of the current one
 * first: a wrong password (or a non-staff account) leaves the current
 * session exactly as it was. On success the new account becomes active. */
export async function addAccount(email: string, password: string): Promise<SwitchResult> {
  const prev = await rememberCurrent();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session) {
    await goBackTo(prev);
    return { ok: false, reason: "invalid_login" };
  }
  const { staff } = await getCurrentStaff();
  if (!staff) {
    await supabase.auth.signOut({ scope: "local" });
    await goBackTo(prev);
    return { ok: false, reason: "not_staff" };
  }
  upsert(toEntry(data.session, staff));
  return { ok: true, role: staff.role };
}

/** Signs out of the account in use only — this device's session, not the
 * person's other devices (the default `global` scope would end those too)
 * — then falls back to another saved account if there is one. Returns the
 * role switched to, or null when nobody is left signed in. */
export async function signOutCurrent(): Promise<StaffRole | null> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  await supabase.auth.signOut({ scope: "local" });
  if (id) removeLocal(id);
  for (const account of read()) {
    const result = await switchTo(account.id);
    if (result.ok) return result.role;
  }
  return null;
}

/** Ends every account's session on this device — for a shared phone. */
export async function signOutAll(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const activeId = data.session?.user.id;
  await Promise.all(read().filter((a) => a.id !== activeId).map((a) => revokeSession(a.access_token)));
  await supabase.auth.signOut({ scope: "local" });
  write([]);
}

/** Forgets a saved (non-active) account and revokes its session. */
export async function removeAccount(id: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const account = read().find((a) => a.id === id);
  if (!account || data.session?.user.id === id) return;
  removeLocal(id);
  await revokeSession(account.access_token);
}

/** A login revoked elsewhere (password changed, account removed by an
 * admin) should disappear from this device too. */
export async function forgetRevokedSession() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  if (id) removeLocal(id);
}
