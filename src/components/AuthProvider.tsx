import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true,
  signOut: async () => {},
  loginAsDemo: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      if (isFirebaseConfigured) {
        await fbSignOut(auth);
      }
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout error:", e);
    }
    localStorage.removeItem("panal_demo_session");
    setUser(null);
    setSession(null);
    navigate("/auth", { replace: true });
  };

  const loginAsDemo = () => {
    const demoUser: any = {
      id: "demo-creator-pro",
      email: "demo@panal.app",
      user_metadata: {
        full_name: "Alex Rivera",
        username: "alexrivera",
        avatar_url: "/logo.png",
      },
      app_metadata: { provider: "demo" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("panal_demo_session", JSON.stringify(demoUser));
    setUser(demoUser);
    setSession({ user: demoUser } as any);
    setLoading(false);
    navigate("/discover", { replace: true });
  };

  useEffect(() => {
    let unsubscribeFb: (() => void) | null = null;

    if (isFirebaseConfigured) {
      // 1. Listen to Firebase auth state
      unsubscribeFb = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const mappedUser: any = {
            id: fbUser.uid,
            email: fbUser.email || "",
            user_metadata: {
              full_name: fbUser.displayName || fbUser.email?.split("@")[0] || "Creador Panal",
              avatar_url: fbUser.photoURL || "/logo.png",
              username: (fbUser.displayName || fbUser.email?.split("@")[0] || "creador")
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, ""),
            },
            app_metadata: { provider: "firebase" },
            aud: "authenticated",
            created_at: fbUser.metadata.creationTime || new Date().toISOString(),
          };
          setUser(mappedUser);
          setSession({ user: mappedUser } as any);
          setLoading(false);

          if (window.location.pathname === "/auth") {
            navigate("/discover", { replace: true });
          }
        } else {
          // Check local demo session
          const demoRaw = localStorage.getItem("panal_demo_session");
          if (demoRaw) {
            try {
              const demoUser = JSON.parse(demoRaw);
              setUser(demoUser);
              setSession({ user: demoUser } as any);
              setLoading(false);
              return;
            } catch {}
          }

          // If no Firebase user, check Supabase as secondary fallback
          supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
            if (sbSession?.user) {
              setSession(sbSession);
              setUser(sbSession.user);
            } else {
              setUser(null);
              setSession(null);
            }
            setLoading(false);
          });
        }
      });
    } else {
      // Supabase fallback only
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
        setSession(sbSession);
        setUser(sbSession?.user ?? null);
        setLoading(false);
      });
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        setSession(sbSession);
        setUser(sbSession?.user ?? null);
        setLoading(false);
      });
      return () => subscription.unsubscribe();
    }

    return () => {
      if (unsubscribeFb) unsubscribeFb();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut, loginAsDemo }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};