import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  Sparkles,
  Zap,
  MapPin,
  TrendingUp,
  Globe,
  Share2,
  ExternalLink,
  Users,
  CheckCircle2,
  Briefcase,
  Layers,
  ArrowRight,
  Eye,
  Instagram,
  Youtube,
  Twitch,
  Linkedin,
} from "lucide-react";
import type { Profile } from "@/types/independent";
import { DISCIPLINES } from "@/lib/constants";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

// Custom authentic TikTok Icon
export const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V9.4a6.33 6.33 0 0 0-.86-.06A6.34 6.34 0 0 0 3.1 15.68a6.34 6.34 0 0 0 10.82 4.48c1.37-1.37 1.95-3.05 1.95-5.01V8.07a8.27 8.27 0 0 0 4.72 1.48V6.1c-.34 0-.68-.04-1-.13v.72z" />
  </svg>
);

// Custom authentic X (Twitter) Icon
export const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface PanalMatchCardProps {
  profile: Profile;
  me: Profile | null | undefined;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "like" | "pass") => void;
}

export const PanalMatchCard = ({
  profile,
  me,
  isTop,
  stackIndex,
  onSwipe,
}: PanalMatchCardProps) => {
  const [swiped, setSwiped] = useState(false);
  const [activeTab, setActiveTab] = useState<"bento" | "visual">("bento");

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const likeOp = useTransform(x, [0, 80], [0, 1]);
  const passOp = useTransform(x, [-80, 0], [1, 0]);

  const discObj = DISCIPLINES.find((d) => d.value === profile.discipline);
  const discLabel = discObj?.label ?? "Creador";
  const discEmoji = discObj?.emoji ?? "🐝";

  // Mock social accounts stats if not set, for a rich visual experience
  const rawIg = profile.instagram_url?.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const rawTt = profile.tiktok_url?.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "").replace(/\/$/, "");
  const rawYt = profile.youtube_url?.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/\/$/, "");
  const rawTwitch = profile.twitch_url?.replace(/^https?:\/\/(www\.)?twitch\.tv\//, "").replace(/\/$/, "");

  const hasInstagram = !!profile.instagram_url || !!rawIg;
  const hasTikTok = !!profile.tiktok_url || !!rawTt;
  const hasYouTube = !!profile.youtube_url || !!rawYt;
  const hasTwitch = !!profile.twitch_url || !!rawTwitch;
  const hasX = !!profile.x_url;
  const hasLinkedIn = !!profile.linkedin_url;
  const hasWeb = !!profile.website_url;

  const igHandle = rawIg || (profile.username ? `@${profile.username}` : "@creador");
  const ttHandle = rawTt || (profile.username ? `@${profile.username}` : "@creador");

  // Fallback potential values based on skills/genres
  const offerings = profile.collab_offerings?.length
    ? profile.collab_offerings
    : profile.skills?.slice(0, 3) || ["Audiencia y Alcance", "Contenido Viral", "Co-branding"];

  const seeking = profile.collab_seeking?.length
    ? profile.collab_seeking
    : profile.genres?.slice(0, 2) || ["Cross-Promo", "Lanzamientos Compartidos"];

  const totalReach =
    profile.social_stats?.total_reach ||
    (hasInstagram && hasTikTok ? "+180K Alcance" : hasInstagram ? "+65K Alcance" : "+30K Alcance");

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
      className="absolute w-full max-w-sm h-[580px] rounded-3xl overflow-hidden shadow-2xl bg-card border border-amber-500/20 cursor-grab active:cursor-grabbing select-none touch-none flex flex-col justify-between"
    >
      {/* Background Honeycomb Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-background/90 to-background pointer-events-none" />

      {/* Swipe Overlay Badges */}
      <motion.div
        style={{ opacity: likeOp }}
        className="absolute top-6 right-6 px-4 py-1.5 border-4 border-amber-400 text-amber-400 text-2xl font-black rounded-2xl rotate-12 bg-black/80 z-40 backdrop-blur-md shadow-xl"
      >
        POLINIZAR 🐝
      </motion.div>
      <motion.div
        style={{ opacity: passOp }}
        className="absolute top-6 left-6 px-4 py-1.5 border-4 border-destructive text-destructive text-2xl font-black rounded-2xl -rotate-12 bg-black/80 z-40 backdrop-blur-md shadow-xl"
      >
        PASAR ✕
      </motion.div>

      {/* Top Header Card Bar */}
      <div className="relative z-20 p-3.5 pb-2 border-b border-border/50 bg-background/70 backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Creador"}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400/80 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                {discEmoji}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-xs">
              ⚡
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base tracking-tight truncate text-foreground">
                {profile.display_name}
              </h3>
              {profile.is_verified && <VerifiedBadge size={15} />}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <span>{discEmoji}</span>
              <span className="font-medium truncate">{discLabel}</span>
              {(profile.city || profile.country) && (
                <>
                  <span>•</span>
                  <span className="truncate">{profile.city || profile.country}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Bento vs Full Visual */}
        <div className="flex items-center bg-muted/70 p-1 rounded-xl shrink-0 border border-border/40">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("bento");
            }}
            className={cn(
              "px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
              activeTab === "bento"
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3 h-3" />
            <span>Bento</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("visual");
            }}
            className={cn(
              "px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
              activeTab === "visual"
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="w-3 h-3" />
            <span>Foto</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2.5 scrollbar-none">
        {activeTab === "visual" ? (
          /* Visual Photo View */
          <div className="relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-border/60 bg-muted">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Creador"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <span className="text-6xl mb-2">{discEmoji}</span>
                <p className="text-sm font-semibold">{profile.display_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{profile.bio}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 inline-block mb-1.5 shadow-sm">
                {totalReach}
              </span>
              <p className="text-xs opacity-90 line-clamp-3">{profile.bio || "Creador en el Panal listo para colaborar y potenciar alcance."}</p>
            </div>
          </div>
        ) : (
          /* THE FLAGSHIP FEATURE: Social Bento Recap Matrix */
          <>
            {/* Global Reach & Pitch Banner */}
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Potencial de Alcance
                  </div>
                  <div className="text-xs font-extrabold text-foreground">{totalReach}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/80 border border-amber-500/40 text-amber-500 shrink-0">
                Sinergia Alta 🐝
              </span>
            </div>

            {/* Social Bento Widgets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Instagram Bento Tile */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/25 flex flex-col justify-between hover:border-pink-500/50 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center">
                    <Instagram className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Reels & Post</span>
                </div>
                <div>
                  <div className="text-xs font-black truncate text-foreground">{igHandle}</div>
                  <div className="text-[11px] font-extrabold text-pink-500 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>{profile.social_stats?.instagram_followers || "78.4K seg."}</span>
                  </div>
                </div>
              </div>

              {/* TikTok Bento Tile */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-black/10 to-transparent border border-cyan-500/25 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-6 h-6 rounded-lg bg-black text-white border border-white/20 flex items-center justify-center">
                    <TikTokIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Viral Video</span>
                </div>
                <div>
                  <div className="text-xs font-black truncate text-foreground">{ttHandle}</div>
                  <div className="text-[11px] font-extrabold text-cyan-500 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>{profile.social_stats?.tiktok_followers || "142K seg."}</span>
                  </div>
                </div>
              </div>

              {/* YouTube / Twitch / Media Bento Tile */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/25 flex flex-col justify-between hover:border-red-500/50 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center">
                    <Youtube className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Long-form</span>
                </div>
                <div>
                  <div className="text-xs font-black truncate text-foreground">
                    {profile.youtube_url ? "Canal Oficial" : "YouTube Hub"}
                  </div>
                  <div className="text-[11px] font-extrabold text-red-500 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{profile.social_stats?.youtube_subs || "25.6K subs"}</span>
                  </div>
                </div>
              </div>

              {/* Professional Network / LinkedIn / X / Web */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex flex-col justify-between hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <XIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Networking</span>
                </div>
                <div>
                  <div className="text-xs font-black truncate text-foreground">
                    {profile.x_url ? "@x_account" : "Autoridad & PR"}
                  </div>
                  <div className="text-[11px] font-extrabold text-amber-500 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Activo diario</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaboration Potential Matrix ("Qué Aporta / Qué Busca") */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-amber-500" />
                  <span>Lo que aporta al Panal</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {offerings.map((off, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background border border-amber-500/30 text-foreground flex items-center gap-1"
                    >
                      <span className="text-amber-500">✓</span> {off}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Busca co-crear / explotar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seeking.map((sek, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-500"
                    >
                      🤝 {sek}
                    </span>
                  ))}
                </div>
              </div>

              {profile.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/40 italic">
                  "{profile.bio}"
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Sticky Collaboration Bar */}
      <div className="relative z-20 px-4 py-2.5 bg-background/80 backdrop-blur-md border-t border-border/50 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
          <span>Desliza derecha para</span>
          <span className="text-amber-500 font-extrabold">Polinizar</span>
        </span>
        <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-500 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
          <span>🐝 Match Directo</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PanalMatchCard;
