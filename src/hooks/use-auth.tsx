import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const hasCheckedAdminRef = useRef(false);
  const adminCheckSeqRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const syncSession = (sess: Session | null, defer = false) => {
      if (!mounted) return;
      const nextUserId = sess?.user?.id ?? null;
      const userChanged = currentUserIdRef.current !== nextUserId;

      currentUserIdRef.current = nextUserId;
      setSession(sess);

      if (!nextUserId) {
        hasCheckedAdminRef.current = false;
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Do not blank/unmount the admin UI for repeated auth broadcasts from the preview iframe
      // (INITIAL_SESSION/SIGNED_IN/TOKEN_REFRESHED for the same user). Re-check silently instead.
      if (userChanged || !hasCheckedAdminRef.current) setLoading(true);

      const seq = ++adminCheckSeqRef.current;
      const runCheck = () => {
        checkAdmin(nextUserId)
          .then(() => {
            if (mounted && seq === adminCheckSeqRef.current) hasCheckedAdminRef.current = true;
          })
          .finally(() => {
            if (mounted && seq === adminCheckSeqRef.current) setLoading(false);
          });
      };

      if (defer) setTimeout(runCheck, 0);
      else runCheck();
    };

    // 1) Listener FIRST, then getSession (per Lovable Cloud auth pattern).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Defer role check to avoid deadlock inside the callback.
      syncSession(sess, true);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      syncSession(sess);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function checkAdmin(userId: string) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!error && !!data);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}