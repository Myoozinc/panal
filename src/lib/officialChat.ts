import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_APP_USER_ID } from "@/lib/constants";
import type { Message, Conversation } from "@/types/panal";

/**
 * Gets or creates the official conversation between Panal (the app) and a user.
 */
export async function getOrCreateAppConversation(userId: string): Promise<string | null> {
  if (!userId || userId === OFFICIAL_APP_USER_ID) return null;

  const [uA, uB] =
    OFFICIAL_APP_USER_ID < userId
      ? [OFFICIAL_APP_USER_ID, userId]
      : [userId, OFFICIAL_APP_USER_ID];

  try {
    // 1. Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", uA)
      .eq("user_b", uB)
      .maybeSingle();

    if (existingConv?.id) {
      return existingConv.id;
    }

    // 2. Try RPC start_official_support_chat
    try {
      const { data: rpcConvId, error: rpcErr } = await (supabase.rpc as any)(
        "start_official_support_chat",
        { target_user_id: userId }
      );
      if (!rpcErr && rpcConvId) {
        return rpcConvId as string;
      }
    } catch {
      // Fallback below
    }

    // 3. Fallback: ensure match row exists then insert conversation
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

    if (matchId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          match_id: matchId,
          user_a: uA,
          user_b: uB,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (newConv?.id) {
        return newConv.id;
      }
    }
  } catch (err) {
    console.error("Error in getOrCreateAppConversation:", err);
  }

  return null;
}

/**
 * Broadcasts an update message from the App to ALL registered users.
 * Inserts a real chat message in each user's official app chat,
 * updates conversation timestamps, and generates in-app notifications.
 */
export async function broadcastUpdateToAllUsers(
  title: string,
  message: string
): Promise<{ count: number; error?: string }> {
  const fullContent = `${title.trim()}\n\n${message.trim()}`;

  try {
    // 1. First try server-side RPC if available
    try {
      const { data: rpcCount, error: rpcErr } = await (supabase.rpc as any)(
        "broadcast_official_app_update",
        { p_title: title, p_message: message }
      );
      if (!rpcErr && typeof rpcCount === "number" && rpcCount > 0) {
        return { count: rpcCount };
      }
    } catch {
      // Continue to client-side orchestration
    }

    // 2. Fetch all profiles except the system user
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .neq("id", OFFICIAL_APP_USER_ID);

    if (pErr || !profiles || profiles.length === 0) {
      return { count: 0, error: pErr?.message || "No se encontraron usuarios para enviar el mensaje." };
    }

    let delivered = 0;

    // Process each user to deliver the message into their Panal chat
    await Promise.allSettled(
      profiles.map(async (p) => {
        try {
          const convId = await getOrCreateAppConversation(p.id);
          if (!convId) return;

          // Insert actual message in this user's official app chat
          const { error: msgErr } = await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: OFFICIAL_APP_USER_ID,
            content: fullContent,
          });

          if (!msgErr) {
            delivered++;

            // Update conversation last_message_at
            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", convId);

            // Create in-app notification linking directly to this chat
            await supabase.from("notifications").insert({
              user_id: p.id,
              actor_id: OFFICIAL_APP_USER_ID,
              type: "message",
              entity_id: convId,
            });
          }
        } catch (err) {
          console.warn(`Could not deliver broadcast to user ${p.id}:`, err);
        }
      })
    );

    return { count: delivered };
  } catch (err: any) {
    console.error("Error in broadcastUpdateToAllUsers:", err);
    return { count: 0, error: err.message || "Error al difundir mensaje" };
  }
}
