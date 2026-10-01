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
import type { Profile } from "@/types/panal";
import { DISCIPLINES } from "@/lib/constants";
import VerifiedBadge from "@/components/VerifiedBadge";
import { calculateCompatibility } from "@/lib/compatibility";
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

  // Compatibility calculation
  const compat = calculateCompatibility(me, profile);

  // Social handles & formatting
  const rawIg = profile.instagram_url?.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const rawTt = profile.tiktok_url?.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "").replace(/\/$/, "");
  const rawYt = profile.youtube_url?.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/\/$/, "");

  const hasInstagram = !!profile.instagram_url || !!rawIg;
  const hasTikTok = !!profile.tiktok_url || !!rawTt;

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
      className="absolute w-full max-w-[430px] sm:max-w-[470px] h-[530px] sm:h-[570px] max-h-[calc(100dvh-230px)] rounded-[28px] overflow-hidden shadow-2xl bg-card/95 border border-amber-500/25 cursor-grab active:cursor-grabbing select-none touch-none flex flex-col justify-between backdrop-blur-md"
    >
      {/* Background Honeycomb Warm Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-background/90 to-background pointer-events-none" />

      {/* Swipe Overlay Badges */}
      <motion.div
        style={{ opacity: likeOp }}
        className="absolute top-6 right-6 px-4 py-1.5 border-4 border-amber-400 text-amber-400 text-2xl font-black rounded-2xl rotate-12 bg-black/85 z-40 backdrop-blur-md shadow-2xl"
      >
        POLINIZAR 🐝
      </motion.div>
      <motion.div
        style={{ opacity: passOp }}
        className="absolute top-6 left-6 px-4 py-1.5 border-4 border-destructive text-destructive text-2xl font-black rounded-2xl -rotate-12 bg-black/85 z-40 backdrop-blur-md shadow-2xl"
      >
        PASAR ✕
      </motion.div>

      {/* Top Header Card Bar */}
      <div className="relative z-20 px-3.5 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Creador"}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-amber-400/80 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                {discEmoji}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black shadow-xs">
              ⚡
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate text-foreground">
                {profile.display_name}
              </h3>
              {profile.is_verified && <VerifiedBadge size={15} />}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <span>{discEmoji}</span>
              <span className="font-semibold text-foreground/80 truncate">{discLabel}</span>
              {(profile.city || profile.country) && (
                <>
                  <span>•</span>
                  <span className="truncate">{profile.city || profile.country}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Bento vs Visual */}
        <div className="flex items-center bg-muted/70 p-1 rounded-xl shrink-0 border border-border/40">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("bento");
            }}
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
              activeTab === "bento"
                ? "bg-amber-400 text-slate-950 shadow-xs font-black"
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
              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
              activeTab === "visual"
                ? "bg-amber-400 text-slate-950 shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="w-3 h-3" />
            <span>Foto</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3.5 py-3 space-y-3 scrollbar-none">
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
                <p className="text-base font-bold">{profile.display_name}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">{profile.bio}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 inline-block mb-1.5 shadow-sm">
                {totalReach}
              </span>
              <p className="text-xs opacity-90 line-clamp-3 leading-relaxed">
                {profile.bio || "Creador en el Panal listo para colaborar y potenciar alcance."}
              </p>
            </div>
          </div>
        ) : (
          /* THE FLAGSHIP FEATURE: Social Bento Recap Matrix */
          <>
            {/* Global Reach & High Synergy Banner */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Alcance Multiplataforma
                  </div>
                  <div className="text-xs sm:text-sm font-black text-foreground tracking-tight">{totalReach}</div>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-background/80 border border-amber-500/40 text-amber-400 shrink-0 shadow-xs">
                {compat?.badgeLabel || "Sinergia Alta 🐝"}
              </span>
            </div>

            {/* Social Bento Widgets Grid (Spacious 2x2 Layout) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Instagram Bento Tile */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-card border border-pink-500/25 flex flex-col justify-between hover:border-pink-500/50 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Instagram className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-pink-400/90 uppercase tracking-wider">Reels & Post</span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate text-foreground">{igHandle}</div>
                  <div className="text-[11px] font-black text-pink-500 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>{profile.social_stats?.instagram_followers || "78.4K seg."}</span>
                  </div>
                </div>
              </div>

              {/* TikTok Bento Tile */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-card border border-cyan-500/25 flex flex-col justify-between hover:border-cyan-500/50 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-black text-white border border-cyan-500/30 flex items-center justify-center shadow-xs">
                    <TikTokIcon className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="text-[9px] font-bold text-cyan-400/90 uppercase tracking-wider">Viral Video</span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate text-foreground">{ttHandle}</div>
                  <div className="text-[11px] font-black text-cyan-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>{profile.social_stats?.tiktok_followers || "142K seg."}</span>
                  </div>
                </div>
              </div>

              {/* YouTube / Twitch Bento Tile */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-card border border-red-500/25 flex flex-col justify-between hover:border-red-500/50 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                    <Youtube className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-red-400/90 uppercase tracking-wider">Long-form</span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate text-foreground">
                    {profile.youtube_url ? "Canal Oficial" : "Video Hub"}
                  </div>
                  <div className="text-[11px] font-black text-red-500 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{profile.social_stats?.youtube_subs || "25.6K subs"}</span>
                  </div>
                </div>
              </div>

              {/* Professional Network / LinkedIn / X / Web */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-card border border-amber-500/25 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <XIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-500/90 uppercase tracking-wider">Networking</span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate text-foreground">
                    {profile.x_url ? "@x_account" : "Match Directo"}
                  </div>
                  <div className="text-[11px] font-black text-amber-500 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Activo en Panal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaboration Potential Matrix ("Qué Aporta / Qué Busca") */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 backdrop-blur-xs">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 text-amber-400" />
                  <span>Lo que aporta al Panal</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {offerings.map((off, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1 shadow-xs"
                    >
                      <span className="text-amber-400">✓</span> {off}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Busca co-crear / colaborar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seeking.map((sek, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1 shadow-xs"
                    >
                      <span>🤝</span> {sek}
                    </span>
                  ))}
                </div>
              </div>

              {profile.bio && (
                <p className="text-xs text-muted-foreground/90 line-clamp-2 pt-2 border-t border-border/40 italic leading-relaxed">
                  "{profile.bio}"
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Sleek Micro Collaboration Bar */}
      <div className="relative z-20 px-4 py-2 bg-background/85 backdrop-blur-md border-t border-border/40 flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <span>Desliza derecha para</span>
          <span className="text-amber-400 font-black">Polinizar 🐝</span>
        </span>
        <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
          <span>Match Directo</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PanalMatchCard;
