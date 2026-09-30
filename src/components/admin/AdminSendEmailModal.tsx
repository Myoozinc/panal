import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Check, ExternalLink, Sparkles } from "lucide-react";

interface AdminSendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    name: string;
    email: string;
    username?: string;
  } | null;
}

export const AdminSendEmailModal = ({ open, onOpenChange, recipient }: AdminSendEmailModalProps) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!recipient) return null;

  const handleCopyEmail = () => {
    if (!recipient.email) return;
    navigator.clipboard.writeText(recipient.email);
    setCopiedEmail(true);
    toast({ title: "Correo copiado", description: recipient.email });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyContent = () => {
    const text = `Para: ${recipient.email}\nAsunto: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast({ title: "Contenido copiado", description: "Listo para pegar en tu cliente de correo." });
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenMailto = () => {
    if (!recipient.email) {
      toast({ variant: "destructive", title: "Este usuario no tiene correo registrado" });
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(recipient.email)}?subject=${encodeURIComponent(
      subject || "Mensaje del equipo de Independent"
    )}&body=${encodeURIComponent(body || "")}`;
    window.open(mailtoUrl, "_blank");
  };

  const applyTemplate = (type: "verification" | "support" | "welcome") => {
    const firstName = recipient.name?.split(" ")[0] || recipient.username || "amigo/a";
    if (type === "verification") {
      setSubject("Información sobre tu solicitud de verificación en Independent");
      setBody(
        `Hola ${firstName},\n\nTe escribimos desde el equipo de administración de Independent con respecto a la verificación de tu perfil.\n\n[Escribe aquí los detalles o requisitos adicionales]\n\n¡Gracias por ser parte de nuestra comunidad!\n\nAtentamente,\nEquipo Independent\n${window.location.origin}`
      );
    } else if (type === "support") {
      setSubject("Soporte Oficial - Independent");
      setBody(
        `Hola ${firstName},\n\nNos ponemos en contacto contigo para dar seguimiento a tu cuenta en Independent.\n\n[Escribe aquí tu mensaje de soporte]\n\nQuedamos a tu entera disposición para resolver cualquier duda.\n\nAtentamente,\nEquipo Independent`
      );
    } else if (type === "welcome") {
      setSubject("¡Bienvenido/a a Independent!");
      setBody(
        `Hola ${firstName},\n\n¡Nos alegra darte la bienvenida a Independent!\n\nQueremos asegurarnos de que estés aprovechando al máximo la plataforma para conectar con otros artistas y creadores.\n\nSi necesitas ayuda completando tu perfil o tienes preguntas, responde con gusto a este correo.\n\nUn saludo,\nEquipo Independent`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Enviar Correo a Usuario</DialogTitle>
              <DialogDescription className="text-xs">
                Comunícate directamente al buzón personal de este usuario.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Recipient info pill */}
          <div className="p-3 bg-muted/60 border border-border/50 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Destinatario:</p>
              <p className="text-sm font-semibold truncate">
                {recipient.name} {recipient.username && <span className="text-muted-foreground font-normal">(@{recipient.username})</span>}
              </p>
              <p className="text-xs font-mono text-primary font-medium truncate">{recipient.email || "Sin correo disponible"}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyEmail}
              className="gap-1 rounded-full text-xs h-8 shrink-0"
              disabled={!recipient.email}
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedEmail ? "Copiado" : "Copiar"}
            </Button>
          </div>

          {/* Quick template buttons */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Plantillas rápidas:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full py-0"
                onClick={() => applyTemplate("verification")}
              >
                Verificación
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full py-0"
                onClick={() => applyTemplate("support")}
              >
                Soporte
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full py-0"
                onClick={() => applyTemplate("welcome")}
              >
                Bienvenida
              </Button>
            </div>
          </div>

          {/* Subject field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Asunto:</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Novedades sobre tu perfil en Independent"
              className="rounded-xl"
            />
          </div>

          {/* Body field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Mensaje / Cuerpo:</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el mensaje que deseas enviar al usuario..."
              rows={6}
              className="rounded-xl resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyContent}
            className="text-xs rounded-full gap-1 w-full sm:w-auto"
            disabled={!subject && !body}
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? "Copiado completo" : "Copiar asunto y texto"}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full flex-1 sm:flex-initial"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenMailto}
              disabled={!recipient.email}
              className="rounded-full gap-1.5 bg-primary hover:bg-primary/90 flex-1 sm:flex-initial"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en mi correo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
