import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Shield,
  Send,
  MessageCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { OFFICIAL_APP_USER_ID, OFFICIAL_APP_PROFILE } from "@/lib/constants";
import AdminOfficialChatModal from "@/components/admin/AdminOfficialChatModal";
import type { Conversation, Message, Profile } from "@/types/independent";
import { cn } from "@/lib/utils";

const AdminConversationDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [modalTargetUser, setModalTargetUser] = useState<Profile | null>(null);

  const cannedReplies = [
    "¡Hola! Te escribe el equipo de Independent. ¿En qué podemos orientarte?",
    "Hemos revisado tu perfil y todo está en orden. ¡Mucho éxito en tus colaboraciones!",
    "Recuerda que puedes completar tus géneros y pistas musicales para destacar en Discover.",
    "Gracias por ponerte en contacto. Estamos trabajando en resolver tu inquietud a la brevedad.",
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["admin-conv", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId!)
        .maybeSingle();

      if (error) throw error;
      if (!conv) return null;
      const c = conv as Conversation;

      const [{ data: msgs }, { data: profiles }] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id,display_name,username,avatar_url,discipline,is_verified")
          .in("id", [c.user_a, c.user_b]),
      ]);

      const byId = new Map(
        (profiles ?? []).map((p: any) => [
          p.id,
          p as Pick<Profile, "id" | "display_name" | "username" | "avatar_url" | "discipline" | "is_verified">,
        ])
      );

      // Inject official app profile for system user
      byId.set(OFFICIAL_APP_USER_ID, {
        id: OFFICIAL_APP_USER_ID,
        display_name: "Independent",
        username: "app",
        avatar_url: "/independent-logo-v2.png",
        discipline: "other",
        is_verified: true,
      });

      const isOfficial =
        c.user_a === OFFICIAL_APP_USER_ID || c.user_b === OFFICIAL_APP_USER_ID;
      const targetUserId =
        c.user_a === OFFICIAL_APP_USER_ID ? c.user_b : c.user_a;
      const targetUser = isOfficial ? byId.get(targetUserId) : null;

      return {
        conv: c,
        messages: (msgs ?? []) as Message[],
        a: byId.get(c.user_a),
        b: byId.get(c.user_b),
        isOfficial,
        targetUser,
        targetUserId,
      };
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content || !data?.conv || sending) return;

    setSending(true);
    try {
      // 1. Insert message with sender_id = OFFICIAL_APP_USER_ID
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: data.conv.id,
        sender_id: OFFICIAL_APP_USER_ID,
        content,
      });
      if (msgErr) throw msgErr;

      // 2. Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", data.conv.id);

      // 3. Notify the target user
      if (data.targetUserId) {
        await supabase.from("notifications").insert({
          user_id: data.targetUserId,
          actor_id: OFFICIAL_APP_USER_ID,
          type: "message",
          entity_id: data.conv.id,
        });
      }

      setText("");
      qc.invalidateQueries({ queryKey: ["admin-conv", conversationId] });
      qc.invalidateQueries({ queryKey: ["admin-conversations"] });

      toast({
        title: "Mensaje oficial enviado",
        description: `Entregado en el chat de ${data.targetUser?.display_name || "el usuario"}.`,
      });
    } catch (err: any) {
      console.error("Error sending official message:", err);
      toast({
        variant: "destructive",
        title: "No se pudo enviar el mensaje",
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center py-20 text-sm text-muted-foreground">
        Conversación no encontrada.
      </p>
    );
  }

  const { conv, messages, a, b, isOfficial, targetUser } = data;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link
        to="/admin/conversations"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a lista de chats
      </Link>

      {/* Header bar */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {isOfficial ? (
              <Avatar className="w-11 h-11 border-2 border-primary/30">
                <AvatarImage src="/independent-logo-v2.png" />
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                  IN
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex -space-x-2">
                <Avatar className="w-10 h-10 border-2 border-card">
                  <AvatarImage src={a?.avatar_url ?? undefined} />
                  <AvatarFallback>{a?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <Avatar className="w-10 h-10 border-2 border-card">
                  <AvatarImage src={b?.avatar_url ?? undefined} />
                  <AvatarFallback>{b?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold truncate flex items-center gap-1.5">
              {isOfficial ? (
                <>
                  <span>Independent</span>
                  <span className="text-muted-foreground font-normal">↔</span>
                  <span>{targetUser?.display_name || "Usuario"}</span>
                  <span className="text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded-full">
                    App Oficial
                  </span>
                </>
              ) : (
                <span>
                  {a?.display_name ?? "?"} ↔ {b?.display_name ?? "?"}
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {isOfficial
                ? `@${targetUser?.username || "—"}`
                : `@${a?.username ?? "—"} · @${b?.username ?? "—"}`}
            </div>
          </div>
        </div>

        {isOfficial && targetUser && (
          <Link to={`/admin/users/${targetUser.id}`}>
            <Button size="sm" variant="outline" className="rounded-full text-xs gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Ficha de Usuario
            </Button>
          </Link>
        )}
      </div>

      {/* Official Channel Info banner */}
      {isOfficial ? (
        <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3 text-xs flex items-center gap-2.5 text-foreground">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className="leading-relaxed">
            Estás en el <strong>Canal Oficial de Independent</strong> con {targetUser?.display_name}. Todos los mensajes que envíes aquí se entregarán con el nombre y logo de la aplicación.
          </span>
        </div>
      ) : (
        <div className="bg-muted/60 border border-border/40 rounded-2xl p-3 text-xs flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>Conversación privada entre artistas (Modo moderación)</span>
          </div>

          <div className="flex items-center gap-1.5">
            {a && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalTargetUser(a as Profile)}
                className="rounded-full text-xs h-7 px-2.5"
              >
                Escribir a {a.display_name?.split(" ")[0]}
              </Button>
            )}
            {b && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalTargetUser(b as Profile)}
                className="rounded-full text-xs h-7 px-2.5"
              >
                Escribir a {b.display_name?.split(" ")[0]}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        className="bg-card border border-border/40 rounded-2xl p-4 space-y-3 min-h-[40vh] max-h-[55vh] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">No hay mensajes en esta conversación</p>
            <p className="text-xs text-muted-foreground">
              {isOfficial
                ? "Escribe el primer mensaje a continuación para iniciar el contacto oficial."
                : "Los usuarios aún no han intercambiado mensajes."}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isFromApp = m.sender_id === OFFICIAL_APP_USER_ID;
            const sender = isFromApp
              ? OFFICIAL_APP_PROFILE
              : m.sender_id === a?.id
              ? a
              : b;

            return (
              <div
                key={m.id}
                className={cn("flex gap-2.5", isFromApp ? "justify-end" : "justify-start")}
              >
                {!isFromApp && (
                  <Avatar className="w-7 h-7 mt-0.5 shrink-0 border border-border/40">
                    <AvatarImage src={sender?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {sender?.display_name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[78%] space-y-1",
                    isFromApp ? "items-end text-right" : "items-start"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground px-1">
                    <span className="font-semibold text-foreground">
                      {isFromApp ? "Independent (App Oficial)" : sender?.display_name ?? "?"}
                    </span>{" "}
                    · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs sm:text-sm break-words whitespace-pre-wrap leading-relaxed shadow-xs",
                      isFromApp
                        ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-br-xs text-left"
                        : "bg-muted rounded-bl-xs text-foreground"
                    )}
                  >
                    {m.content}
                  </div>
                </div>

                {isFromApp && (
                  <Avatar className="w-7 h-7 mt-0.5 shrink-0 border border-primary/30">
                    <AvatarImage src="/independent-logo-v2.png" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-[9px]">
                      IN
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Official Reply Box (only for official app channels) */}
      {isOfficial && (
        <div className="bg-card border border-border/40 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
          {/* Canned reply shortcuts */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {cannedReplies.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(r)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
              >
                {r.slice(0, 32)}...
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Escribe un mensaje oficial como Independent para ${targetUser?.display_name || "el usuario"}...`}
              disabled={sending}
              className="rounded-xl h-11 bg-background"
            />
            <Button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-xl px-5 gap-1.5 font-bold bg-primary hover:bg-primary/90 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar como App
            </Button>
          </form>
        </div>
      )}

      {/* Modal for opening official chat with an artist from peer chats */}
      {modalTargetUser && (
        <AdminOfficialChatModal
          open={!!modalTargetUser}
          onOpenChange={(open) => !open && setModalTargetUser(null)}
          targetUser={modalTargetUser}
        />
      )}
    </div>
  );
};

export default AdminConversationDetail;
