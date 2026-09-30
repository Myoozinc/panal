import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true 
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

  useEffect(() => {
    // Set up auth state listener FIRST to avoid missing events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Handle auth events securely
      if (event === 'SIGNED_OUT') {
        // Use setTimeout to avoid navigation during auth callback
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 0);
      } else if (event === 'PASSWORD_RECOVERY') {
        // Navigate to password reset form
        setTimeout(() => {
          navigate("/auth?reset=true", { replace: true });
        }, 0);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => {
          const search = window.location.search;
          const hash = window.location.hash;
          const isRecovery = 
            search.includes('type=recovery') || 
            search.includes('reset=true') || 
            hash.includes('type=recovery');

          if (isRecovery) {
            if (!search.includes('reset=true')) {
              navigate("/auth?reset=true", { replace: true });
            }
            return;
          }

          if (window.location.pathname === '/auth') {
            navigate("/discover", { replace: true });
          }
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};