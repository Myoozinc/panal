import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Heart, X, MapPin, Sparkles, SlidersHorizontal, Undo2, Search, Zap, MessageCircle, Rocket, Users, Music, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { calculateCompatibility } from "@/lib/compatibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/Logo";
import EmptyState from "@/components/EmptyState";
import { SwipeSkeleton } from "@/components/Skeletons";
import VerifiedBadge from "@/components/VerifiedBadge";
import PanalMatchCard from "@/components/PanalMatchCard";
import { PanalService } from "@/services/panalService";
import { DISCIPLINES, type Discipline } from "@/lib/constants";
import type { Profile } from "@/types/independent";
import { cn } from "@/lib/utils";

const disciplineLabel = (d: Discipline | null) => DISCIPLINES.find((x) => x.value === d)?.label ?? "Artista";
const disciplineEmoji = (d: Discipline | null) => DISCIPLINES.find((x) => x.value === d)?.emoji ?? "🎨";

export interface SquadCardData {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  post_type: string;
  target_discipline: string | null;
  location: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  owner: Profile;
  participants: { user_id: string; role: string; profile?: Profile }[];
  created_at: string;
}

interface Filters {
  disciplines: Discipline[];
  city: string;
  verifiedOnly: boolean;
  seekingMeOnly: boolean;
}

const Discover = () => {
  const { user } = useAuth();
  const { data: me } = useProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [discoverMode, setDiscoverMode] = useState<"artists" | "squads">("artists");
  const [matchOpen, setMatchOpen] = useState<Profile | null>(null);
  const [multiMatchOpen, setMultiMatchOpen] = useState<{ squad: SquadCardData; conversationId: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({ disciplines: [], city: "", verifiedOnly: false, seekingMeOnly: false });
  const [lastSwipeId, setLastSwipeId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [dismissedSquadIds, setDismissedSquadIds] = useState<string[]>([]);
  const [lastSquadSwipeId, setLastSquadSwipeId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedIds([]);
    setDismissedSquadIds([]);
  }, [filters, discoverMode]);

  const activeFilters =
    filters.disciplines.length +
    (filters.city ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.seekingMeOnly ? 1 : 0);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["discover", user?.id, filters],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const [{ data: swiped }] = await Promise.all([
          supabase.from("swipes").select("swiped_id").eq("swiper_id", user!.id),
        ]);
        const excludeIds = Array.from(new Set([user!.id, ...(swiped?.map((s) => s.swiped_id) ?? [])]));

        let q = supabase
          .from("profiles")
          .select("*")
          .eq("onboarding_completed", true)
          .not("id", "in", `(${excludeIds.join(",")})`)
          .limit(20);

        if (filters.disciplines.length) q = q.in("discipline", filters.disciplines);
        if (filters.city.trim()) q = q.ilike("city", `%${filters.city.trim()}%`);
        if (filters.verifiedOnly) q = q.eq("is_verified", true);

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return data as Profile[];
        }
      } catch (err) {
        console.warn("Database query skipped, using Panal creators catalog:", err);
      }

      // Si la base no tiene perfiles o estamos en prototipo limpio sin usuarios viejos:
      return await PanalService.getDiscoverCreators(user?.id, filters);
    },
  });

  const activeCards = cards.filter((c) => !dismissedIds.includes(c.id));

  const swipeMutation = useMutation({
    mutationFn: async ({ swiped_id, direction }: { swiped_id: string; direction: "like" | "pass" }) => {
      // Registrar swipe en PanalService
      const panalRes = await PanalService.recordSwipe(user?.id || "demo_user", swiped_id, direction);

      try {
        // Intentar registrar en Supabase si no es un ID de demo
        if (!swiped_id.startsWith("creator-") && user?.id) {
          await supabase
            .from("swipes")
            .upsert({ swiper_id: user.id, swiped_id, direction }, { onConflict: "swiper_id,swiped_id" });
        }
      } catch (e) {
        // Fallback silencioso en modo demo
      }

      return { matched: panalRes.matched, swiped_id };
    },
    onSuccess: (result) => {
      setLastSwipeId(result.swiped_id ?? null);
      if (result.matched && result.swiped_id) {
        const matched = cards.find((c) => c.id === result.swiped_id);
        if (matched) setMatchOpen(matched);
      }
      qc.invalidateQueries({ queryKey: ["discover", user?.id] });
      qc.invalidateQueries({ queryKey: ["matches", user?.id] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "No se pudo guardar", description: err.message });
    },
  });

  const handleSwipe = (id: string, direction: "like" | "pass") => {
    if (dismissedIds.includes(id)) return;
    setDismissedIds((prev) => [...prev, id]);
    swipeMutation.mutate({ swiped_id: id, direction });
  };

  const undoSwipe = useMutation({
    mutationFn: async () => {
      if (!lastSwipeId) return;
      const { error } = await supabase
        .from("swipes")
        .delete()
        .eq("swiper_id", user!.id)
        .eq("swiped_id", lastSwipeId);
      if (error) throw error;
    },
    onSuccess: () => {
      setLastSwipeId(null);
      setDismissedIds((prev) => prev.slice(0, -1));
      qc.invalidateQueries({ queryKey: ["discover", user?.id] });
      toast({ title: "Swipe deshecho" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "No se pudo deshacer", description: err.message }),
  });

  // Squads / Multi-Matches Queries & Mutations
  const { data: squads = [], isLoading: squadsLoading } = useQuery({
    queryKey: ["discover-squads", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SquadCardData[]> => {
      const { data: swipedCollabs } = await supabase
        .from("swipes")
        .select("target_collab_id")
        .eq("swiper_id", user!.id)
        .not("target_collab_id", "is", null);

      const swipedCollabIds = (swipedCollabs ?? []).map((s: any) => s.target_collab_id).filter(Boolean);

      let q = supabase
        .from("collaborations")
        .select("*")
        .eq("post_type", "open_squad")
        .neq("owner_id", user!.id);

      if (swipedCollabIds.length > 0) {
        q = q.not("id", "in", `(${swipedCollabIds.join(",")})`);
      }

      const { data: rawSquads, error } = await q.order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      if (!rawSquads?.length) return [];

      const collabIds = rawSquads.map((s: any) => s.id);
      const ownerIds = rawSquads.map((s: any) => s.owner_id);

      const [{ data: partRows }, { data: ownerProfiles }] = await Promise.all([
        supabase
          .from("collaboration_participants")
          .select("collab_id, user_id, role, profile:profiles(*)")
          .in("collab_id", collabIds),
        supabase
          .from("profiles")
          .select("*")
          .in("id", ownerIds),
      ]);

      const ownerMap = new Map((ownerProfiles ?? []).map((p: any) => [p.id, p]));
      const partsByCollab = new Map<string, any[]>();
      for (const p of (partRows ?? [])) {
        const list = partsByCollab.get(p.collab_id) || [];
        list.push({
          user_id: p.user_id,
          role: p.role,
          profile: p.profile,
        });
        partsByCollab.set(p.collab_id, list);
      }

      return (rawSquads as any[])
        .filter((s: any) => {
          const parts = partsByCollab.get(s.id) || [];
          return !parts.some((p) => p.user_id === user!.id);
        })
        .map((s: any) => ({
          ...s,
          owner: ownerMap.get(s.owner_id) || {
            id: s.owner_id,
            display_name: "Creador",
            username: "creador",
            avatar_url: null,
            discipline: null,
          },
          participants: partsByCollab.get(s.id) || [],
        }));
    },
  });

  const activeSquadCards = squads.filter((s) => !dismissedSquadIds.includes(s.id));

  const squadSwipeMutation = useMutation({
    mutationFn: async ({ squad, direction }: { squad: SquadCardData; direction: "like" | "pass" }) => {
      let { error } = await supabase.from("swipes").upsert(
        {
          swiper_id: user!.id,
          target_collab_id: squad.id,
          direction,
        },
        { onConflict: "swiper_id,target_collab_id" }
      );

      if (error && (error.message?.includes("ON CONFLICT") || error.message?.includes("constraint"))) {
        const { error: insErr } = await supabase.from("swipes").insert({
          swiper_id: user!.id,
          target_collab_id: squad.id,
          direction,
        });
        if (!insErr || insErr.code === "23505" || insErr.message?.includes("duplicate")) {
          error = null;
        }
      }

      if (direction === "like") {
        const { data, error } = await supabase.rpc("join_squad_multimatch", {
          p_collab_id: squad.id,
        });
        if (error) throw error;
        return { matched: true, conversation_id: data?.conversation_id, squad };
      }
      return { matched: false, squad };
    },
    onSuccess: (res) => {
      setLastSquadSwipeId(res.squad.id);
      if (res.matched && res.conversation_id) {
        setMultiMatchOpen({ squad: res.squad, conversationId: res.conversation_id });
      }
      qc.invalidateQueries({ queryKey: ["discover-squads", user?.id] });
      qc.invalidateQueries({ queryKey: ["match-conversations", user?.id] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "No se pudo conectar al proyecto", description: err.message });
    },
  });

  const handleSquadSwipe = (squad: SquadCardData, direction: "like" | "pass") => {
    if (dismissedSquadIds.includes(squad.id)) return;
    setDismissedSquadIds((prev) => [...prev, squad.id]);
    squadSwipeMutation.mutate({ squad, direction });
  };

  const toggleDiscipline = (d: Discipline) =>
    setFilters((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d) ? f.disciplines.filter((x) => x !== d) : [...f.disciplines, d],
    }));

  return (
    <div className="px-4 pt-4 pb-2">
      <header className="flex items-center justify-between gap-2 mb-4">
        <Logo size="sm" />
        <div className="flex items-center gap-1.5">
          <Link to="/search" aria-label="Buscar artistas">
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
              <Search className="w-4 h-4" />
            </Button>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5" aria-label="Filtros">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilters > 0 && (
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div>
                  <Label className="text-xs font-semibold">Disciplinas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DISCIPLINES.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDiscipline(d.value)}
                        aria-pressed={filters.disciplines.includes(d.value)}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                          filters.disciplines.includes(d.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border/60 hover:bg-accent"
                        )}
                      >
                        {d.emoji} {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="city-filter" className="text-xs font-semibold">Ciudad</Label>
                  <Input
                    id="city-filter"
                    value={filters.city}
                    onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Ej. Madrid"
                    className="mt-2 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="verified-filter" className="text-xs font-semibold">Solo verificados</Label>
                  <Switch
                    id="verified-filter"
                    checked={filters.verifiedOnly}
                    onCheckedChange={(v) => setFilters((f) => ({ ...f, verifiedOnly: v }))}
                  />
                </div>
                {me?.discipline && (
                  <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                    <div>
                      <Label htmlFor="seeking-filter" className="text-xs font-semibold">
                        Buscan mi disciplina ({disciplineLabel(me.discipline)})
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Perfiles que buscan colaborar con {disciplineLabel(me.discipline).toLowerCase()}s
                      </p>
                    </div>
                    <Switch
                      id="seeking-filter"
                      checked={filters.seekingMeOnly}
                      onCheckedChange={(v) => setFilters((f) => ({ ...f, seekingMeOnly: v }))}
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => setFilters({ disciplines: [], city: "", verifiedOnly: false, seekingMeOnly: false })}
                >
                  Limpiar filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-xs font-semibold text-muted-foreground bg-card/60 px-3 py-1.5 rounded-full border border-border/40">
            {activeCards.length}
          </span>
        </div>
      </header>

      {/* Mode Switcher: Creadores vs Proyectos & Squads */}
      <div className="flex items-center justify-center p-1 bg-muted/60 border border-border/40 rounded-full max-w-xs mx-auto mb-2 shadow-xs">
        <button
          type="button"
          onClick={() => setDiscoverMode("artists")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            discoverMode === "artists"
              ? "bg-amber-400 text-slate-950 shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>🐝 Creadores</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/15 text-slate-950 font-black">
            {activeCards.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDiscoverMode("squads")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            discoverMode === "squads"
              ? "bg-amber-400 text-slate-950 shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Squads</span>
          {activeSquadCards.length > 0 && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                discoverMode === "squads"
                  ? "bg-white/20 text-white font-black"
                  : "bg-primary/20 text-primary"
              )}
            >
              {activeSquadCards.length}
            </span>
          )}
        </button>
      </div>

      <div className="relative h-[calc(100vh-240px)] flex items-center justify-center">
        {discoverMode === "artists" ? (
          isLoading ? (
            <SwipeSkeleton />
          ) : activeCards.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Por ahora todo visto"
              description={
                activeFilters > 0
                  ? "Prueba a quitar algunos filtros para ver más artistas."
                  : "Vuelve pronto. Más artistas se unen cada día."
              }
              actionLabel={activeFilters > 0 ? undefined : "Explorar el feed"}
              actionTo={activeFilters > 0 ? undefined : "/feed"}
            />
          ) : (
            <AnimatePresence>
              {activeCards.slice(0, 3).reverse().map((p, idx, arr) => {
                const isTop = idx === arr.length - 1;
                return (
                  <PanalMatchCard
                    key={p.id}
                    profile={p}
                    me={me}
                    isTop={isTop}
                    stackIndex={arr.length - 1 - idx}
                    onSwipe={(dir) => handleSwipe(p.id, dir)}
                  />
                );
              })}
            </AnimatePresence>
          )
        ) : squadsLoading ? (
          <SwipeSkeleton />
        ) : activeSquadCards.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="No hay squads activos por ahora"
            description="Cuando dos o más colaboradores publiquen una convocatoria buscando nuevos talentos para su proyecto, aparecerán aquí. ¡Tú también puedes armar un squad desde cualquier chat!"
            actionLabel="Ver mis chats"
            actionTo="/matches"
          />
        ) : (
          <AnimatePresence>
            {activeSquadCards.slice(0, 3).reverse().map((s, idx, arr) => {
              const isTop = idx === arr.length - 1;
              return (
                <SquadSwipeCard
                  key={s.id}
                  squad={s}
                  me={me}
                  isTop={isTop}
                  stackIndex={arr.length - 1 - idx}
                  onSwipe={(dir) => handleSquadSwipe(s, dir)}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="flex justify-center items-center gap-5 mt-4">
        <Button
          size="icon"
          variant="ghost"
          disabled={!lastSwipeId || undoSwipe.isPending}
          onClick={() => undoSwipe.mutate()}
          aria-label="Deshacer último swipe"
          className="w-11 h-11 rounded-full border border-border/60 disabled:opacity-30"
        >
          <Undo2 className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={
            discoverMode === "artists"
              ? !activeCards.length || swipeMutation.isPending
              : !activeSquadCards.length || squadSwipeMutation.isPending
          }
          onClick={() => {
            if (discoverMode === "artists") {
              if (activeCards[0]) handleSwipe(activeCards[0].id, "pass");
            } else {
              if (activeSquadCards[0]) handleSquadSwipe(activeSquadCards[0], "pass");
            }
          }}
          aria-label="Pasar"
          className="w-16 h-16 rounded-full border-2 border-destructive/40 hover:bg-destructive/10 hover:scale-110 transition-all shadow-lg"
        >
          <X className="!w-7 !h-7 text-destructive" />
        </Button>
        <Button
          size="icon"
          disabled={
            discoverMode === "artists"
              ? !activeCards.length || swipeMutation.isPending
              : !activeSquadCards.length || squadSwipeMutation.isPending
          }
          onClick={() => {
            if (discoverMode === "artists") {
              if (activeCards[0]) handleSwipe(activeCards[0].id, "like");
            } else {
              if (activeSquadCards[0]) handleSquadSwipe(activeSquadCards[0], "like");
            }
          }}
          aria-label="Polinizar / Me gusta"
          className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:scale-110 transition-all shadow-xl shadow-amber-500/40"
        >
          <Heart className="!w-7 !h-7 fill-current" />
        </Button>
      </div>

      <MatchDialog match={matchOpen} me={me} onClose={() => setMatchOpen(null)} />
      <MultiMatchDialog data={multiMatchOpen} me={me} onClose={() => setMultiMatchOpen(null)} />
    </div>
  );
};

const SwipeCard = ({
  profile,
  me,
  isTop,
  stackIndex,
  onSwipe,
}: {
  profile: Profile;
  me: Profile | null | undefined;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "like" | "pass") => void;
}) => {
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOp = useTransform(x, [0, 80], [0, 1]);
  const passOp = useTransform(x, [-80, 0], [1, 0]);

  const compat = calculateCompatibility(me, profile);

  const handleDragEnd = (_: any, info: any) => {
    if (swiped || !isTop) return;
    if (info.offset.x > 80 || info.velocity.x > 350) {
      setSwiped(true);
      onSwipe("like");
    } else if (info.offset.x < -80 || info.velocity.x < -350) {
      setSwiped(true);
      onSwipe("pass");
    }
  };

  return (
    <motion.div
      drag={isTop && !swiped ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate, zIndex: 10 - stackIndex }}
      animate={{ scale: 1 - stackIndex * 0.04, y: stackIndex * 8 }}
      onDragEnd={handleDragEnd}
      exit={{ x: x.get() >= 0 ? 600 : -600, opacity: 0, transition: { duration: 0.25 } }}
      className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-card cursor-grab active:cursor-grabbing select-none touch-none"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={`Foto de ${profile.display_name ?? "artista"}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">{disciplineEmoji(profile.discipline)}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      {/* Floating Compatibility Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div
          className={cn(
            "px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-lg border flex items-center gap-1.5 transition-transform",
            compat.isHighAffinity
              ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-primary/40 animate-pulse"
              : "bg-black/60 text-white border-white/20"
          )}
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>{compat.badgeLabel}</span>
        </div>
      </div>

      <motion.div style={{ opacity: likeOp }} className="absolute top-8 right-6 px-4 py-2 border-4 border-primary text-primary text-2xl font-black rounded-xl rotate-12 bg-background/80 z-30">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: passOp }} className="absolute top-8 left-6 px-4 py-2 border-4 border-destructive text-destructive text-2xl font-black rounded-xl -rotate-12 bg-background/80 z-30">
        PASS
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-20">
        {/* Compatibility Reason Highlight */}
        {compat.reasons.length > 0 && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-primary/30 backdrop-blur-md border border-primary/40 px-2.5 py-0.5 rounded-full text-white mb-2 shadow-xs">
            <Zap className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="truncate max-w-[280px]">{compat.reasons[0]}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-1 text-xs font-semibold">
          <span className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
            {disciplineEmoji(profile.discipline)} {disciplineLabel(profile.discipline)}
          </span>
          {(profile.city || profile.country) && (
            <span className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black flex items-center gap-1.5">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge size={18} />}
        </h3>
        {profile.bio && <p className="text-sm opacity-90 line-clamp-2 mt-1">{profile.bio}</p>}
        {profile.genres && profile.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.genres.slice(0, 4).map((g) => (
              <span key={g} className="text-[10px] font-medium bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">{g}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MatchDialog = ({
  match,
  me,
  onClose,
}: {
  match: Profile | null;
  me: Profile | null | undefined;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const [openingChat, setOpeningChat] = useState(false);

  const compat = match ? calculateCompatibility(me, match) : null;

  const handleGoToChat = async () => {
    if (!match || !me) return;
    setOpeningChat(true);
    try {
      // Find conversation for this match
      const [uA, uB] = me.id < match.id ? [me.id, match.id] : [match.id, me.id];
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_a", uA)
        .eq("user_b", uB)
        .maybeSingle();

      if (conv?.id) {
        onClose();
        navigate(`/chat/${conv.id}`);
      } else {
        onClose();
        navigate(`/matches`);
      }
    } catch {
      onClose();
      navigate(`/matches`);
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="text-center max-w-sm w-full bg-card/95 border border-border/40 p-6 rounded-3xl shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-5xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              ¡MATCH!
            </div>

            {/* Compatibility percentage pill */}
            {compat && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{compat.score}% de Compatibilidad</span>
              </div>
            )}

            <div>
              <p className="text-foreground text-lg font-bold">
                Conectaste con {match.display_name}
              </p>
              {compat?.highlight && (
                <p className="text-xs text-muted-foreground mt-1">
                  {compat.highlight}
                </p>
              )}
            </div>

            {/* Compatibility Reasons */}
            {compat?.reasons && compat.reasons.length > 0 && (
              <div className="bg-muted/50 rounded-2xl p-3 text-left space-y-1.5 border border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Por qué coinciden:
                </p>
                {compat.reasons.slice(0, 2).map((r, i) => (
                  <div key={i} className="text-xs text-foreground flex items-center gap-1.5">
                    <span className="text-primary text-xs">•</span>
                    <span className="truncate">{r}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={handleGoToChat}
                disabled={openingChat}
                className="w-full rounded-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-bold shadow-lg shadow-primary/25"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar Mensaje Ahora
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full rounded-full text-xs text-muted-foreground"
              >
                Seguir descubriendo
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SquadSwipeCard = ({
  squad,
  me,
  isTop,
  stackIndex,
  onSwipe,
}: {
  squad: SquadCardData;
  me: Profile | null | undefined;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "like" | "pass") => void;
}) => {
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOp = useTransform(x, [0, 80], [0, 1]);
  const passOp = useTransform(x, [-80, 0], [1, 0]);

  const targetDisc = DISCIPLINES.find((d) => d.value === squad.target_discipline);
  const isExactMatch = !!me?.discipline && me.discipline === squad.target_discipline;

  // Build full team list: owner + unique participants
  const allTeam = [
    { ...squad.owner, isOwner: true },
    ...squad.participants
      .filter((p) => p.user_id !== squad.owner_id && p.profile)
      .map((p) => ({ ...(p.profile as Profile), isOwner: false })),
  ];

  const handleDragEnd = (_: any, info: any) => {
    if (swiped || !isTop) return;
    if (info.offset.x > 80 || info.velocity.x > 350) {
      setSwiped(true);
      onSwipe("like");
    } else if (info.offset.x < -80 || info.velocity.x < -350) {
      setSwiped(true);
      onSwipe("pass");
    }
  };

  const demoLink = squad.spotify_url || squad.soundcloud_url || squad.youtube_url;

  return (
    <motion.div
      drag={isTop && !swiped ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate, zIndex: 10 - stackIndex }}
      animate={{ scale: 1 - stackIndex * 0.04, y: stackIndex * 8 }}
      onDragEnd={handleDragEnd}
      exit={{ x: x.get() >= 0 ? 600 : -600, opacity: 0, transition: { duration: 0.25 } }}
      className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-card via-card to-background border border-border/50 cursor-grab active:cursor-grabbing select-none touch-none flex flex-col justify-between p-5"
    >
      <motion.div style={{ opacity: likeOp }} className="absolute top-8 right-6 px-4 py-2 border-4 border-primary text-primary text-2xl font-black rounded-xl rotate-12 bg-background/90 z-30 shadow-xl">
        CONECTAR
      </motion.div>
      <motion.div style={{ opacity: passOp }} className="absolute top-8 left-6 px-4 py-2 border-4 border-destructive text-destructive text-2xl font-black rounded-xl -rotate-12 bg-background/90 z-30 shadow-xl">
        PASAR
      </motion.div>

      {/* Top Bar: Squad Banner & Exact Match */}
      <div className="space-y-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
            <Rocket className="w-3.5 h-3.5" />
            <span>SQUAD DE PROYECTO</span>
          </div>
          {isExactMatch && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold animate-pulse">
              <Zap className="w-3 h-3 fill-current" />
              <span>¡Buscan tu rol!</span>
            </div>
          )}
        </div>

        {/* Team Avatars & Roles */}
        <div className="bg-muted/40 border border-border/40 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
          <div className="flex -space-x-3 overflow-hidden shrink-0">
            {allTeam.slice(0, 3).map((member, idx) => (
              <Avatar key={member.id || idx} className="w-11 h-11 border-2 border-background shadow-md">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                  {member.display_name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-foreground truncate">
              {allTeam.map((m) => m.display_name).filter(Boolean).join(" & ")}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {allTeam.map((m, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/80 text-muted-foreground border border-border/30 truncate"
                >
                  {disciplineEmoji(m.discipline)} {disciplineLabel(m.discipline)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Target Role Spotlight */}
      <div className="my-auto py-2 space-y-2 z-10">
        <div className="rounded-2xl p-3.5 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 border border-primary/35 shadow-sm text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Buscando para el equipo:
          </p>
          <div className="text-base sm:text-lg font-black text-primary flex items-center justify-center gap-2">
            <span>{targetDisc?.emoji || "✨"}</span>
            <span className="truncate">{targetDisc?.label || squad.target_discipline}</span>
          </div>
        </div>

        <div className="space-y-1 text-left px-1">
          <h3 className="text-xl font-black text-foreground line-clamp-2">
            {squad.title}
          </h3>
          {squad.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {squad.description}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Metadata & Actions */}
      <div className="space-y-2 z-10 pt-2 border-t border-border/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {squad.location && (
            <span className="inline-flex items-center gap-1 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {squad.location}
            </span>
          )}
          {demoLink && (
            <a
              href={demoLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
            >
              <Music className="w-3.5 h-3.5" /> Escuchar demo
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MultiMatchDialog = ({
  data,
  me,
  onClose,
}: {
  data: { squad: SquadCardData; conversationId: string } | null;
  me: Profile | null | undefined;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  if (!data) return null;
  const { squad, conversationId } = data;

  const targetDisc = DISCIPLINES.find((d) => d.value === squad.target_discipline);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="text-center max-w-sm w-full bg-card/95 border border-border/40 p-6 rounded-3xl shadow-2xl space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center mx-auto animate-bounce shadow-lg shadow-primary/20">
            <Rocket className="w-7 h-7" />
          </div>

          <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            ¡MULTI-MATCH!
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
            <span>Te has unido al Squad 🚀</span>
          </div>

          <div>
            <p className="text-foreground text-base font-bold line-clamp-2">
              {squad.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Conectaste como <span className="text-foreground font-semibold">{targetDisc?.label || "Colaborador"}</span> con {squad.owner.display_name} y su equipo.
            </p>
          </div>

          {/* Combined Team Avatar Stack */}
          <div className="flex justify-center -space-x-3 py-1">
            <Avatar className="w-12 h-12 border-2 border-background shadow-md">
              <AvatarImage src={squad.owner.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                {squad.owner.display_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            {squad.participants.slice(0, 2).map((p, i) => (
              <Avatar key={p.user_id || i} className="w-12 h-12 border-2 border-background shadow-md">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-secondary/20 text-secondary font-bold text-xs">
                  {p.profile?.display_name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            <Avatar className="w-12 h-12 border-2 border-primary ring-2 ring-primary/40 shadow-md">
              <AvatarImage src={me?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                Tú
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                onClose();
                navigate(`/chat/${conversationId}`);
              }}
              className="w-full rounded-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-bold shadow-lg shadow-primary/25 h-11"
            >
              <MessageCircle className="w-4 h-4" />
              Ir al Chat del Squad
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full rounded-full text-xs text-muted-foreground"
            >
              Seguir explorando
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Discover;
