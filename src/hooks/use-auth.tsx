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
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const syncSession = (sess: Session | null, defer = false) => {
      if (!mounted) return;
      const nextUserId = sess?.user?.id ?? null;
      const userChanged = currentUserIdRef.current !== nextUserId;

      currentUserIdRef.current = nextUserId;
      if (userChanged) {
        hasCheckedAdminRef.current = false;
        setIsAdmin(false);
      }
      // Avoid re-creating the session reference on every BroadcastChannel echo
      // (TOKEN_REFRESHED, repeated INITIAL_SESSION from preview iframe) — only
      // update when the user actually changes. This prevents downstream consumers
      // (AdminLayout/PageEditor/iframe) from remounting in a loop.
      setSession((prev) => {
        if (!userChanged && prev?.user?.id === nextUserId) return prev;
        return sess;
      });

      if (!nextUserId) {
        hasCheckedAdminRef.current = false;
        setIsAdmin(false);
        setLoading(false);
        initialLoadDoneRef.current = true;
        return;
      }

      // Show loading whenever a role check is genuinely pending. Repeated auth
      // broadcasts for an already-checked user are skipped below, so this avoids
      // false "Sem permissão" screens without reintroducing iframe remount loops.
      if (userChanged || !hasCheckedAdminRef.current) {
        setLoading(true);
      }

      // If the user didn't change and we already verified admin once, skip the re-check entirely.
      if (!userChanged && hasCheckedAdminRef.current) {
        setLoading(false);
        initialLoadDoneRef.current = true;
        return;
      }

      const seq = ++adminCheckSeqRef.current;
      const runCheck = () => {
        checkAdmin(nextUserId)
          .then(() => {
            if (mounted && seq === adminCheckSeqRef.current) hasCheckedAdminRef.current = true;
          })
          .finally(() => {
            if (mounted && seq === adminCheckSeqRef.current) {
              setLoading(false);
              initialLoadDoneRef.current = true;
            }
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