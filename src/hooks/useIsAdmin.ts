import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const ADMIN_EMAILS = [
  "myooz.inc@gmail.com",
];

export function useIsAdmin() {
  const { user } = useAuth();
  const isEmailAdmin = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())
  );

  const { data, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id && !isEmailAdmin,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  return { isAdmin: isEmailAdmin || !!data, loading: isEmailAdmin ? false : isLoading };
}
