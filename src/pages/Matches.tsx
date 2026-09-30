import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Sparkles, Shield, Users, Loader2, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PageHeader from "@/components/PageHeader";
import { ListSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { OFFICIAL_APP_USER_ID, OFFICIAL_APP_PROFILE } from "@/lib/constants";
import { getOrCreateAppConversation } from "@/lib/officialChat";
import { PanalService } from "@/services/panalService";
import type { Profile } from "@/types/panal";

interface ConvMemberInfo {
  user_id: string;
  role: string;
  profile?: Profile;
}

interface ConvRow {
  id: string;
  user_a: string;
  user_b: string;
  is_group?: boolean | null;
  title?: string | null;
  collab_id?: string | null;
  last_message_at: string | null;
  created_at: string;
  other: Profile | undefined;
  members?: ConvMemberInfo[];
  last_message?: { content: string; sender_id: string; created_at: string } | null;
  unread: number;
  isAdmin: boolean;
}

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openingAppChat, setOpeningAppChat] = useState(false);

  const { data: panalMatches = [] } = useQuery({
    queryKey: ["panal-local-matches", user?.id],
    queryFn: () => PanalService.getMatches(user?.id || "demo_user"),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["match-conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConvRow[]> => {
      // 1. Fetch conversations where user is member via conversation_members
      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      const memberConvIds = (memberRows ?? []).map((m: any) => m.conversation_id);

      // 2. Fetch conversations
      let q = supabase
        .from("conversations")
        .select("id, user_a, user_b, is_group, title, collab_id, last_message_at, created_at");

      if (memberConvIds.length > 0) {
        q = q.or(`user_a.eq.${user!.id},user_b.eq.${user!.id},id.in.(${memberConvIds.join(",")})`);
      } else {
        q = q.or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
      }

      const { data: convs, error } = await q.order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      if (!convs?.length) return [];

      // 3. For 1-on-1 chats, collect other user profiles
      const otherIds = convs
        .filter((c) => !c.is_group)
        .map((c) => (c.user_a === user!.id ? c.user_b : c.user_a));
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds.length > 0 ? otherIds : ["00000000-0000-0000-0000-000000000000"]);

      // 4. For group conversations, fetch members + profiles
      const groupConvIds = convs.filter((c) => c.is_group).map((c) => c.id);
      let groupMembersMap = new Map<string, ConvMemberInfo[]>();
      if (groupConvIds.length > 0) {
        const { data: grpMembers } = await supabase
          .from("conversation_members")
          .select("conversation_id, user_id, role, profile:profiles(*)")
          .in("conversation_id", groupConvIds);

        if (grpMembers) {
          for (const gm of grpMembers) {
            const list = groupMembersMap.get(gm.conversation_id) || [];
            list.push({
              user_id: gm.user_id,
              role: gm.role,
              profile: gm.profile as unknown as Profile,
            });
            groupMembersMap.set(gm.conversation_id, list);
          }
        }
      }

      // 5. Fetch last messages
      const lastMsgs = await Promise.all(
        convs.map(async (c) => {
          const { data } = await supabase
            .from("messages")
            .select("content, sender_id, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return data;
        })
      );

      // 6. Fetch unread counts
      const unreadCounts = await Promise.all(
        convs.map(async (c) => {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_id", user!.id)
            .is("read_at", null);
          return count ?? 0;
        })
      );

      return convs.map((c, i) => {
        const otherId = c.user_a === user!.id ? c.user_b : c.user_a;
        const matchedProfile =
          profiles?.find((p) => p.id === otherId) ||
          (otherId === OFFICIAL_APP_USER_ID ? (OFFICIAL_APP_PROFILE as unknown as Profile) : undefined);

        return {
          ...c,
          other: matchedProfile as Profile | undefined,
          members: groupMembersMap.get(c.id) || [],
          last_message: lastMsgs[i],
          unread: unreadCounts[i],
          isAdmin: !c.is_group && otherId === OFFICIAL_APP_USER_ID,
        };
      });
    },
  });

  // Separate App Channel, Squads/Groups, and Individual Artist matches
  const appConv = rows.find((r) => r.isAdmin);
  const squadConvs = rows.filter((r) => !r.isAdmin && r.is_group);
  const artistConvs = rows.filter((r) => !r.isAdmin && !r.is_group);

  const handleOpenAppChat = async () => {
    if (!user) return;
    if (appConv?.id) {
      navigate(`/chat/${appConv.id}`);
      return;
    }

    setOpeningAppChat(true);
    try {
      const convId = await getOrCreateAppConversation(user.id);
      if (convId) {
        navigate(`/chat/${convId}`);
      }
    } finally {
      setOpeningAppChat(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Mensajes" subtitle="Tus chats y avisos oficiales" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className="space-y-6">
          {/* Matches del Panal (Creators Ready to Collab) */}
          {panalMatches.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 px-1">
                <span>🐝</span> Nuevas Conexiones del Panal ({panalMatches.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {panalMatches.map((m) => (
                  <Link
                    key={m.id}
                    to={`/profile/${m.username || m.id}`}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 ring-2 ring-amber-400/80 group-hover:scale-105 transition-all shadow-md">
                        <AvatarImage src={m.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-amber-500/20 text-amber-500 font-bold">
                          {m.display_name?.[0] ?? "🐝"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                        ⚡
                      </div>
                    </div>
                    <span className="text-xs font-bold truncate max-w-[70px] text-foreground">
                      {m.display_name?.split(" ")[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 1. Official Panal Channel: Always pinned at top */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
              <Shield className="w-3.5 h-3.5 text-amber-500" /> Canal Oficial
            </h3>

            <div
              onClick={handleOpenAppChat}
              className="cursor-pointer p-3.5 rounded-2xl bg-gradient-to-r from-card via-card to-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5 group"
            >
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12 border-2 border-amber-400 group-hover:scale-105 transition-transform bg-amber-500/20">
                  <AvatarFallback className="bg-amber-400 text-slate-950 font-black text-sm">
                    🐝
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow">
                  <Shield className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">Panal Oficial</span>
                    <VerifiedBadge size={14} />
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40 px-2 py-0.2 rounded-full">
                      Soporte & Sinergias
                    </span>
                  </div>
                  {appConv?.last_message?.created_at && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(appConv.last_message.created_at), {
                        addSuffix: false,
                        locale: es,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-md">
                    {appConv?.last_message?.content
                      ? appConv.last_message.content.replace(/\n+/g, " ")
                      : "Canal oficial de novedades, actualizaciones y soporte."}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    {openingAppChat ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (appConv?.unread ?? 0) > 0 ? (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center animate-pulse">
                        {appConv!.unread}
                      </span>
                    ) : (
                      <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Project Squads & Multi-Matches */}
          {squadConvs.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                <Rocket className="w-3.5 h-3.5 text-primary" /> Proyectos & Squads ({squadConvs.length})
              </h3>
              <ul className="space-y-2">
                {squadConvs.map((r) => {
                  const lastTime = r.last_message?.created_at ?? r.created_at;
                  const preview = r.last_message
                    ? (r.last_message.sender_id === user?.id ? "Tú: " : "") + r.last_message.content
                    : "Grupo creado. ¡Inicien la colaboración!";
                  const memberList = r.members || [];

                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-card to-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
                    >
                      <Link to={`/chat/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0" title="Abrir chat de squad">
                        {/* Stacked Avatars */}
                        <div className="flex -space-x-3 overflow-hidden shrink-0">
                          {memberList.slice(0, 3).map((m, i) => (
                            <Avatar key={m.user_id || i} className="w-11 h-11 border-2 border-background shadow-xs">
                              <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                {m.profile?.display_name?.[0] ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {memberList.length === 0 && (
                            <Avatar className="w-11 h-11 border-2 border-background">
                              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                <Users className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-sm truncate flex items-center gap-1.5">
                              <span className="truncate">{r.title || "Squad de Proyecto"}</span>
                              <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded-full shrink-0">
                                Squad
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(lastTime), { addSuffix: false, locale: es })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">{preview}</p>
                            {r.unread > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                                {r.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/collab-ai/${r.id}`}
                        className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
                        title="Armar plan de colaboración con IA (Beta)"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Link>

                      <Link
                        to={`/chat/${r.id}`}
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Abrir chat"
                      >
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* 3. Artist Connections */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
              <Users className="w-3.5 h-3.5" /> Tus Conexiones Directas ({artistConvs.length})
            </h3>

            {artistConvs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-card border border-border/40 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold">Aún no tienes chats con otros artistas</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Haz swipe a la derecha en Discover para conectar con músicos, productores y cantantes.
                </p>
                <div className="pt-2">
                  <Link to="/discover">
                    <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-pink-500" /> Ir a Descubrir
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {artistConvs.map((r) => {
                  if (!r.other) return null;
                  const lastTime = r.last_message?.created_at ?? r.created_at;
                  const preview = r.last_message
                    ? (r.last_message.sender_id === user?.id ? "Tú: " : "") + r.last_message.content
                    : "¡Inicia la conversación!";

                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/40 transition-colors"
                    >
                      <Link to={`/chat/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0" title="Abrir chat">
                        <div className="relative shrink-0">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={r.other.avatar_url ?? undefined} />
                            <AvatarFallback>{r.other.display_name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-sm truncate flex items-center gap-1.5">
                              <span>{r.other.display_name}</span>
                              {r.other.is_verified && <VerifiedBadge size={14} />}
                            </div>
                            <div className="text-[11px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(lastTime), { addSuffix: false, locale: es })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">{preview}</p>
                            {r.unread > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                                {r.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/collab-ai/${r.id}`}
                        className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
                        title="Armar plan de colaboración con IA (Beta)"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Link>

                      <Link
                        to={`/chat/${r.id}`}
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Abrir chat"
                      >
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Matches;
