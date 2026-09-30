import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronRight,
  Shield,
  MessageCircle,
  Megaphone,
  Search,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { OFFICIAL_APP_USER_ID, OFFICIAL_APP_PROFILE } from "@/lib/constants";
import { getOrCreateAppConversation, broadcastUpdateToAllUsers } from "@/lib/officialChat";
import AdminOfficialChatModal from "@/components/admin/AdminOfficialChatModal";
import type { Conversation, Profile } from "@/types/independent";
import { cn } from "@/lib/utils";

type ConvTab = "official" | "all" | "artists";

const AdminConversations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<ConvTab>("official");
  const [search, setSearch] = useState("");

  // Mass broadcast dialog state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Start chat with specific user dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserForChat, setSelectedUserForChat] = useState<Profile | null>(null);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      const list = (data ?? []) as Conversation[];
      const ids = Array.from(new Set(list.flatMap((c) => [c.user_a, c.user_b])));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", ids);

      const byId = new Map(
        (profiles ?? []).map((p: any) => [
          p.id,
          p as Pick<Profile, "id" | "display_name" | "username" | "avatar_url">,
        ])
      );

      // Inject official support profile for system ID
      byId.set(OFFICIAL_APP_USER_ID, {
        id: OFFICIAL_APP_USER_ID,
        display_name: "Independent",
        username: "app",
        avatar_url: "/independent-logo-v2.png",
      });

      // Fetch last messages
      const lastMsgs = await Promise.all(
        list.map(async (c) => {
          const { data: m } = await supabase
            .from("messages")
            .select("content, sender_id, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return m;
        })
      );

      return list.map((c, i) => {
        const isOfficial =
          c.user_a === OFFICIAL_APP_USER_ID || c.user_b === OFFICIAL_APP_USER_ID;
        const otherId = c.user_a === OFFICIAL_APP_USER_ID ? c.user_b : c.user_a;
        const otherUser = isOfficial ? byId.get(otherId) : null;

        return {
          ...c,
          a: byId.get(c.user_a),
          b: byId.get(c.user_b),
          isOfficial,
          otherUser,
          lastMsg: lastMsgs[i],
        };
      });
    },
  });

  // Query all registered users for starting a new chat
  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-all-users-lookup"],
    enabled: newChatOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, discipline, is_verified")
        .neq("id", OFFICIAL_APP_USER_ID)
        .order("display_name", { ascending: true })
        .limit(100);
      return (data ?? []) as Profile[];
    },
  });

  const officialConvs = convs.filter((c) => c.isOfficial);
  const artistConvs = convs.filter((c) => !c.isOfficial);

  const filteredConvs = convs
    .filter((c) => {
      if (tab === "official") return c.isOfficial;
      if (tab === "artists") return !c.isOfficial;
      return true;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const nameA = c.a?.display_name?.toLowerCase() || "";
      const nameB = c.b?.display_name?.toLowerCase() || "";
      const userA = c.a?.username?.toLowerCase() || "";
      const userB = c.b?.username?.toLowerCase() || "";
      return nameA.includes(q) || nameB.includes(q) || userA.includes(q) || userB.includes(q);
    });

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast({ variant: "destructive", title: "El mensaje no puede estar vacío" });
      return;
    }

    setSendingBroadcast(true);
    try {
      const result = await broadcastUpdateToAllUsers(
        broadcastTitle.trim() || "Aviso Oficial de Independent",
        broadcastMessage.trim()
      );

      if (result.error && result.count === 0) {
        throw new Error(result.error);
      }

      toast({
        title: "¡Mensaje enviado a todos los usuarios!",
        description: `Se entregó en el chat de Independent de ${result.count} usuarios registrados.`,
      });
      setBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      qc.invalidateQueries({ queryKey: ["admin-conversations"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar mensaje masivo",
        description: err.message,
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleStartChatWithUser = async (targetUser: Profile) => {
    setNewChatOpen(false);
    setSelectedUserForChat(targetUser);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Broadcast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/40 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Bandeja de Mensajes y Soporte
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comunícate como <strong>Independent</strong> con cada usuario o envía comunicados masivos a todos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setBroadcastOpen(true)}
            className="rounded-full gap-1.5 font-bold bg-gradient-to-r from-primary to-secondary text-xs shadow-xs"
          >
            <Megaphone className="w-3.5 h-3.5" /> Enviar a Todos
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewChatOpen(true)}
            className="rounded-full gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-primary" /> Nuevo Chat Oficial
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/50">
          <button
            type="button"
            onClick={() => setTab("official")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              tab === "official"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="w-3.5 h-3.5 text-primary" /> Canal de la App ({officialConvs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("artists")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              tab === "artists"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Chats entre Artistas ({artistConvs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              tab === "all"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({convs.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario..."
            className="pl-8 h-9 text-xs rounded-xl bg-card"
          />
        </div>
      </div>

      {/* Conversation List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredConvs.length === 0 ? (
        <div className="p-8 bg-card border border-border/40 rounded-2xl text-center space-y-2">
          <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold">No se encontraron conversaciones</p>
          <p className="text-xs text-muted-foreground">
            {tab === "official"
              ? "Aún no hay chats directos. Usa el botón 'Enviar a Todos' o 'Nuevo Chat Oficial' para comunicarte."
              : "No hay chats que coincidan con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-2xl divide-y divide-border/40 overflow-hidden">
          {filteredConvs.map((c) => {
            const isOfficial = c.isOfficial;
            const target = isOfficial ? c.otherUser : null;

            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
              >
                <Link
                  to={`/admin/conversations/${c.id}`}
                  className="flex items-center gap-3.5 flex-1 min-w-0"
                >
                  {/* Avatars */}
                  <div className="relative shrink-0">
                    {isOfficial ? (
                      <div className="relative">
                        <Avatar className="w-10 h-10 border-2 border-primary/30">
                          <AvatarImage src="/independent-logo-v2.png" />
                          <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                            IN
                          </AvatarFallback>
                        </Avatar>
                        {target?.avatar_url && (
                          <Avatar className="w-6 h-6 border-2 border-card absolute -bottom-1 -right-1">
                            <AvatarImage src={target.avatar_url} />
                            <AvatarFallback className="text-[9px]">
                              {target.display_name?.[0] ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ) : (
                      <div className="flex -space-x-2">
                        <Avatar className="w-9 h-9 border-2 border-card">
                          <AvatarImage src={c.a?.avatar_url ?? undefined} />
                          <AvatarFallback>{c.a?.display_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-9 h-9 border-2 border-card">
                          <AvatarImage src={c.b?.avatar_url ?? undefined} />
                          <AvatarFallback>{c.b?.display_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">
                        {isOfficial
                          ? `Independent ↔ ${target?.display_name || "Usuario"}`
                          : `${c.a?.display_name ?? "?"} ↔ ${c.b?.display_name ?? "?"}`}
                      </span>
                      {isOfficial && (
                        <span className="text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> App Oficial
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.lastMsg?.content ? (
                        <span>
                          {c.lastMsg.sender_id === OFFICIAL_APP_USER_ID ? "Independent: " : ""}
                          {c.lastMsg.content.replace(/\n+/g, " ")}
                        </span>
                      ) : (
                        <span>
                          {isOfficial
                            ? `@${target?.username || "—"}`
                            : `@${c.a?.username ?? "—"} · @${c.b?.username ?? "—"}`}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : "—"}
                  </span>

                  {isOfficial && target && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUserForChat(target as Profile)}
                      className="rounded-full text-xs h-8 px-3 gap-1 bg-card hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span className="hidden md:inline">Responder</span>
                    </Button>
                  )}

                  <Link to={`/admin/conversations/${c.id}`}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Mass Broadcast to ALL users */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Megaphone className="w-4 h-4 text-primary" />
              Enviar Mensaje a Todos los Usuarios
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Este mensaje se entregará directamente en el chat oficial de <strong>Independent</strong> de cada usuario registrado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Título del aviso:</label>
              <Input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Ej: 🚀 Novedades importantes en Independent"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Mensaje completo:</label>
              <Textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={5}
                placeholder="Escribe el mensaje que verán todos los usuarios en su chat de la app..."
                className="rounded-xl resize-none text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBroadcastOpen(false)}
                disabled={sendingBroadcast}
                className="rounded-full text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="rounded-full gap-1.5 font-bold bg-primary hover:bg-primary/90 text-xs"
              >
                {sendingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar a todos los chats
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Start new official chat with a user */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-primary" />
              Iniciar Chat Oficial con un Usuario
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecciona a un usuario para comunicarte como <strong>Independent (la app)</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o username..."
              className="rounded-xl text-xs"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-border/30 rounded-xl border border-border/40">
              {allUsers
                .filter((u) => {
                  if (!userSearchQuery.trim()) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (
                    u.display_name?.toLowerCase().includes(q) ||
                    u.username?.toLowerCase().includes(q)
                  );
                })
                .map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {u.display_name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{u.display_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-full text-xs h-7 px-2.5 text-primary font-semibold">
                      Chatear
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Active Official Chat Modal */}
      {selectedUserForChat && (
        <AdminOfficialChatModal
          open={!!selectedUserForChat}
          onOpenChange={(open) => !open && setSelectedUserForChat(null)}
          targetUser={selectedUserForChat}
        />
      )}
    </div>
  );
};

export default AdminConversations;
