import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Profile } from "@/types/panal";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;

      // 1. Check Firestore
      if (isFirebaseConfigured) {
        try {
          const snap = await getDoc(doc(db, "profiles", user.id));
          if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Profile;
          }
        } catch (err) {
          console.warn("Firestore profile fetch warning:", err);
        }
      }

      // 2. Check Supabase
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (!error && data) return data as Profile;
      } catch (err) {
        // ignore
      }

      // 3. Resilient profile fallback from auth metadata
      const rawName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Mi Perfil";
      const rawUser = (user.user_metadata?.username || user.email?.split("@")[0] || "creador")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      return {
        id: user.id,
        display_name: rawName,
        username: rawUser,
        avatar_url: user.user_metadata?.avatar_url || "/logo.png",
        bio: "Creador en Panal 🐝",
        discipline: "other",
        is_verified: false,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;
    },
  });
}
