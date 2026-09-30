import { useState } from "react";
import { MoreVertical, Flag, Ban, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "fake", label: "Perfil falso" },
  { value: "harassment", label: "Acoso" },
  { value: "other", label: "Otro" },
] as const;

interface Props {
  targetUserId: string;
  targetDisplayName: string;
}

export const ProfileActions = ({ targetUserId, targetDisplayName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.id === targetUserId) return null;

  const startChat = async () => {
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`
      )
      .maybeSingle();
    if (!match) {
      toast({ title: "Aún no hay match", description: "Haz match en Discover para poder chatear." });
      return;
    }
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("match_id", match.id)
      .maybeSingle();
    if (conv) navigate(`/chat/${conv.id}`);
  };

  const submitReport = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: targetUserId,
      reason: reason as any,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Reporte enviado", description: "Gracias. Lo revisaremos pronto." });
    setReportOpen(false);
    setDetails("");
  };

  const confirmBlock = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Usuario bloqueado", description: "Ya no verás su perfil." });
    qc.invalidateQueries({ queryKey: ["blocked-ids"] });
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["discover"] });
    setBlockOpen(false);
    navigate("/discover", { replace: true });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="rounded-full" onClick={startChat}>
          <MessageCircle className="w-4 h-4 mr-1.5" /> Mensaje
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-full" aria-label="Más">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setReportOpen(true)}>
              <Flag className="w-4 h-4 mr-2" /> Reportar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBlockOpen(true)}>
              <Ban className="w-4 h-4 mr-2" /> Bloquear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar a {targetDisplayName}</DialogTitle>
            <DialogDescription>Tus reportes son anónimos y los revisa el equipo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Detalles (opcional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancelar</Button>
            <Button onClick={submitReport} disabled={submitting}>Enviar reporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Bloquear a {targetDisplayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              No volverán a verse. Cualquier match o swipe entre ustedes se eliminará. Esto no se puede deshacer fácilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock} disabled={submitting} className="bg-destructive hover:bg-destructive/90">
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfileActions;
