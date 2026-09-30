import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Upload, LogOut, ExternalLink, Save, Shield, ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  COMMON_GENRES,
  COMMON_SKILLS,
  DISCIPLINES,
  EXPERIENCE_LEVELS,
  zDiscipline,
  type Discipline,
  type ExperienceLevel,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const usernameRegex = /^[a-z0-9_]{3,20}$/;
const urlOrEmpty = z.string().trim().url().or(z.literal(""));

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
};

const schema = z.object({
  display_name: z.string().trim().min(2).max(60),
  username: z.string().trim().regex(usernameRegex),
  bio: z.string().trim().max(280),
  city: z.string().trim().max(60),
  country: z.string().trim().max(60),
  discipline: zDiscipline,
  genres: z.array(z.string()).min(1),
  skills: z.array(z.string()),
  experience_level: z.enum(["beginner", "intermediate", "pro"]),
  years_active: z.number().min(0).max(80).optional().nullable(),
  looking_for: z.array(zDiscipline).min(1),
  spotify_url: urlOrEmpty,
  youtube_url: urlOrEmpty,
  instagram_url: urlOrEmpty,
  soundcloud_url: urlOrEmpty,
  website_url: urlOrEmpty,
});

const MyProfile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingVerif, setRequestingVerif] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  useEffect(() => {
    if (profile && !form) {
      const matchedSkills = (profile.skills ?? [])
        .map((s) => DISCIPLINES.find((d) => d.label.toLowerCase() === s.toLowerCase() || d.value === s)?.value)
        .filter(Boolean) as Discipline[];
      const initialDisciplines = Array.from(new Set([profile.discipline, ...matchedSkills].filter(Boolean))) as Discipline[];

      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        city: profile.city ?? "",
        country: profile.country ?? "",
        discipline: profile.discipline ?? "musician",
        disciplines: initialDisciplines.length > 0 ? initialDisciplines : [profile.discipline ?? "musician"],
        genres: profile.genres ?? [],
        skills: profile.skills ?? [],
        experience_level: profile.experience_level ?? "beginner",
        years_active: profile.years_active,
        looking_for: profile.looking_for ?? [],
        spotify_url: profile.spotify_url ?? "",
        youtube_url: profile.youtube_url ?? "",
        instagram_url: profile.instagram_url ?? "",
        soundcloud_url: profile.soundcloud_url ?? "",
        website_url: profile.website_url ?? "",
        notification_prefs: profile.notification_prefs ?? {
          likes: true, matches: true, collab_tags: true, messages: true,
        },
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, form]);

  if (isLoading || !form || !profile) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleArr = (key: string, value: string) => {
    setForm((f: any) => {
      const arr: string[] = f[key] ?? [];
      return { ...f, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };
  const setPref = (k: string, v: boolean) =>
    setForm((f: any) => ({ ...f, notification_prefs: { ...f.notification_prefs, [k]: v } }));

  const onAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Imagen muy grande", description: "Máximo 25MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const uploadCroppedAvatar = async (croppedFile: File) => {
    setCropperOpen(false);
    setCropSrc(null);
    setUploading(true);
    try {
      let { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed?.user) throw new Error("Sesión no encontrada o expirada. Vuelve a iniciar sesión.");
        authUser = refreshed.user;
      }

      // 1. Client-side compression
      const compressed = await compressImage(croppedFile, { maxSize: 800, quality: 0.88 });
      const path = `${authUser.id}/avatar-${Date.now()}.jpg`;

      let finalUrl = "";
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (!uploadErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        finalUrl = `${data.publicUrl}?t=${Date.now()}`;
      } else {
        console.warn("Storage upload rejected, falling back to compressed data URL:", uploadErr);
        finalUrl = await fileToDataUrl(compressed);
      }

      setAvatarUrl(finalUrl);
      await supabase.from("profiles").update({ avatar_url: finalUrl }).eq("id", authUser.id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Foto de perfil actualizada con éxito" });
    } catch (err: any) {
      console.error("Error avatar:", err);
      try {
        const fallbackUrl = await fileToDataUrl(croppedFile);
        setAvatarUrl(fallbackUrl);
        if (user?.id) {
          await supabase.from("profiles").update({ avatar_url: fallbackUrl }).eq("id", user.id);
          qc.invalidateQueries({ queryKey: ["profile"] });
        }
        toast({ title: "Foto guardada con éxito" });
      } catch {
        toast({ variant: "destructive", title: "Error subiendo foto", description: err.message || "Intenta con otra imagen." });
      }
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;

    const selectedDisciplines = (form.disciplines && form.disciplines.length > 0)
      ? form.disciplines
      : (form.discipline ? [form.discipline] : []);
    const primaryDiscipline = selectedDisciplines[0] ?? form.discipline ?? "musician";

    const additionalLabels = selectedDisciplines
      .slice(1)
      .map((val: any) => DISCIPLINES.find((d) => d.value === val)?.label)
      .filter(Boolean) as string[];

    const allDisciplineLabels = DISCIPLINES.map((d) => d.label.toLowerCase());
    const baseSkills = (form.skills ?? []).filter((s: string) => !allDisciplineLabels.includes(s.toLowerCase()));
    const mergedSkills = Array.from(new Set([...additionalLabels, ...baseSkills]));

    const parsed = schema.safeParse({
      ...form,
      discipline: primaryDiscipline,
      skills: mergedSkills,
      years_active: form.years_active === "" || form.years_active == null ? null : Number(form.years_active),
    });
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Revisa el formulario", description: parsed.error.errors[0].message });
      return;
    }
    setSaving(true);
    try {
      if (parsed.data.username !== profile.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", parsed.data.username)
          .neq("id", user.id)
          .maybeSingle();
        if (existing) {
          toast({ variant: "destructive", title: "Username en uso", description: "Elige otro diferente" });
          setSaving(false);
          return;
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          ...parsed.data,
          avatar_url: avatarUrl,
          notification_prefs: form.notification_prefs,
        })
        .eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Perfil actualizado" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async () => {
    if (!user) return;
    setRequestingVerif(true);
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      status: "pending",
    });
    setRequestingVerif(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Solicitud enviada", description: "El equipo revisará tu perfil pronto." });
  };

  return (
    <div className="px-4 pt-6 pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            Mi perfil {profile.is_verified && <VerifiedBadge size={22} />}
          </h1>
          <p className="text-muted-foreground text-sm">Edita tu información pública</p>
        </div>
        {profile.username && (
          <Link to={`/profile/${profile.username}`}>
            <Button variant="outline" size="sm" className="rounded-full">
              Ver público <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-4 border-primary/20 shadow-lg shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
          )}
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*,.heic,.heif,.avif,.webp,.gif,.svg,.bmp,.tiff" className="hidden" onChange={onAvatarSelect} />
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </span>
        </label>
      </div>

      {/* Básicos */}
      <Section title="Información básica">
        <Field label="Nombre artístico">
          <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} className="rounded-xl" />
        </Field>
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => set("username", slugify(e.target.value))}
            className="rounded-xl font-mono text-sm"
          />
        </Field>
        <Field label="Bio">
          <Textarea value={form.bio} maxLength={280} onChange={(e) => set("bio", e.target.value)} className="rounded-xl" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="País">
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} className="rounded-xl" />
          </Field>
        </div>
      </Section>

      {/* Disciplina */}
      <Section title="Disciplinas (puedes elegir varias)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DISCIPLINES.map((d) => {
            const currentDisciplines = (form.disciplines && form.disciplines.length > 0)
              ? form.disciplines
              : (form.discipline ? [form.discipline] : []);
            const isSelected = currentDisciplines.includes(d.value);

            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? currentDisciplines.filter((x: any) => x !== d.value)
                    : [...currentDisciplines, d.value];
                  setForm((f: any) => ({
                    ...f,
                    disciplines: next,
                    discipline: next[0] ?? "other",
                  }));
                }}
                className={cn(
                  "relative rounded-xl p-3 border-2 text-center transition-all",
                  isSelected ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30" : "border-border/50 hover:border-primary/40"
                )}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground font-bold shadow">
                    ✓
                  </span>
                )}
                <div className="text-2xl">{d.emoji}</div>
                <div className="text-xs font-semibold mt-1">{d.label}</div>
              </button>
            );
          })}
        </div>
        <Field label="Nivel">
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => set("experience_level", l.value as ExperienceLevel)}
                className={cn(
                  "h-10 rounded-xl text-sm font-medium border-2 transition-all",
                  form.experience_level === l.value ? "border-primary bg-primary/10" : "border-border/50"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Años activo">
          <Input type="number" min={0} max={80} value={form.years_active ?? ""} onChange={(e) => set("years_active", e.target.value ? Number(e.target.value) : null)} className="rounded-xl" />
        </Field>
      </Section>

      {/* Géneros / Skills */}
      <Section title="Géneros">
        <div className="flex flex-wrap gap-2">
          {COMMON_GENRES.map((g) => (
            <Chip key={g} active={form.genres.includes(g)} onClick={() => toggleArr("genres", g)}>{g}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-2">
          {COMMON_SKILLS.map((s) => (
            <Chip key={s} active={form.skills.includes(s)} onClick={() => toggleArr("skills", s)} variant="secondary">{s}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Busco colaborar con">
        <div className="grid grid-cols-3 gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleArr("looking_for", d.value as Discipline)}
              className={cn(
                "rounded-xl p-3 border-2 text-center transition-all",
                form.looking_for.includes(d.value) ? "border-primary bg-primary/10" : "border-border/50"
              )}
            >
              <div className="text-2xl">{d.emoji}</div>
              <div className="text-xs font-semibold mt-1">{d.label}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Enlaces">
        {[
          ["spotify_url", "Spotify"],
          ["youtube_url", "YouTube"],
          ["instagram_url", "Instagram"],
          ["soundcloud_url", "SoundCloud"],
          ["website_url", "Web"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} placeholder="https://..." className="rounded-xl" />
          </Field>
        ))}
      </Section>

      <Section title="Notificaciones">
        {[
          ["likes", "Cuando alguien te da like"],
          ["matches", "Nuevos matches"],
          ["messages", "Mensajes en el chat"],
          ["collab_tags", "Te etiquetan en una colaboración"],
        ].map(([k, label]) => (
          <div key={k} className="flex items-center justify-between py-2">
            <span className="text-sm">{label}</span>
            <Switch
              checked={form.notification_prefs?.[k] ?? true}
              onCheckedChange={(v) => setPref(k, v)}
            />
          </div>
        ))}
      </Section>

      <Section title="Verificación de artista">
        {profile.is_verified ? (
          <div className="flex items-center gap-2 text-sm">
            <VerifiedBadge size={18} /> Tu perfil está verificado.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Solicita la insignia de artista verificado para ganar confianza en la comunidad.
            </p>
            <Button variant="outline" onClick={requestVerification} disabled={requestingVerif} className="rounded-full">
              <Shield className="w-4 h-4 mr-2" />
              {requestingVerif ? "Enviando..." : "Solicitar verificación"}
            </Button>
          </>
        )}
      </Section>

      <div className="sticky bottom-20 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-t border-border/40">
        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl text-base font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar cambios
        </Button>
      </div>

      {isAdmin && (
        <Link
          to="/admin"
          className="flex items-center justify-between bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 rounded-2xl p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <div className="font-semibold text-sm">Panel de administración</div>
              <div className="text-xs text-muted-foreground">Verificaciones y reportes</div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
      </Button>

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropSrc}
        onClose={() => {
          setCropperOpen(false);
          setCropSrc(null);
        }}
        onCropComplete={uploadCroppedAvatar}
      />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card/50 border border-border/40 rounded-2xl p-4 space-y-3">
    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const Chip = ({ active, onClick, children, variant = "primary" }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all",
      active
        ? variant === "secondary"
          ? "bg-secondary text-secondary-foreground border-secondary"
          : "bg-primary text-primary-foreground border-primary"
        : "bg-card/50 border-border"
    )}
  >
    {children}
  </button>
);

export default MyProfile;
