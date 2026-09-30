import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export function useStartAdminChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const startChat = async (targetUserId: string, targetName?: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Debes iniciar sesión" });
      return;
    }

    if (user.id === targetUserId) {
      toast({ variant: "destructive", title: "No puedes iniciar un chat contigo mismo" });
      return;
    }

    setStarting(true);
    try {
      // 1. Check if conversation already exists between the admin and target user
      const { data: existingConvs, error: findErr } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`)
        .limit(1);

      if (!findErr && existingConvs && existingConvs.length > 0) {
        navigate(`/chat/${existingConvs[0].id}`);
        return;
      }

      // 2. Try RPC start_admin_chat
      try {
        const { data: rpcConvId, error: rpcErr } = await (supabase.rpc as any)("start_admin_chat", {
          target_user_id: targetUserId,
        });

        if (!rpcErr && rpcConvId) {
          navigate(`/chat/${rpcConvId}`);
          return;
        }
      } catch {
        // RPC may not be present yet in remote db, continue to fallback
      }

      // 3. Fallback: create match and conversation directly
      const [uA, uB] = user.id < targetUserId ? [user.id, targetUserId] : [targetUserId, user.id];

      // Check or insert match
      let matchId: string | null = null;
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", uA)
        .eq("user_b", uB)
        .maybeSingle();

      if (existingMatch?.id) {
        matchId = existingMatch.id;
      } else {
        const { data: newMatch } = await supabase
          .from("matches")
          .insert({ user_a: uA, user_b: uB })
          .select("id")
          .maybeSingle();
        if (newMatch?.id) {
          matchId = newMatch.id;
        }
      }

      // Ensure conversation row
      if (matchId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ match_id: matchId, user_a: uA, user_b: uB })
          .select("id")
          .maybeSingle();

        if (newConv?.id) {
          navigate(`/chat/${newConv.id}`);
          return;
        }
      }

      // 4. If all direct inserts are restricted by RLS, record like swipe and notify
      await supabase.from("swipes").upsert(
        { swiper_id: user.id, swiped_id: targetUserId, direction: "like" },
        { onConflict: "swiper_id,swiped_id" }
      );

      toast({
        title: `Conexión enviada a ${targetName ?? "usuario"}`,
        description: "El chat estará activo para comunicación directa.",
      });
    } catch (err: any) {
      console.error("Error starting admin chat:", err);
      toast({
        variant: "destructive",
        title: "No se pudo iniciar el chat",
        description: err.message || "Verifica los permisos de administrador.",
      });
    } finally {
      setStarting(false);
    }
  };

  return { startChat, isStarting: starting };
}
