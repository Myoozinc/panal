import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

/** Returns set of user IDs blocked by me OR who blocked me. */
export function useBlockedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["blocked-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user!.id},blocked_id.eq.${user!.id}`);
      if (error) throw error;
      const ids = new Set<string>();
      (data ?? []).forEach((b: any) => {
        if (b.blocker_id !== user!.id) ids.add(b.blocker_id);
        if (b.blocked_id !== user!.id) ids.add(b.blocked_id);
      });
      return Array.from(ids);
    },
  });
}
