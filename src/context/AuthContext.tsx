import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isCurrentUserAdmin } from "../lib/auth";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isAdmin: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function loadAdminStatus(session: Session | null) {
      const isAdmin = session ? await isCurrentUserAdmin() : false;
      if (!cancelled) setState({ session, isAdmin, loading: false });
    }

    supabase.auth.getSession().then(({ data }) => loadAdminStatus(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      loadAdminStatus(session);
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
