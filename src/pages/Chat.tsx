import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Sparkles, Shield, Rocket, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { OFFICIAL_SUPPORT_USER_ID, OFFICIAL_SUPPORT_PROFILE, DISCIPLINES } from "@/lib/constants";
import type { Message, Profile, Conversation } from "@/types/panal";
import { PublishSquadModal } from "@/components/PublishSquadModal";

const Chat = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ["conversation", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId!)
        .maybeSingle();
      if (error) throw error;
      return data as Conversation | null;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["conversation-members", conversationId],
    enabled: !!conversationId && !!conv?.is_group,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, role, joined_at, profile:profiles(id, display_name, username, avatar_url, discipline)")
        .eq("conversation_id", conversationId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const otherId = conv ? (conv.user_a === user?.id ? conv.user_b : conv.user_a) : null;

  const { data: other } = useQuery({
    queryKey: ["profile-by-id", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      if (otherId === OFFICIAL_SUPPORT_USER_ID) {
        return OFFICIAL_SUPPORT_PROFILE as unknown as Profile;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", otherId!).maybeSingle();
      return (data || (otherId === OFFICIAL_SUPPORT_USER_ID ? OFFICIAL_SUPPORT_PROFILE : null)) as Profile | null;
    },
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean)));
  const { data: sendersProfiles = [] } = useQuery({
    queryKey: ["senders-profiles", senderIds.join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, discipline")
        .in("id", senderIds);
      return data ?? [];
    },
  });
  const senderMap = new Map<string, any>(sendersProfiles.map((p: any) => [p.id, p]));

  // realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`msg-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", conversationId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  // mark incoming as read
  useEffect(() => {
    if (!user?.id || !conversationId || messages.length === 0) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id))
      .then(() => qc.invalidateQueries({ queryKey: ["messages", conversationId] }));
  }, [messages, user?.id, conversationId, qc]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || !conversationId || !user) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
    setSending(false);
    if (error) {
      toast({ variant: "destructive", title: "No se pudo enviar", description: error.message });
      return;
    }
    setText("");
  };

  const isAppOfficial = otherId === OFFICIAL_SUPPORT_USER_ID;

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-40 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/matches")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {conv?.is_group ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex -space-x-3 overflow-hidden shrink-0">
              {members.slice(0, 3).map((m: any, i: number) => (
                <Avatar key={m.user_id || i} className="w-9 h-9 border-2 border-background">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                    {m.profile?.display_name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length === 0 && (
                <Avatar className="w-9 h-9 border-2 border-background">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    <Users className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                <span>{conv.title || "Squad de Proyecto"}</span>
                <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded-full shrink-0">
                  Squad
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {members.length > 0 ? `${members.length} integrantes colaborando` : "Proyecto conjunto"}
              </div>
            </div>
          </div>
        ) : other ? (
          isAppOfficial ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-amber-500/30">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback className="bg-amber-400 text-slate-950 font-black text-xs">🐝</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow">
                  <Shield className="w-3 h-3 fill-current" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-1.5">
                  <span>Panal</span>
                  <VerifiedBadge size={14} />
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                    App Oficial
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Canal de anuncios y soporte de la app
                </div>
              </div>
            </div>
          ) : (
            <Link to={`/profile/${other.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={other.avatar_url ?? undefined} />
                  <AvatarFallback>{other.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-1.5">
                  <span>{other.display_name}</span>
                  {other.is_verified && <VerifiedBadge size={14} />}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{other.username}
                </div>
              </div>
            </Link>
          )
        ) : null}
        {!isAppOfficial && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5 text-xs h-8 px-2.5 border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => setSquadModalOpen(true)}
              title="Publicar o buscar talento para este squad en Discover"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar talento</span>
              <span className="sm:hidden">Squad</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5 text-xs h-8 px-2.5"
              onClick={() => navigate(`/collab-ai/${conversationId}`)}
              title="Plan de colaboración con IA (Beta)"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Plan con IA</span>
              <span className="sm:hidden">IA</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold ml-0.5">BETA</Badge>
            </Button>
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {isAppOfficial && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-xs flex items-start gap-3 mb-4 shadow-sm">
            <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-500 mb-0.5">Canal Oficial de Panal</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Este es el canal oficial de la aplicación. Aquí recibirás novedades, actualizaciones de la plataforma y respuestas del soporte. Todos los avisos quedan guardados aquí.
              </p>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            {isAppOfficial
              ? "Envíanos tu consulta o mensaje y el equipo te responderá a la brevedad."
              : "Aún no hay mensajes. ¡Rompe el hielo!"}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const senderProfile = senderMap.get(m.sender_id);
            const senderDiscLabel = senderProfile?.discipline
              ? DISCIPLINES.find((d) => d.value === senderProfile.discipline)?.label
              : null;

            if (conv?.is_group && !mine) {
              return (
                <div key={m.id} className="flex items-start gap-2 max-w-[85%]">
                  <Avatar className="w-7 h-7 mt-0.5 shrink-0 border border-border/40">
                    <AvatarImage src={senderProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-muted font-bold">
                      {senderProfile?.display_name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                      <span className="font-semibold text-foreground truncate">
                        {senderProfile?.display_name || "Colaborador"}
                      </span>
                      {senderDiscLabel && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {senderDiscLabel}
                        </span>
                      )}
                    </div>
                    <div className="px-3.5 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap bg-muted rounded-tl-sm">
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap",
                    mine
                      ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2 px-3 py-3 border-t border-border/40 bg-card/80 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          maxLength={2000}
          className="rounded-full h-11"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sending} className="rounded-full h-11 w-11 shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      <PublishSquadModal
        isOpen={squadModalOpen}
        onClose={() => setSquadModalOpen(false)}
        conversationId={conversationId!}
        otherUser={other}
        defaultTitle={conv?.title || undefined}
      />
    </div>
  );
};

export default Chat;
