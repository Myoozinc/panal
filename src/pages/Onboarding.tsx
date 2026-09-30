import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import Logo from "@/components/Logo";
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
import { compressImage, fileToDataUrl } from "@/lib/image";
import { ImageCropperModal } from "@/components/ImageCropperModal";

const usernameRegex = /^[a-z0-9_]{3,20}$/;
const urlOrEmpty = z.string().trim().url().or(z.literal(""));

const schema = z.object({
  display_name: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  username: z.string().trim().regex(usernameRegex, "Solo letras minúsculas, números y _ (3-20 caracteres)"),
  bio: z.string().trim().max(280).optional().default(""),
  city: z.string().trim().max(60).optional().default(""),
  country: z.string().trim().max(60).optional().default(""),
  discipline: zDiscipline,
  genres: z.array(z.string()).min(1, "Elige al menos 1 género"),
  skills: z.array(z.string()).default([]),
  experience_level: z.enum(["beginner", "intermediate", "pro"]),
  years_active: z.coerce.number().min(0).max(80).optional(),
  looking_for: z.array(zDiscipline).min(1, "Elige al menos 1"),
  spotify_url: urlOrEmpty.optional().default(""),
  youtube_url: urlOrEmpty.optional().default(""),
  instagram_url: urlOrEmpty.optional().default(""),
  tiktok_url: urlOrEmpty.optional().default(""),
  x_url: urlOrEmpty.optional().default(""),
  twitch_url: urlOrEmpty.optional().default(""),
  linkedin_url: urlOrEmpty.optional().default(""),
  soundcloud_url: urlOrEmpty.optional().default(""),
  website_url: urlOrEmpty.optional().default(""),
});

type FormData = z.infer<typeof schema>;

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[\s-]+/g, "_")          // spaces and hyphens to underscore
    .replace(/[^a-z0-9_]/g, "")       // only valid username chars
    .slice(0, 20);
};

const Onboarding = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [form, setForm] = useState<Partial<FormData> & { disciplines?: Discipline[] }>({
    disciplines: [],
    genres: [],
    skills: [],
    looking_for: [],
  });

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/discover", { replace: true });
    }
    if (profile && !avatarUrl && profile.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
    if (profile && form.display_name === undefined) {
      const initialDisciplines = profile.discipline ? [profile.discipline] : [];
      setForm((f) => ({
        ...f,
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        disciplines: initialDisciplines,
        discipline: profile.discipline ?? undefined,
      }));
      if (profile.username) setUsernameTouched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleDisplayName = (name: string) => {
    setForm((f) => {
      const next = { ...f, display_name: name };
      if (!usernameTouched || !f.username) {
        next.username = slugify(name);
      }
      return next;
    });
  };

  const handleUsername = (raw: string) => {
    setUsernameTouched(true);
    setForm((f) => ({ ...f, username: slugify(raw) }));
  };

  const toggleArr = <T,>(arr: T[] | undefined, v: T): T[] => {
    const a = arr ?? [];
    return a.includes(v) ? a.filter((x) => x !== v) : [...a, v];
  };

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // 1. Ensure user is authenticated & session token is valid and fresh
      let { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed?.user) {
          throw new Error("Tu sesión ha expirado. Por favor vuelve a iniciar sesión.");
        }
        authUser = refreshed.user;
      }

      // 2. Client-side compression
      const compressed = await compressImage(croppedFile, { maxSize: 800, quality: 0.88 });
      const path = `${authUser.id}/avatar-${Date.now()}.jpg`;

      // 3. Try upload to storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (!uploadErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      } else {
        console.warn("Storage upload rejected, falling back to compressed data URL:", uploadErr);
        // Fallback: save as compressed base64 Data URL so profile photo works 100% of the time
        const dataUrl = await fileToDataUrl(compressed);
        setAvatarUrl(dataUrl);
      }
      toast({ title: "Foto encuadrada y guardada con éxito" });
    } catch (err: any) {
      console.error("Error subiendo avatar:", err);
      try {
        const fallbackUrl = await fileToDataUrl(croppedFile);
        setAvatarUrl(fallbackUrl);
        toast({ title: "Foto cargada localmente" });
      } catch {
        toast({
          variant: "destructive",
          title: "No se pudo cargar la foto",
          description: "Puedes continuar y configurarla más tarde desde tu perfil.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.display_name || form.display_name.trim().length < 2) {
        toast({ variant: "destructive", title: "Nombre requerido", description: "Ingresa tu nombre artístico (mínimo 2 letras)" });
        return false;
      }
      if (!form.username || form.username.length < 3) {
        toast({ variant: "destructive", title: "Username incompleto", description: "Debe tener al menos 3 caracteres (ej. nombre_artista)" });
        return false;
      }
      if (!usernameRegex.test(form.username)) {
        toast({ variant: "destructive", title: "Username inválido", description: "Solo minúsculas, números y _ (3-20 caracteres)" });
        return false;
      }
    }
    if (step === 1) {
      const selectedDisciplines = (form.disciplines && form.disciplines.length > 0)
        ? form.disciplines
        : (form.discipline ? [form.discipline] : []);
      if (selectedDisciplines.length === 0) {
        toast({ variant: "destructive", title: "Elige al menos 1 disciplina" });
        return false;
      }
      if (!form.genres?.length) { toast({ variant: "destructive", title: "Elige al menos 1 género" }); return false; }
      if (!form.experience_level) { toast({ variant: "destructive", title: "Elige tu nivel" }); return false; }
    }
    if (step === 2) {
      if (!form.looking_for?.length) { toast({ variant: "destructive", title: "Elige al menos 1 disciplina con quien colaborar" }); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 2)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!validateStep() || !user) return;

    const selectedDisciplines = (form.disciplines && form.disciplines.length > 0)
      ? form.disciplines
      : (form.discipline ? [form.discipline] : []);
    const primaryDiscipline = selectedDisciplines[0];

    // Collect additional disciplines as labels in skills
    const additionalLabels = selectedDisciplines
      .slice(1)
      .map((val) => DISCIPLINES.find((d) => d.value === val)?.label)
      .filter(Boolean) as string[];
    const mergedSkills = Array.from(new Set([...additionalLabels, ...(form.skills ?? [])]));

    const payload = {
      ...form,
      discipline: primaryDiscipline,
      skills: mergedSkills,
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Revisa el formulario", description: parsed.error.errors[0].message });
      return;
    }
    setSubmitting(true);
    try {
      // username uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", parsed.data.username)
        .neq("id", user.id)
        .maybeSingle();
      if (existing) {
        toast({ variant: "destructive", title: "Username en uso", description: "Elige otro diferente" });
        setStep(0);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: parsed.data.display_name,
          username: parsed.data.username,
          bio: parsed.data.bio,
          city: parsed.data.city,
          country: parsed.data.country,
          discipline: parsed.data.discipline,
          genres: parsed.data.genres,
          skills: parsed.data.skills,
          experience_level: parsed.data.experience_level,
          years_active: parsed.data.years_active,
          looking_for: parsed.data.looking_for,
          spotify_url: parsed.data.spotify_url,
          youtube_url: parsed.data.youtube_url,
          instagram_url: parsed.data.instagram_url,
          soundcloud_url: parsed.data.soundcloud_url,
          website_url: parsed.data.website_url,
          avatar_url: avatarUrl,
          onboarding_completed: true,
        });
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "¡Bienvenido a Panal! 🐝" });
      navigate("/discover", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-lg mx-auto px-5 py-8">
        <div className="flex justify-center mb-6"><Logo size="md" showText /></div>

        {/* progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: step >= i ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
                className="h-full bg-gradient-to-r from-primary to-secondary"
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <h2 className="text-3xl font-black">Cuéntanos quién eres</h2>
                <p className="text-muted-foreground">Tu identidad en el Panal</p>

                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-28 h-28 rounded-full bg-muted overflow-hidden border-4 border-primary/20 shadow-lg">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sin foto</div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,.heic,.heif,.avif,.webp,.gif,.png,.jpg,.jpeg" className="hidden" onChange={handleAvatarSelect} />
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {avatarUrl ? "Cambiar foto" : "Subir foto"}
                    </span>
                  </label>
                </div>

                <div>
                  <Label>Nombre artístico</Label>
                  <Input
                    value={form.display_name ?? ""}
                    onChange={(e) => handleDisplayName(e.target.value)}
                    placeholder="Ej. Tu nombre artístico"
                    className="h-12 rounded-xl mt-1.5"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Username (identificador único)</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {form.username ? `@${form.username}` : "3-20 caracteres"}
                    </span>
                  </div>
                  <Input
                    value={form.username ?? ""}
                    onChange={(e) => handleUsername(e.target.value)}
                    placeholder="tu_usuario"
                    className="h-12 rounded-xl mt-1.5 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {form.username && form.username.length >= 3 && form.username.length <= 20 && usernameRegex.test(form.username) ? (
                      <span className="text-emerald-500 font-medium">✓ Enlace público: independent.app/@{form.username}</span>
                    ) : (
                      "Se formateará automáticamente en minúsculas y sin espacios."
                    )}
                  </p>
                </div>
                <div>
                  <Label>Bio corta</Label>
                  <Textarea value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Una frase sobre tu arte..." maxLength={280} className="rounded-xl mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ciudad</Label>
                    <Input value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} className="h-12 rounded-xl mt-1.5" />
                  </div>
                  <div>
                    <Label>País</Label>
                    <Input value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} className="h-12 rounded-xl mt-1.5" />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-3xl font-black">Tus disciplinas</h2>
                <p className="text-muted-foreground">¿Qué tipo de artista eres? Puedes elegir una o varias.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DISCIPLINES.map((d) => {
                    const currentDisciplines = (form.disciplines && form.disciplines.length > 0)
                      ? form.disciplines
                      : (form.discipline ? [form.discipline] : []);
                    const isSelected = currentDisciplines.includes(d.value as Discipline);

                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? currentDisciplines.filter((x) => x !== d.value)
                            : [...currentDisciplines, d.value as Discipline];
                          setForm((f) => ({
                            ...f,
                            disciplines: next,
                            discipline: next[0] ?? undefined,
                          }));
                        }}
                        className={cn(
                          "relative rounded-2xl p-4 border-2 transition-all text-center",
                          isSelected
                            ? "border-primary bg-primary/10 scale-105 shadow-lg ring-1 ring-primary/40"
                            : "border-border/50 bg-card/50 hover:border-primary/40"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow">
                            ✓
                          </span>
                        )}
                        <div className="text-3xl mb-1">{d.emoji}</div>
                        <div className="text-sm font-semibold">{d.label}</div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <Label className="mb-2 block">Géneros (elige uno o más)</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_GENRES.map((g) => {
                      const active = form.genres?.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => update("genres", toggleArr(form.genres, g))}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card/50 border-border hover:border-primary/40"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Skills (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SKILLS.map((g) => {
                      const active = form.skills?.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => update("skills", toggleArr(form.skills, g))}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            active
                              ? "bg-secondary text-secondary-foreground border-secondary"
                              : "bg-card/50 border-border hover:border-secondary/40"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nivel</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                      {EXPERIENCE_LEVELS.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => update("experience_level", l.value as ExperienceLevel)}
                          className={cn(
                            "h-10 rounded-xl text-sm font-medium border transition-all",
                            form.experience_level === l.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card/50 border-border hover:border-primary/40"
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Años activo</Label>
                    <Input
                      type="number"
                      min={0}
                      max={80}
                      value={form.years_active ?? ""}
                      onChange={(e) => update("years_active", e.target.value ? Number(e.target.value) : undefined as any)}
                      className="h-12 rounded-xl mt-1.5"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-3xl font-black">Conecta tu mundo</h2>
                <p className="text-muted-foreground">Enlaces y con quién quieres colaborar</p>

                <div>
                  <Label className="mb-2 block">Busco colaborar con</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DISCIPLINES.map((d) => {
                      const active = form.looking_for?.includes(d.value as Discipline);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => update("looking_for", toggleArr(form.looking_for, d.value as Discipline))}
                          className={cn(
                            "rounded-2xl p-3 border-2 transition-all text-left flex items-center gap-2",
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border/50 bg-card/50 hover:border-primary/40"
                          )}
                        >
                          <span className="text-xl">{d.emoji}</span>
                          <span className="text-sm font-semibold">{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="block">Tus Redes & Enlaces (para tu Bento de Match)</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Aparecerán como widgets en tu tarjeta de match para que otros creadores vean tu potencial.
                  </p>
                  {[
                    { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/tu_usuario" },
                    { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@tu_usuario" },
                    { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@tu_canal" },
                    { key: "x_url", label: "X (Twitter)", placeholder: "https://x.com/tu_usuario" },
                    { key: "twitch_url", label: "Twitch", placeholder: "https://twitch.tv/tu_canal" },
                    { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/tu_perfil" },
                    { key: "spotify_url", label: "Spotify", placeholder: "https://open.spotify.com/artist/..." },
                    { key: "website_url", label: "Web / Portafolio", placeholder: "https://tuweb.com" },
                  ].map((f) => (
                    <Input
                      key={f.key}
                      placeholder={`${f.label} — ${f.placeholder}`}
                      value={(form as any)[f.key] ?? ""}
                      onChange={(e) => update(f.key as any, e.target.value)}
                      className="h-11 rounded-xl text-sm"
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={prev} className="rounded-xl h-12">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={next} className="flex-1 rounded-xl h-12 font-semibold">
              Siguiente <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="flex-1 rounded-xl h-12 font-semibold">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Check className="mr-1 w-4 h-4" /> Empezar</>)}
            </Button>
          )}
        </div>

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
    </div>
  );
};

export default Onboarding;
