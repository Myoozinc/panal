import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Sparkles,
  Plus,
  Megaphone,
  Disc3,
  Heart,
  MessageCircle,
  MapPin,
  Check,
  UserCheck,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CollaborationWithDetails } from "@/types/panal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeletons";
import ShareButton from "@/components/ShareButton";
import CollabInteractions from "@/components/CollabInteractions";
import { getEmbed } from "@/lib/embeds";
import { DISCIPLINES, type Discipline } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const disciplineLabel = (d: string | null | undefined) => {
  if (!d) return "Colaborador";
  return DISCIPLINES.find((x) => x.value === d)?.label ?? d;
};

const disciplineEmoji = (d: string | null | undefined) => {
  if (!d) return "🎨";
  return DISCIPLINES.find((x) => x.value === d)?.emoji ?? "🎨";
};

type FeedTab = "all" | "calls" | "collabs";

const Feed = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feed-collabs"],
    enabled: !!user,
    queryFn: async (): Promise<CollaborationWithDetails[]> => {
      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          *,
          owner:profiles!collaborations_owner_id_fkey(id, display_name, username, avatar_url),
          participants:collaboration_participants(
            user:profiles!collaboration_participants_user_id_fkey(id, display_name, username, avatar_url)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        participants: (c.participants ?? []).map((p: any) => p.user).filter(Boolean),
      })) as CollaborationWithDetails[];
    },
  });

  const calls = items.filter((c) => c.post_type === "call");
  const collabs = items.filter((c) => c.post_type !== "call");

  const displayedItems =
    tab === "calls" ? calls : tab === "collabs" ? collabs : items;

  return (
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto space-y-4">
      <PageHeader
        title="Feed"
        subtitle="Llamados, búsquedas y colaboraciones de la comunidad"
        action={
          <Link to="/collabs/new">
            <Button size="sm" className="rounded-full gap-1.5 bg-gradient-to-r from-primary to-secondary font-bold">
              <Plus className="w-4 h-4" /> Publicar
            </Button>
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all shrink-0",
            tab === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Todos ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("calls")}
          className={cn(
            "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all shrink-0 flex items-center gap-1.5",
            tab === "calls"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Megaphone className="w-3.5 h-3.5" /> Llamados ({calls.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("collabs")}
          className={cn(
            "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all shrink-0 flex items-center gap-1.5",
            tab === "collabs"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Disc3 className="w-3.5 h-3.5" /> Colaboraciones ({collabs.length})
        </button>
      </div>

      {isLoading ? (
        <CardSkeleton cards={3} />
      ) : displayedItems.length === 0 ? (
        <EmptyState
          icon={tab === "calls" ? Megaphone : Sparkles}
          title={
            tab === "calls"
              ? "No hay llamados activos"
              : tab === "collabs"
              ? "Aún no hay colaboraciones publicadas"
              : "El feed está tranquilo"
          }
          description={
            tab === "calls"
              ? "Sé el primero en hacer un llamado y encontrar cantantes, productores o músicos para tu proyecto."
              : "Comparte tus temas terminados o haz un llamado para encontrar colaboradores."
          }
          actionLabel={tab === "calls" ? "Publicar un Llamado" : "Crear publicación"}
          actionTo="/collabs/new"
        />
      ) : (
        <div className="space-y-4">
          {displayedItems.map((item) =>
            item.post_type === "call" ? (
              <CallCard key={item.id} call={item} currentUserId={user?.id} />
            ) : (
              <CollabCard key={item.id} collab={item} />
            )
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Open Call / Llamado Card:
 * Highlights talent searches, requested discipline, location, and allows direct match requests.
 */
export const CallCard = ({
  call,
  currentUserId,
}: {
  call: CollaborationWithDetails;
  currentUserId?: string;
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const isOwner = currentUserId === call.owner.id;

  // Check if current user already has a match with the call owner
  const { data: matchData } = useQuery({
    queryKey: ["match-status-with", currentUserId, call.owner.id],
    enabled: !!currentUserId && !isOwner,
    queryFn: async () => {
      const [uA, uB] =
        currentUserId! < call.owner.id
          ? [currentUserId!, call.owner.id]
          : [call.owner.id, currentUserId!];
      const { data } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", uA)
        .eq("user_b", uB)
        .maybeSingle();
      return !!data;
    },
  });

  const handleConnect = async () => {
    if (!currentUserId || isOwner) return;
    setConnecting(true);

    try {
      if (matchData) {
        // Already matched -> open chat
        const [uA, uB] =
          currentUserId < call.owner.id
            ? [currentUserId, call.owner.id]
            : [call.owner.id, currentUserId];

        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_a", uA)
          .eq("user_b", uB)
          .maybeSingle();

        if (conv?.id) {
          navigate(`/chat/${conv.id}`);
        } else {
          navigate(`/matches`);
        }
        return;
      }

      // Send swipe like directly from feed
      const { error } = await supabase.from("swipes").upsert(
        {
          swiper_id: currentUserId,
          swiped_id: call.owner.id,
          direction: "like",
        },
        { onConflict: "swiper_id,swiped_id" }
      );

      if (error && (error as any).code !== "23505") throw error;

      qc.invalidateQueries({ queryKey: ["match-status-with", currentUserId, call.owner.id] });
      qc.invalidateQueries({ queryKey: ["matches", currentUserId] });

      toast({
        title: "¡Solicitud de conexión enviada!",
        description: `Le diste like a ${call.owner.display_name}. Si conecta contigo, se abrirá el chat automáticamente.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "No se pudo enviar la solicitud",
        description: err.message,
      });
    } finally {
      setConnecting(false);
    }
  };

  const embed =
    getEmbed(call.spotify_url) ?? getEmbed(call.youtube_url) ?? getEmbed(call.soundcloud_url);

  return (
    <article className="rounded-3xl overflow-hidden bg-card border border-primary/25 shadow-sm hover:shadow-md transition-all">
      {/* Top Banner: Call Notice */}
      <div className="bg-gradient-to-r from-primary/15 via-secondary/15 to-transparent px-4 py-3 border-b border-primary/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            <Megaphone className="w-3 h-3" /> LLAMADO ABIERTO
          </span>
          {call.target_discipline && (
            <span className="text-xs font-bold text-foreground inline-flex items-center gap-1">
              Busca: {disciplineEmoji(call.target_discipline)} {disciplineLabel(call.target_discipline)}
            </span>
          )}
        </div>

        {call.location && (
          <span className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1 bg-muted/80 px-2 py-0.5 rounded-full">
            <MapPin className="w-3 h-3 text-primary" /> {call.location}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Creator Info Header */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/profile/${call.owner.username}`}
            className="flex items-center gap-2.5 group hover:opacity-90 min-w-0"
          >
            {call.owner.avatar_url ? (
              <img
                src={call.owner.avatar_url}
                alt={call.owner.display_name ?? ""}
                className="w-9 h-9 rounded-full object-cover border border-primary/25 group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                {call.owner.display_name?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                {call.owner.display_name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                @{call.owner.username}
              </p>
            </div>
          </Link>

          <ShareButton path={`/profile/${call.owner.username}`} title={call.title} />
        </div>

        {/* Call Project Details */}
        <div>
          <h3 className="text-base font-black leading-tight text-foreground">{call.title}</h3>
          {call.description && (
            <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
              {call.description}
            </p>
          )}
        </div>

        {/* Optional Reference Embed or Cover */}
        {embed ? (
          <div className="rounded-2xl overflow-hidden border border-border/40 mt-2">
            <iframe
              src={embed.src}
              title={embed.title}
              height={embed.height}
              loading="lazy"
              allow="encrypted-media; clipboard-write; picture-in-picture"
              className="w-full border-0 bg-muted"
            />
          </div>
        ) : call.cover_url ? (
          <div className="aspect-video bg-muted rounded-2xl overflow-hidden mt-2">
            <img
              src={call.cover_url}
              alt={call.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Action Buttons: View Profile & Connect */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
          <Link to={`/profile/${call.owner.username}`}>
            <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5 font-medium">
              Ver Perfil
            </Button>
          </Link>

          {!isOwner && (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
              className={cn(
                "rounded-full text-xs font-bold gap-1.5 shadow-xs",
                matchData
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {matchData ? (
                <>
                  <MessageCircle className="w-3.5 h-3.5" /> Chatear
                </>
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5 fill-current" /> Conectar / Solicitar Match
                </>
              )}
            </Button>
          )}
        </div>

        <CollabInteractions collabId={call.id} ownerId={call.owner.id} />
      </div>
    </article>
  );
};

/**
 * Standard Collaboration Card:
 * For completed music releases, embeds, and participants.
 */
export const CollabCard = ({ collab }: { collab: CollaborationWithDetails }) => {
  const links = [
    { url: collab.spotify_url, label: "Spotify" },
    { url: collab.youtube_url, label: "YouTube" },
    { url: collab.soundcloud_url, label: "SoundCloud" },
    { url: collab.instagram_url, label: "Instagram" },
  ].filter((l) => l.url);

  const embed =
    getEmbed(collab.spotify_url) ?? getEmbed(collab.youtube_url) ?? getEmbed(collab.soundcloud_url);

  return (
    <article className="rounded-3xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-lg transition-all">
      {embed ? (
        <iframe
          src={embed.src}
          title={embed.title}
          height={embed.height}
          loading="lazy"
          allow="encrypted-media; clipboard-write; picture-in-picture"
          className="w-full border-0 bg-muted"
        />
      ) : collab.cover_url ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={collab.cover_url} alt={`Portada de ${collab.title}`} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black leading-tight">{collab.title}</h3>
          <ShareButton path={`/feed`} title={collab.title} />
        </div>
        {collab.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{collab.description}</p>}

        <div className="flex items-center gap-2 mt-3">
          <Link to={`/profile/${collab.owner.username}`} className="flex items-center gap-2 hover:opacity-80">
            {collab.owner.avatar_url ? (
              <img src={collab.owner.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted" />
            )}
            <span className="text-xs font-semibold">{collab.owner.display_name}</span>
          </Link>
          {collab.participants.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">×</span>
              <div className="flex -space-x-2">
                {collab.participants.slice(0, 4).map((p) => (
                  <Link key={p.id} to={`/profile/${p.username}`} title={p.display_name ?? ""}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full border-2 border-card object-cover" loading="lazy" />
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-card bg-muted" />
                    )}
                  </Link>
                ))}
                {collab.participants.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-muted text-xs flex items-center justify-center font-semibold">+{collab.participants.length - 4}</div>
                )}
              </div>
            </>
          )}
        </div>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition"
              >
                {l.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2 flex items-center justify-between border-t border-border/30">
          <Link to={`/profile/${collab.owner.username}`}>
            <Button size="sm" variant="ghost" className="rounded-full text-xs h-8 px-3">
              Ver Perfil
            </Button>
          </Link>
        </div>

        <CollabInteractions collabId={collab.id} ownerId={collab.owner.id} />
      </div>
    </article>
  );
};

export default Feed;
