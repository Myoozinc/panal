import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OFFICIAL_SUPPORT_USER_ID, OFFICIAL_SUPPORT_PROFILE } from "@/lib/constants";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/independent";

interface AdminOfficialChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  } | null;
}

export const AdminOfficialChatModal = ({ open, onOpenChange, targetUser }: AdminOfficialChatModalProps) => {
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize or load official conversation
  useEffect(() => {
    if (!open || !targetUser?.id) {
      setConversationId(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    const initChat = async () => {
      setLoading(true);
      try {
        // 1. Call RPC to get or create official support chat
        let convId: string | null = null;
        try {
          const { data: rpcConvId, error: rpcErr } = await (supabase.rpc as any)(
            "start_official_support_chat",
            { target_user_id: targetUser.id }
          );
          if (!rpcErr && rpcConvId) {
            convId = rpcConvId;
          }
        } catch {
          // RPC may not be available yet
        }

        // 2. Fallback: find existing conversation between system user and target user
        if (!convId) {
          const [uA, uB] =
            OFFICIAL_SUPPORT_USER_ID < targetUser.id
              ? [OFFICIAL_SUPPORT_USER_ID, targetUser.id]
              : [targetUser.id, OFFICIAL_SUPPORT_USER_ID];

          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_a", uA)
            .eq("user_b", uB)
            .maybeSingle();

          if (conv?.id) {
            convId = conv.id;
          } else {
            // Check match or insert
            let matchId: string | null = null;
            const { data: m } = await supabase
              .from("matches")
              .select("id")
              .eq("user_a", uA)
              .eq("user_b", uB)
              .maybeSingle();

            if (m?.id) {
              matchId = m.id;
            } else {
              const { data: newMatch } = await supabase
                .from("matches")
                .insert({ user_a: uA, user_b: uB })
                .select("id")
                .maybeSingle();
              if (newMatch?.id) matchId = newMatch.id;
            }

            if (matchId) {
              const { data: newConv } = await supabase
                .from("conversations")
                .insert({ match_id: matchId, user_a: uA, user_b: uB })
                .select("id")
                .maybeSingle();
              if (newConv?.id) convId = newConv.id;
            }
          }
        }

        if (!isMounted) return;
        setConversationId(convId);

        if (convId) {
          // Fetch existing messages
          const { data: msgs } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: true });

          if (isMounted) {
            setMessages((msgs ?? []) as Message[]);
          }
        }
      } catch (err: any) {
        console.error("Error initializing official chat:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [open, targetUser?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`official-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText ?? inputText).trim();
    if (!text || !targetUser?.id || sending) return;

    setSending(true);
    try {
      // 1. Try sending via RPC (which sends as OFFICIAL_SUPPORT_USER_ID)
      let sentSuccess = false;
      try {
        const { data: msgId, error: rpcErr } = await (supabase.rpc as any)(
          "send_official_support_message",
          {
            target_user_id: targetUser.id,
            p_content: text,
          }
        );
        if (!rpcErr && msgId) {
          sentSuccess = true;
        }
      } catch {
        // Fallback to direct insert
      }

      // 2. Fallback direct insert if RPC not ready
      if (!sentSuccess && conversationId) {
        const { data: newMsg, error: insertErr } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: OFFICIAL_SUPPORT_USER_ID,
            content: text,
          })
          .select()
          .maybeSingle();

        if (!insertErr && newMsg) {
          sentSuccess = true;
          setMessages((prev) => [...prev, newMsg as Message]);
        }
      }

      if (!customText) setInputText("");

      // Refresh conversation messages
      if (conversationId) {
        const { data: updated } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        if (updated) setMessages(updated as Message[]);
      }
    } catch (err: any) {
      console.error("Error sending official message:", err);
      toast({
        variant: "destructive",
        title: "No se pudo enviar el mensaje",
        description: err.message || "Verifica los permisos de administrador.",
      });
    } finally {
      setSending(false);
    }
  };

  const cannedReplies = [
    "¡Hola! Te escribimos del equipo de soporte de Independent. ¿Cómo podemos orientarte?",
    "Hemos revisado tu perfil y todo está en orden. ¡Mucho éxito en tus colaboraciones!",
    "Recuerda que puedes completar tus géneros y pistas musicales para destacar en Discover.",
  ];

  if (!targetUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Header with App Identity branding */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/40 bg-card/90 backdrop-blur shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border-2 border-primary/30">
                  <AvatarImage src={OFFICIAL_SUPPORT_PROFILE.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">IN</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow">
                  <Shield className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
                  <span>Independent</span>
                  <VerifiedBadge size={13} />
                  <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded-full">
                    App Oficial
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Chat oficial con{" "}
                  <strong className="text-foreground">{targetUser.display_name || `@${targetUser.username}`}</strong> ·{" "}
                  <span className="text-primary font-medium">Enviando como la app Independent</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Notice banner */}
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/15 text-[11px] text-muted-foreground flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Los mensajes se envían con el nombre y logo de <strong>Independent</strong> (la app). El usuario lo recibe en su canal oficial de mensajes.
          </span>
        </div>

        {/* Chat Messages Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Cargando canal oficial...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold">Inicia la conversación oficial</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Envía el primer mensaje oficial a {targetUser.display_name || `@${targetUser.username}`}. El usuario
                recibirá una notificación en su buzón de Independent.
              </p>
              <div className="pt-2 flex flex-col gap-1.5 max-w-md mx-auto">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Respuestas sugeridas:
                </p>
                {cannedReplies.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    disabled={sending}
                    className="text-left text-xs p-2.5 rounded-xl border border-border/50 bg-card hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    "{reply}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isOfficial = m.sender_id === OFFICIAL_SUPPORT_USER_ID;
              return (
                <div key={m.id} className={cn("flex gap-2.5", isOfficial ? "justify-end" : "justify-start")}>
                  {!isOfficial && (
                    <Avatar className="w-7 h-7 mt-0.5 shrink-0">
                      <AvatarImage src={targetUser.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {targetUser.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn("max-w-[78%] space-y-1", isOfficial ? "items-end text-right" : "items-start")}>
                    <div className="text-[10px] text-muted-foreground px-1">
                      {isOfficial ? (
                        <span className="font-semibold text-primary">Independent (App)</span>
                      ) : (
                        <span>{targetUser.display_name || `@${targetUser.username}`}</span>
                      )}{" "}
                      · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div
                      className={cn(
                        "px-3.5 py-2 rounded-2xl text-xs sm:text-sm break-words whitespace-pre-wrap leading-relaxed shadow-sm",
                        isOfficial
                          ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-br-xs"
                          : "bg-card border border-border/40 text-foreground rounded-bl-xs"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>

                  {isOfficial && (
                    <Avatar className="w-7 h-7 mt-0.5 shrink-0 border border-primary/30">
                      <AvatarImage src={OFFICIAL_SUPPORT_PROFILE.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">IN</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-border/40 bg-card/90 backdrop-blur shrink-0 space-y-2">
          {messages.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {cannedReplies.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(r)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  {r.slice(0, 32)}...
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje oficial como Independent..."
              disabled={sending || loading}
              className="rounded-full bg-background"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || loading || !inputText.trim()}
              className="rounded-full shrink-0 bg-primary hover:bg-primary/90"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOfficialChatModal;
