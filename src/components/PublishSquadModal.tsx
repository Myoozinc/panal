import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Rocket,
  Users,
  MapPin,
  Music,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DISCIPLINES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/types/independent";

interface PublishSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  otherUser?: Profile | null;
  defaultTitle?: string;
  onSuccess?: (collabId: string) => void;
}

export const PublishSquadModal = ({
  isOpen,
  onClose,
  conversationId,
  otherUser,
  defaultTitle = "",
  onSuccess,
}: PublishSquadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState(defaultTitle || "Nuevo Proyecto Colaborativo");
  const [description, setDescription] = useState("");
  const [targetDiscipline, setTargetDiscipline] = useState<string>("videographer");
  const [location, setLocation] = useState("Remoto");
  const [demoUrl, setDemoUrl] = useState("");

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No estás autenticado");
      if (!title.trim()) throw new Error("Por favor ingresa un título para el proyecto");

      const selectedDiscLabel =
        DISCIPLINES.find((d) => d.value === targetDiscipline)?.label ?? targetDiscipline;

      // 1. Create collaboration with post_type = 'open_squad'
      const { data: collab, error: collabErr } = await supabase
        .from("collaborations")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim() || `Squad buscando ${selectedDiscLabel} para impulsar el proyecto.`,
          post_type: "open_squad",
          target_discipline: targetDiscipline,
          location: location.trim() || "Remoto",
          spotify_url: demoUrl.includes("spotify.com") ? demoUrl.trim() : null,
          youtube_url: demoUrl.includes("youtube.com") || demoUrl.includes("youtu.be") ? demoUrl.trim() : null,
          soundcloud_url: demoUrl.includes("soundcloud.com") ? demoUrl.trim() : null,
        })
        .select()
        .single();

      if (collabErr || !collab) throw collabErr || new Error("Error creando el proyecto");

      // 2. Add creator and other collaborator into collaboration_participants
      const participantsToInsert = [
        { collab_id: collab.id, user_id: user.id, role: "owner" },
      ];
      if (otherUser?.id && otherUser.id !== user.id) {
        participantsToInsert.push({
          collab_id: collab.id,
          user_id: otherUser.id,
          role: "member",
        });
      }

      await supabase
        .from("collaboration_participants")
        .upsert(participantsToInsert, { onConflict: "collab_id,user_id" });

      // 3. Mark conversation as group / link to collab
      await supabase
        .from("conversations")
        .update({
          is_group: true,
          title: title.trim(),
          collab_id: collab.id,
        })
        .eq("id", conversationId);

      // 4. Ensure both are in conversation_members
      const membersToInsert = [
        { conversation_id: conversationId, user_id: user.id, role: "owner" },
      ];
      if (otherUser?.id && otherUser.id !== user.id) {
        membersToInsert.push({
          conversation_id: conversationId,
          user_id: otherUser.id,
          role: "member",
        });
      }
      await supabase
        .from("conversation_members")
        .upsert(membersToInsert, { onConflict: "conversation_id,user_id" });

      // 5. Post an announcement message in the conversation
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `🚀 ¡Convocatoria abierta en Discover! Hemos publicado este squad buscando: "${selectedDiscLabel}" para el proyecto "${title.trim()}". Los interesados podrán postularse y hacer multi-match con nosotros.`,
      });

      return collab;
    },
    onSuccess: (collab) => {
      toast({
        title: "¡Squad publicado con éxito! 🚀",
        description: "El proyecto ahora aparece en la sección 'Proyectos & Squads' de Discover.",
      });
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["discover-squads"] });
      qc.invalidateQueries({ queryKey: ["match-conversations"] });
      onSuccess?.(collab.id);
      onClose();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error al publicar",
        description: err.message,
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center">
            <Rocket className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black">
            Publicar Squad en Discover
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Muestren su proyecto conjunto en el feed de Discover para encontrar al 3er o 4to integrante que necesitan (videógrafo, agente de booking, marketing, actor, etc.).
          </DialogDescription>
        </DialogHeader>

        {/* Squad preview team */}
        <div className="bg-muted/40 border border-border/40 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="flex -space-x-3 overflow-hidden">
            <Avatar className="w-10 h-10 border-2 border-background">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                Tú
              </AvatarFallback>
            </Avatar>
            {otherUser && (
              <Avatar className="w-10 h-10 border-2 border-background">
                <AvatarImage src={otherUser.avatar_url ?? undefined} />
                <AvatarFallback>{otherUser.display_name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-bold text-foreground truncate">
              Squad: Tú {otherUser ? `+ ${otherUser.display_name}` : ""}
            </p>
            <p className="text-muted-foreground text-[11px] truncate">
              Aparecerán como perfil conjunto buscando nuevo talento
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Project Title */}
          <div>
            <Label className="text-xs font-bold">Título del Proyecto / Colaboración *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Single Urbano + Videoclip Oficial"
              className="mt-1.5 rounded-xl h-10"
              maxLength={90}
            />
          </div>

          {/* Target Discipline */}
          <div>
            <Label className="text-xs font-bold">¿A quién están buscando para unirse al Squad? *</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Se filtrará para profesionales y creativos con esta especialidad en Discover
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1 border border-border/40 rounded-2xl p-2 bg-muted/20">
              {DISCIPLINES.map((d) => {
                const isSelected = targetDiscipline === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setTargetDiscipline(d.value)}
                    className={`text-left text-xs p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-card border-border/50 hover:bg-accent/60 text-muted-foreground"
                    }`}
                  >
                    <span>{d.emoji}</span>
                    <span className="truncate">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Modalidad / Ubicación
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Remoto, Madrid, Ciudad de México, Buenos Aires"
              className="mt-1.5 rounded-xl h-10"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-bold">Descripción del Proyecto</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuenten brevemente qué están creando, qué ofrecen y qué esperan del nuevo integrante..."
              className="mt-1.5 rounded-xl min-h-[70px] text-xs resize-none"
              maxLength={500}
            />
          </div>

          {/* Demo Link */}
          <div>
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-primary" /> Enlace a Demo o Maqueta (Opcional)
            </Label>
            <Input
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://soundcloud.com/... o Spotify / YouTube"
              className="mt-1.5 rounded-xl h-10 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || !title.trim()}
            className="rounded-full font-bold gap-2 bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/20"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Publicar Convocatoria en Discover
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
