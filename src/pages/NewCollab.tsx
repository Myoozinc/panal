import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Upload,
  UserPlus,
  X,
  Copy,
  Check,
  Megaphone,
  Disc3,
  MapPin,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { DISCIPLINES, type Discipline } from "@/lib/constants";
import type { Profile } from "@/types/panal";
import { cn } from "@/lib/utils";

const urlOrEmpty = z.string().trim().url().or(z.literal(""));
const schema = z.object({
  title: z.string().trim().min(2, "El título debe tener al menos 2 caracteres").max(120),
  description: z.string().trim().max(800).optional().default(""),
  spotify_url: urlOrEmpty.optional().default(""),
  youtube_url: urlOrEmpty.optional().default(""),
  soundcloud_url: urlOrEmpty.optional().default(""),
  instagram_url: urlOrEmpty.optional().default(""),
});

const NewCollab = () => {
  const { user } = useAuth();
  const [search] = useSearchParams();
  const initialWith = search.get("with");
  const initialType = (search.get("type") === "collab" ? "collab" : "call") as "call" | "collab";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [postType, setPostType] = useState<"call" | "collab">(initialType);
  const [targetDiscipline, setTargetDiscipline] = useState<string>("singer");
  const [location, setLocation] = useState("Remoto");
  const [compensation, setCompensation] = useState("Colaboración / Reparto de regalías");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [spotify, setSpotify] = useState("");
  const [youtube, setYoutube] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [instagram, setInstagram] = useState("");
  const [selectedMatches, setSelectedMatches] = useState<string[]>(initialWith ? [initialWith] : []);
  const [externalCollabs, setExternalCollabs] = useState<string[]>([]);
  const [externalInput, setExternalInput] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const buildInviteLink = (name: string) =>
    `${window.location.origin}/auth?signup=1&invite_name=${encodeURIComponent(name)}`;

  const addExternal = () => {
    const name = externalInput.trim();
    if (!name) return;
    if (externalCollabs.some((n) => n.toLowerCase() === name.toLowerCase())) {
      toast({ variant: "destructive", title: "Ya añadido", description: `${name} ya está en la lista` });
      return;
    }
    setExternalCollabs((s) => [...s, name]);
    setExternalInput("");
  };

  const removeExternal = (name: string) =>
    setExternalCollabs((s) => s.filter((n) => n !== name));

  const copyInvite = async (name: string) => {
    try {
      await navigator.clipboard.writeText(buildInviteLink(name));
      setCopiedName(name);
      toast({ title: "Enlace copiado", description: `Invita a ${name} a unirse` });
      setTimeout(() => setCopiedName((c) => (c === name ? null : c)), 2000);
    } catch {
      toast({ variant: "destructive", title: "No se pudo copiar" });
    }
  };

  const { data: matches = [] } = useQuery({
    queryKey: ["my-matches-profiles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: ms } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
      const ids = (ms ?? []).map((m) => (m.user_a === user!.id ? m.user_b : m.user_a));
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids);
      return (data ?? []) as Pick<Profile, "id" | "display_name" | "username" | "avatar_url">[];
    },
  });

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Imagen muy grande", description: "Máximo 10MB" });
      return;
    }
    setUploading(true);
    try {
      const optimized = await compressImage(file, { maxSize: 1600, quality: 0.85 });
      const path = `${user.id}/${Date.now()}_collab.webp`;
      const { error } = await supabase.storage.from("covers").upload(path, optimized, {
        upsert: true,
        contentType: "image/webp",
      });
      if (error) throw error;
      const { data: p } = supabase.storage.from("covers").getPublicUrl(path);
      setCoverUrl(p.publicUrl);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error subiendo portada", description: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        title,
        description,
        spotify_url: spotify,
        youtube_url: youtube,
        soundcloud_url: soundcloud,
        instagram_url: instagram,
      });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);

      const payload: any = {
        owner_id: user!.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        spotify_url: parsed.data.spotify_url || null,
        youtube_url: parsed.data.youtube_url || null,
        soundcloud_url: parsed.data.soundcloud_url || null,
        instagram_url: parsed.data.instagram_url || null,
        cover_url: coverUrl,
        post_type: postType,
        target_discipline: postType === "call" ? targetDiscipline : null,
        location: postType === "call" ? location : null,
        compensation: postType === "call" ? compensation : null,
      };

      let collabId: string;

      // Try inserting with new open call columns
      const { data: collab, error } = await supabase
        .from("collaborations")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        // Fallback without new columns if migration is pending
        const basePayload: any = {
          owner_id: user!.id,
          title: postType === "call" ? `[LLAMADO] ${parsed.data.title}` : parsed.data.title,
          description:
            postType === "call"
              ? `[Buscando: ${targetDiscipline} | ${location}]\n\n${parsed.data.description || ""}`
              : parsed.data.description || null,
          spotify_url: parsed.data.spotify_url || null,
          youtube_url: parsed.data.youtube_url || null,
          soundcloud_url: parsed.data.soundcloud_url || null,
          instagram_url: parsed.data.instagram_url || null,
          cover_url: coverUrl,
        };

        const { data: fbCollab, error: fbErr } = await supabase
          .from("collaborations")
          .insert([basePayload])
          .select("id")
          .single();

        if (fbErr) throw fbErr;
        collabId = fbCollab.id;
      } else {
        collabId = collab.id;
      }

      // If collaboration mode, insert participants
      if (postType === "collab") {
        const participants = Array.from(new Set([user!.id, ...selectedMatches])).map((uid) => ({
          collab_id: collabId,
          user_id: uid,
        }));
        await supabase.from("collaboration_participants").insert(participants);
      }

      return collabId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-collabs"] });
      toast({
        title: postType === "call" ? "¡Llamado publicado con éxito!" : "¡Colaboración publicada!",
        description:
          postType === "call"
            ? "Tu búsqueda ya aparece en el feed para que otros artistas conecten contigo."
            : "Tu trabajo conjunto ya está visible en el feed.",
      });
      navigate("/feed");
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: "No se pudo publicar", description: err.message }),
  });

  const toggleMatch = (id: string) =>
    setSelectedMatches((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="px-4 pt-4 pb-8 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Volver
      </Button>

      <h1 className="text-2xl font-black mb-1">
        {postType === "call" ? "Crear Llamado / Búsqueda" : "Nueva Colaboración"}
      </h1>
      <p className="text-muted-foreground text-xs mb-5">
        {postType === "call"
          ? "Publica una búsqueda activa para encontrar talento para tu próximo proyecto"
          : "Muestra un trabajo conjunto terminado con sus créditos"}
      </p>

      {/* Type Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/50 mb-6">
        <button
          type="button"
          onClick={() => setPostType("call")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
            postType === "call"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Megaphone className="w-3.5 h-3.5 text-primary" /> Llamado / Búsqueda
        </button>
        <button
          type="button"
          onClick={() => setPostType("collab")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
            postType === "collab"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Disc3 className="w-3.5 h-3.5 text-secondary" /> Colaboración / Release
        </button>
      </div>

      <div className="space-y-4">
        {/* Open Call specific fields */}
        {postType === "call" && (
          <div className="space-y-4 bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div>
              <Label className="text-xs font-bold text-foreground block mb-2">
                ¿A quién buscas para tu proyecto?
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DISCIPLINES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setTargetDiscipline(d.value)}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1",
                      targetDiscipline === d.value
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{d.emoji}</span>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground block mb-1.5">
                Modalidad o Ubicación:
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Remoto, Madrid, CDMX..."
                className="rounded-xl h-11 bg-card"
              />
              <div className="flex gap-1.5 mt-2">
                {["Remoto", "Presencial", "Madrid", "Ciudad de México", "Buenos Aires"].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className="text-[11px] px-2.5 py-0.5 rounded-full border border-border/60 bg-card hover:bg-muted text-muted-foreground"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <Label className="text-xs font-bold">
            {postType === "call" ? "Título del Llamado" : "Título de la Colaboración"}
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl mt-1.5"
            placeholder={
              postType === "call"
                ? "Ej: Busco cantante femenina para coro de R&B contemporáneo"
                : "Nombre del track o proyecto"
            }
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-bold">
            {postType === "call" ? "Detalles del Proyecto y Requisitos" : "Descripción"}
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl mt-1.5"
            placeholder={
              postType === "call"
                ? "Cuéntanos de qué trata el track, qué tipo de voz o sonido buscas, plazos estimados..."
                : "Cuéntanos sobre la colaboración, el proceso creativo..."
            }
            rows={3}
            maxLength={800}
          />
        </div>

        {/* Cover / Project image */}
        <div>
          <Label className="text-xs font-bold">
            {postType === "call" ? "Imagen o Portada de Referencia (opcional)" : "Portada (opcional)"}
          </Label>
          <label className="mt-1.5 cursor-pointer block">
            <input
              type="file"
              accept="image/*,.heic,.heif,.avif,.webp,.gif,.png,.jpg,.jpeg"
              className="hidden"
              onChange={uploadCover}
            />
            <div className="aspect-video rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition overflow-hidden">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <div className="text-center text-muted-foreground text-xs">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-primary" /> Subir imagen
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Audio Reference Links */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">
            {postType === "call" ? "Maqueta o Beat de Referencia (opcional)" : "Enlaces (opcional)"}
          </Label>
          <Input
            placeholder="Spotify URL"
            value={spotify}
            onChange={(e) => setSpotify(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="YouTube URL"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="SoundCloud URL"
            value={soundcloud}
            onChange={(e) => setSoundcloud(e.target.value)}
            className="h-11 rounded-xl"
          />
          {postType === "collab" && (
            <Input
              placeholder="Instagram URL"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="h-11 rounded-xl"
            />
          )}
        </div>

        {/* Tagging collaborators (only for collab mode) */}
        {postType === "collab" && (
          <div>
            <Label className="block mb-2 text-xs font-bold">Etiquetar colaboradores (de tus matches)</Label>
            {matches.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aún no tienes matches. Puedes publicar igualmente.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {matches.map((m) => {
                  const sel = selectedMatches.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMatch(m.id)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5",
                        sel
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 hover:bg-muted"
                      )}
                    >
                      <span>{m.display_name}</span>
                      {sel && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit button */}
        <div className="pt-3">
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !title.trim()}
            className="w-full h-12 rounded-2xl gap-2 font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25"
          >
            {create.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : postType === "call" ? (
              <>
                <Megaphone className="w-4 h-4" /> Publicar Llamado en el Feed
              </>
            ) : (
              <>
                <Disc3 className="w-4 h-4" /> Publicar Colaboración
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewCollab;
