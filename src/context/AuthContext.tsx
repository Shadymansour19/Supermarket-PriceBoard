import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { forgetRevokedSession, rememberAccount } from "../lib/accounts";
import { getCurrentStaff } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { StaffRole } from "../types/database";

type AuthState = {
  session: Session | null;
  role: StaffRole | null;
  displayName: string | null;
  isAdmin: boolean;
  isCashier: boolean;
  /** Admin or cashier. */
  isStaff: boolean;
  loading: boolean;
};

function buildState(session: Session | null, role: StaffRole | null, displayName: string | null, loading: boolean): AuthState {
  return {
    session,
    role,
    displayName,
    isAdmin: role === "admin",
    isCashier: role === "cashier",
    isStaff: role !== null,
    loading,
  };
}

const AuthContext = createContext<AuthState>(buildState(null, null, null, true));

/** Returning to the tab re-checks the login against the server, but not
 * more often than this. */
const RECHECK_MS = 20_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(buildState(null, null, null, true));
  // Only the newest role lookup may apply its result: switching accounts
  // fires several auth events in a row, and an older lookup (for the
  // account just left) finishing last would otherwise show the wrong role.
  const latest = useRef(0);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole(session: Session | null) {
      const ticket = ++latest.current;
      if (!session) {
        lastUserId.current = null;
        if (!cancelled) setState(buildState(null, null, null, false));
        return;
      }
      const { staff, revoked } = await getCurrentStaff();
      if (cancelled || ticket !== latest.current) return;
      if (revoked) {
        // Ended elsewhere (password changed, removed by an admin): drop it
        // here too; the resulting SIGNED_OUT event settles the state.
        await forgetRevokedSession();
        return;
      }
      lastUserId.current = session.user.id;
      if (staff) rememberAccount(session, staff);
      setState(buildState(session, staff?.role ?? null, staff?.displayName ?? null, false));
    }

    supabase.auth.getSession().then(({ data }) => loadRole(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // The client re-announces the same signed-in user on token refresh /
      // tab focus; re-check quietly, without blanking the page behind a
      // "Loading…" screen (which would also wipe an open form).
      if (!(session && session.user.id === lastUserId.current)) {
        setState((prev) => ({ ...prev, loading: true }));
      }
      loadRole(session);
    });

    let lastCheck = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < RECHECK_MS) return;
      lastCheck = Date.now();
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) loadRole(data.session);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
