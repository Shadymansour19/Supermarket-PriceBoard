import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUserRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { StaffRole } from "../types/database";

type AuthState = {
  session: Session | null;
  role: StaffRole | null;
  isAdmin: boolean;
  isCashier: boolean;
  /** Admin or cashier. */
  isStaff: boolean;
  loading: boolean;
};

function buildState(session: Session | null, role: StaffRole | null, loading: boolean): AuthState {
  return { session, role, isAdmin: role === "admin", isCashier: role === "cashier", isStaff: role !== null, loading };
}

const AuthContext = createContext<AuthState>(buildState(null, null, true));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(buildState(null, null, true));

  useEffect(() => {
    let cancelled = false;

    async function loadRole(session: Session | null) {
      const role = session ? await getCurrentUserRole() : null;
      if (!cancelled) setState(buildState(session, role, false));
    }

    supabase.auth.getSession().then(({ data }) => loadRole(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      loadRole(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
