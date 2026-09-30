import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  ExternalLink,
  MessageSquare,
  Flag,
  Users,
  Mail,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { AdminSendEmailModal } from "@/components/admin/AdminSendEmailModal";
import { AdminOfficialChatModal } from "@/components/admin/AdminOfficialChatModal";
import { useToast } from "@/hooks/use-toast";
import { DISCIPLINES } from "@/lib/constants";
import type { Profile, Conversation } from "@/types/panal";

const AdminUserDetail = () => {
  const { userId } = useParams();
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showOfficialChat, setShowOfficialChat] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  // Query registered email for this user
  const { data: userEmail } = useQuery({
    queryKey: ["admin-user-email", userId],
    enabled: !!userId,
    queryFn: async (): Promise<string | null> => {
      // 1. Try RPC get_admin_user_email
      try {
        const { data, error } = await (supabase.rpc as any)("get_admin_user_email", { p_user_id: userId! });
        if (!error && data) return data as string;
      } catch {
        // Fallback
      }

      // 2. Try get_admin_users to find this user's email
      try {
        const { data: adminList } = await (supabase.rpc as any)("get_admin_users");
        if (adminList) {
          const match = adminList.find((u: any) => u.id === userId);
          if (match?.email) return match.email;
        }
      } catch {
        // Fallback
      }

      return null;
    },
  });

  const { data: convs = [] } = useQuery({
    queryKey: ["admin-user-convs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-user-reports", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("reported_user_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: matchProfiles = [] } = useQuery({
    queryKey: ["admin-user-matches", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile[]> => {
      const { data: matches, error } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
      if (error) throw error;
      if (!matches?.length) return [];
      const otherIds = matches.map((m: any) => (m.user_a === userId ? m.user_b : m.user_a));
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds);
      if (pErr) throw pErr;
      return (profiles ?? []) as Profile[];
    },
  });

  const handleCopyEmail = () => {
    if (!userEmail) {
      toast({ variant: "destructive", title: "Sin correo disponible" });
      return;
    }
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(true);
    toast({ title: "Correo copiado", description: userEmail });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  if (!profile)
    return <p className="text-center py-20 text-sm text-muted-foreground">Usuario no encontrado.</p>;

  const links = [
    { url: profile.spotify_url, label: "Spotify" },
    { url: profile.youtube_url, label: "YouTube" },
    { url: profile.instagram_url, label: "Instagram" },
    { url: profile.soundcloud_url, label: "SoundCloud" },
    { url: profile.website_url, label: "Web" },
  ].filter((l) => l.url);

  return (
    <div className="space-y-5">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a usuarios
      </Link>

      <div className="bg-card border border-border/40 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback>{profile.display_name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {profile.display_name}
              {profile.is_verified && <VerifiedBadge size={18} />}
            </h2>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>

            {/* Prominent Registered Email Badge */}
            <div className="flex items-center gap-2 mt-2 bg-muted/60 border border-border/60 px-3 py-1.5 rounded-xl w-fit">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-mono font-semibold text-foreground truncate">
                {userEmail ?? "Consultando correo..."}
              </span>
              {userEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1 hover:text-primary text-muted-foreground rounded transition-colors ml-1"
                  title="Copiar correo"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {(profile.city || profile.country) && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1.5">
                <MapPin className="w-3 h-3" />
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {/* Primary: Official Support In-App Chat */}
              <Button
                size="sm"
                onClick={() => setShowOfficialChat(true)}
                className="rounded-full gap-1.5 shadow-sm bg-primary hover:bg-primary/90"
              >
                <Shield className="w-3.5 h-3.5 fill-current" />
                Chat Oficial de la App
              </Button>

              {/* Secondary: Send Direct Email */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEmailModal(true)}
                disabled={!userEmail}
                className="rounded-full gap-1.5 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                Enviar Email
              </Button>

              <Link
                to={`/profile/${profile.username}`}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 border border-border/60 px-3 py-1.5 rounded-full"
              >
                Ver perfil público <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <Info label="Disciplina" value={profile.discipline ?? "—"} />
          <Info label="Nivel" value={profile.experience_level ?? "—"} />
          <Info label="Años activos" value={profile.years_active?.toString() ?? "—"} />
          <Info label="Onboarding" value={profile.onboarding_completed ? "Sí" : "No"} />
          <Info label="Correo de registro" value={userEmail ?? "—"} mono />
          <Info label="ID de Usuario" value={profile.id} mono />
          <Info label="Fecha de Registro" value={new Date(profile.created_at).toLocaleString()} />
        </dl>

        {profile.genres && profile.genres.length > 0 && <Chips title="Géneros" items={profile.genres} />}
        {profile.skills && profile.skills.length > 0 && <Chips title="Skills" items={profile.skills} />}

        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20"
              >
                {l.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      <section>
        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" /> Matches ({matchProfiles.length})
        </h3>
        {matchProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin matches.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {matchProfiles.map((m) => {
              const mDisc = DISCIPLINES.find((d) => d.value === m.discipline);
              return (
                <Link
                  key={m.id}
                  to={`/admin/users/${m.id}`}
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
                      {mDisc?.emoji} {mDisc?.label ?? m.discipline ?? "—"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Conversaciones ({convs.length})
        </h3>
        {convs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin conversaciones.</p>
        ) : (
          <div className="bg-card border border-border/40 rounded-2xl divide-y divide-border/40">
            {convs.map((c) => {
              const otherId = c.user_a === userId ? c.user_b : c.user_a;
              return (
                <Link
                  key={c.id}
                  to={`/admin/conversations/${c.id}`}
                  className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors text-sm"
                >
                  <span className="font-mono text-xs truncate">con {otherId}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
          <Flag className="w-4 h-4" /> Reportes recibidos ({reports.length})
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reportes.</p>
        ) : (
          <ul className="bg-card border border-border/40 rounded-2xl divide-y divide-border/40">
            {reports.map((r: any) => (
              <li key={r.id} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">{r.reason}</span>
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                </div>
                {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modals */}
      <AdminSendEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        recipient={{
          name: profile.display_name || "Usuario",
          email: userEmail || "",
          username: profile.username || undefined,
        }}
      />

      <AdminOfficialChatModal
        open={showOfficialChat}
        onOpenChange={setShowOfficialChat}
        targetUser={{
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified,
        }}
      />
    </div>
  );
};

const Info = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={mono ? "font-mono text-[10px] truncate" : "font-medium truncate"}>{value}</dd>
  </div>
);

const Chips = ({ title, items }: { title: string; items: string[] }) => (
  <div className="mt-4">
    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{title}</h4>
    <div className="flex flex-wrap gap-1.5">
      {items.map((g) => (
        <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted">
          {g}
        </span>
      ))}
    </div>
  </div>
);

export default AdminUserDetail;
