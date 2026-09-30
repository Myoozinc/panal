import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, ExternalLink, Users, Sparkles, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { DISCIPLINES, EXPERIENCE_LEVELS } from "@/lib/constants";
import type { Profile, CollaborationWithDetails } from "@/types/panal";
import { CollabCard } from "@/pages/Feed";
import VerifiedBadge from "@/components/VerifiedBadge";
import ProfileActions from "@/components/ProfileActions";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { calculateCompatibility } from "@/lib/compatibility";

const ProfilePage = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { data: me } = useProfile();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    enabled: !!username,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: collabs = [] } = useQuery({
    queryKey: ["profile-collabs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<CollaborationWithDetails[]> => {
      const { data: ownIds } = await supabase
        .from("collaboration_participants")
        .select("collab_id")
        .eq("user_id", profile!.id);
      const ids = [
        ...(ownIds?.map((p) => p.collab_id) ?? []),
      ];
      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          *,
          owner:profiles!collaborations_owner_id_fkey(id, display_name, username, avatar_url),
          participants:collaboration_participants(
            user:profiles!collaboration_participants_user_id_fkey(id, display_name, username, avatar_url)
          )
        `)
        .or(`owner_id.eq.${profile!.id}${ids.length ? `,id.in.(${ids.join(",")})` : ""}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        participants: (c.participants ?? []).map((p: any) => p.user).filter(Boolean),
      })) as CollaborationWithDetails[];
    },
  });

  const isOwner = !!user && !!profile && user.id === profile.id;

  const { data: matchProfiles = [] } = useQuery({
    queryKey: ["profile-matches", profile?.id],
    enabled: !!profile?.id && isOwner,
    queryFn: async (): Promise<Profile[]> => {
      const { data: matches, error } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .or(`user_a.eq.${profile!.id},user_b.eq.${profile!.id}`);
      if (error) throw error;
      if (!matches?.length) return [];
      const otherIds = matches.map((m: any) => (m.user_a === profile!.id ? m.user_b : m.user_a));
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds);
      if (pErr) throw pErr;
      return (profiles ?? []) as Profile[];
    },
  });

  const { data: matchCount = 0 } = useQuery({
    queryKey: ["profile-match-count", profile?.id],
    enabled: !!profile?.id && !isOwner,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("get_user_match_count", { _user_id: profile!.id });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="text-center py-20"><p>Perfil no encontrado.</p></div>;

  const disc = DISCIPLINES.find((d) => d.value === profile.discipline);
  const extraDiscs = DISCIPLINES.filter(
    (d) =>
      d.value !== profile.discipline &&
      profile.skills?.some(
        (s) => s.toLowerCase() === d.label.toLowerCase() || s.toLowerCase() === d.value.toLowerCase()
      )
  );
  const allUserDisciplines = [disc, ...extraDiscs].filter(Boolean) as (typeof DISCIPLINES)[number][];
  const lvl = EXPERIENCE_LEVELS.find((l) => l.value === profile.experience_level);
  const links = [
    { url: profile.spotify_url, label: "Spotify" },
    { url: profile.youtube_url, label: "YouTube" },
    { url: profile.instagram_url, label: "Instagram" },
    { url: profile.soundcloud_url, label: "SoundCloud" },
    { url: profile.website_url, label: "Web" },
  ].filter((l) => l.url);

  return (
    <div className="pb-4">
      <div className="relative h-48 bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30">
        <div className="absolute -bottom-12 left-4">
          <div className="w-24 h-24 rounded-full bg-card border-4 border-card overflow-hidden shadow-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-3xl">{disc?.emoji}</div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-14">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black flex items-center gap-2">
              <span className="truncate">{profile.display_name}</span>
              {profile.is_verified && <VerifiedBadge size={22} />}
            </h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          <ProfileActions targetUserId={profile.id} targetDisplayName={profile.display_name ?? "este artista"} />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {allUserDisciplines.map((d) => (
            <span key={d.value} className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              {d.emoji} {d.label}
            </span>
          ))}
          {lvl && <span className="text-xs font-semibold bg-secondary/10 text-secondary px-3 py-1.5 rounded-full">{lvl.label}</span>}
          {(profile.city || profile.country) && (
            <span className="text-xs font-semibold bg-muted px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />{[profile.city, profile.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>

        {!isOwner && (
          (() => {
            const compat = calculateCompatibility(me, profile);
            return (
              <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-primary/20 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{compat.badgeLabel} contigo</span>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {compat.score}% de afinidad
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{compat.highlight}</p>
                {compat.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {compat.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium bg-background/80 border border-border/50 text-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-current" /> {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        )}

        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}

        {profile.genres && profile.genres.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Géneros</h4>
            <div className="flex flex-wrap gap-1.5">
              {profile.genres.map((g) => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted">{g}</span>)}
            </div>
          </div>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills
                .filter((g) => !extraDiscs.some((ed) => ed.label.toLowerCase() === g.toLowerCase() || ed.value.toLowerCase() === g.toLowerCase()))
                .map((g) => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted">{g}</span>)}
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20">
                {l.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-xl font-black mb-3">Colaboraciones</h3>
          {collabs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no ha publicado colaboraciones.</p>
          ) : (
            <div className="space-y-4">{collabs.map((c) => <CollabCard key={c.id} collab={c} />)}</div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-black mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Matches
            <span className="text-sm font-bold text-muted-foreground">
              ({isOwner ? matchProfiles.length : matchCount})
            </span>
          </h3>
          {isOwner ? (
            matchProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no tienes matches.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {matchProfiles.map((m) => {
                  const mDisc = DISCIPLINES.find((d) => d.value === m.discipline);
                  return (
                    <Link
                      key={m.id}
                      to={`/profile/${m.username}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/40 hover:bg-accent/40 transition-colors"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={m.avatar_url ?? undefined} />
                        <AvatarFallback>{m.display_name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate flex items-center gap-1">
                          {m.display_name}
                          {m.is_verified && <VerifiedBadge size={12} />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {mDisc?.emoji} {mDisc?.label ?? m.discipline}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {matchCount === 0
                ? "Aún no tiene matches."
                : `${matchCount} ${matchCount === 1 ? "match" : "matches"} en la comunidad.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
