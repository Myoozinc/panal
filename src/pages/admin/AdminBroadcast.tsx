import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Users,
  Copy,
  Check,
  ExternalLink,
  Download,
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  Megaphone,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { broadcastUpdateToAllUsers } from "@/lib/officialChat";
import type { AdminEmailItem } from "@/types/panal";

const AdminBroadcast = () => {
  const { toast } = useToast();
  const [copiedBcc, setCopiedBcc] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.origin : "https://panal.app";
  const [emailSubject, setEmailSubject] = useState("🚀 ¡Nueva actualización en Panal! Descubre las novedades");
  const [emailBody, setEmailBody] = useState(
    `Hola a todos,\n\nQueremos contarles que acabamos de lanzar una nueva actualización en Panal con importantes mejoras para toda la comunidad:\n\n• Recap interactivo de redes sociales y potencial de colaboración\n• Soporte optimizado para capturas y fotos en alta resolución\n• Mejoras en el sistema de conexiones y chat directo\n\nIngresa ahora para actualizar tu perfil y conectar con nuevos creadores:\n${typeof window !== "undefined" ? window.location.origin : "https://panal.app"}\n\n¡Gracias por ser parte de Panal!\n\nAtentamente,\nEquipo Panal`
  );

  const [inAppTitle, setInAppTitle] = useState("¡Nueva actualización disponible!");
  const [inAppMessage, setInAppMessage] = useState(
    "Hemos mejorado la app: nuevo encuadre de fotos, subida universal de imágenes y más. ¡Revisa tu perfil!"
  );
  const [broadcastingNotification, setBroadcastingNotification] = useState(false);

  // Fetch all user emails via RPC or fallback
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-user-emails"],
    queryFn: async (): Promise<AdminEmailItem[]> => {
      // 1. Try RPC get_all_user_emails
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_all_user_emails");
        if (!rpcErr && rpcData && rpcData.length > 0) {
          return rpcData as AdminEmailItem[];
        }
      } catch {
        // Fallback below
      }

      // 2. Fallback: try get_admin_users RPC
      try {
        const { data: adminUsers, error: aErr } = await (supabase.rpc as any)("get_admin_users");
        if (!aErr && adminUsers && adminUsers.length > 0) {
          return adminUsers.map((u: any) => ({
            id: u.id,
            email: u.email || "",
            display_name: u.display_name || "",
            username: u.username || "",
            discipline: u.discipline || "",
            is_verified: !!u.is_verified,
            created_at: u.created_at,
          }));
        }
      } catch {
        // Fallback to profiles table
      }

      // 3. Fallback: profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, discipline, is_verified, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: "",
        display_name: p.display_name || "",
        username: p.username || "",
        discipline: p.discipline || "",
        is_verified: !!p.is_verified,
        created_at: p.created_at,
      }));
    },
  });

  const validEmails = users.filter((u) => u.email && u.email.includes("@")).map((u) => u.email.trim());

  const handleCopyAllBcc = () => {
    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin correos disponibles",
        description: "No se encontraron correos de usuarios para copiar.",
      });
      return;
    }
    const bccString = validEmails.join(", ");
    navigator.clipboard.writeText(bccString);
    setCopiedBcc(true);
    toast({
      title: "Correos copiados al portapapeles (BCC)",
      description: `Se copiaron ${validEmails.length} direcciones listas para pegar en tu cliente de correo.`,
    });
    setTimeout(() => setCopiedBcc(false), 3000);
  };

  const handleOpenClientBcc = () => {
    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin correos disponibles",
      });
      return;
    }
    // Note: mailto URLs have length limits in some operating systems (~2000 chars),
    // so we take the first batch if large, or recommend copy-paste.
    const bccList = validEmails.slice(0, 50).join(",");
    const mailtoUrl = `mailto:soporte@panal.app?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    window.open(mailtoUrl, "_blank");

    if (validEmails.length > 50) {
      toast({
        title: "Abriendo primeros 50 correos",
        description:
          "Tu navegador limita enlaces largos. Usa el botón 'Copiar todos los correos' para incluir toda la lista.",
      });
    }
  };

  const handleExportCsv = () => {
    if (users.length === 0) {
      toast({ variant: "destructive", title: "No hay usuarios para exportar" });
      return;
    }

    const headers = ["ID", "Email", "Nombre", "Usuario", "Disciplina", "Verificado", "Fecha_Registro"];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.email || ""}"`,
      `"${(u.display_name || "").replace(/"/g, '""')}"`,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${u.discipline || ""}"`,
      u.is_verified ? "SI" : "NO",
      `"${u.created_at}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `panal_usuarios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Lista descargada en CSV",
      description: `Se exportaron ${users.length} usuarios con sus datos y correos.`,
    });
  };

  const handleSendInAppNotification = async () => {
    if (!inAppMessage.trim()) {
      toast({ variant: "destructive", title: "El mensaje no puede estar vacío" });
      return;
    }

    setBroadcastingNotification(true);
    try {
      const result = await broadcastUpdateToAllUsers(inAppTitle, inAppMessage);
      if (result.error && result.count === 0) {
        throw new Error(result.error);
      }
      toast({
        title: "¡Mensaje publicado en la App!",
        description: `Se entregó el mensaje en el chat de Panal de ${result.count || users.length} usuarios registrados.`,
      });
    } catch (err: any) {
      console.error("Error broadcasting notification:", err);
      toast({
        variant: "destructive",
        title: "No se pudo enviar el anuncio a la app",
        description: err.message || "Verifica los permisos de administrador.",
      });
    } finally {
      setBroadcastingNotification(false);
    }
  };

  const applyEmailTemplate = (template: "update" | "community" | "maintenance") => {
    if (template === "update") {
      setEmailSubject("🚀 ¡Nueva actualización en Panal! Descubre las novedades");
      setEmailBody(
        `Hola a todos,\n\nQueremos contarles que acabamos de lanzar una nueva actualización en Panal con importantes mejoras para toda la comunidad:\n\n• Encuadre y edición de fotos de perfil al subir imágenes\n• Soporte universal para fotos y capturas desde cualquier dispositivo móvil\n• Mejoras en el sistema de conexiones y chat directo\n\nIngresa ahora para actualizar tu perfil y conectar con nuevos artistas:\n${currentUrl}\n\n¡Gracias por ser parte de Panal!\n\nAtentamente,\nEquipo Panal`
      );
    } else if (template === "community") {
      setEmailSubject("🎵 Nuevas oportunidades de colaboración en Panal");
      setEmailBody(
        `Hola artista,\n\nLa comunidad de Panal sigue creciendo. Cada día más productores, músicos, cantantes y creadores buscan nuevos talentos para sus proyectos.\n\nConsejos para destacar:\n1. Mantén al día tus géneros y habilidades en tu perfil.\n2. Sube tus mejores enlaces a Spotify, YouTube o SoundCloud.\n3. Explora Discover y da me gusta a quienes encajen con tu visión.\n\nConéctate hoy mismo:\n${currentUrl}\n\nSaludos cordiales,\nEquipo Panal`
      );
    } else if (template === "maintenance") {
      setEmailSubject("🛠️ Aviso de mejoras y optimizaciones en Panal");
      setEmailBody(
        `Hola,\n\nTe informamos que estamos realizando trabajos de optimización y mejoras de estabilidad en nuestros servidores para ofrecerte una experiencia aún más rápida y fluida.\n\nSi experimentas alguna interrupción puntual, nuestro equipo de soporte está atento para asistirte.\n\nGracias por tu confianza,\nEquipo Panal`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border/40 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Difusión & Correos Masivos</h2>
              <p className="text-xs text-muted-foreground">
                Comunícate con todos los usuarios registrados para avisar actualizaciones, noticias y eventos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || users.length === 0}
              className="gap-1.5 rounded-full text-xs shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV ({users.length})
            </Button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-muted/50 border border-border/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Users className="w-4 h-4" /> Usuarios totales
            </div>
            <p className="text-lg font-bold mt-1">{isLoading ? "..." : users.length}</p>
          </div>

          <div className="bg-muted/50 border border-border/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-primary text-xs">
              <Mail className="w-4 h-4" /> Correos para difusión
            </div>
            <p className="text-lg font-bold mt-1 text-primary">{isLoading ? "..." : validEmails.length}</p>
          </div>

          <div className="bg-muted/50 border border-border/40 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-emerald-500 text-xs">
              <ShieldCheck className="w-4 h-4" /> Usuarios verificados
            </div>
            <p className="text-lg font-bold mt-1 text-emerald-500">
              {isLoading ? "..." : users.filter((u) => u.is_verified).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid grid-cols-2 rounded-xl p-1 bg-muted/70">
          <TabsTrigger value="email" className="rounded-lg gap-2 text-xs font-semibold">
            <Mail className="w-4 h-4" /> Correo Masivo (BCC)
          </TabsTrigger>
          <TabsTrigger value="inapp" className="rounded-lg gap-2 text-xs font-semibold">
            <BellRing className="w-4 h-4" /> Anuncio en la App
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Mass Email */}
        <TabsContent value="email" className="space-y-4">
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Redactar Correo Masivo
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Usa copia oculta (BCC) para enviar a todos los usuarios protegiendo su privacidad.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleCopyAllBcc}
                  disabled={validEmails.length === 0}
                  className="rounded-full gap-1.5 text-xs bg-primary hover:bg-primary/90"
                >
                  {copiedBcc ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBcc ? "Copiados" : `Copiar todos (${validEmails.length} BCC)`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenClientBcc}
                  disabled={validEmails.length === 0}
                  className="rounded-full gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir cliente de correo
                </Button>
              </div>
            </div>

            {/* Template selectors */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Plantillas de difusión recomendadas:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyEmailTemplate("update")}
                  className="rounded-full text-xs h-8"
                >
                  🚀 Nueva Actualización
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyEmailTemplate("community")}
                  className="rounded-full text-xs h-8"
                >
                  🎵 Impulso de Comunidad
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyEmailTemplate("maintenance")}
                  className="rounded-full text-xs h-8"
                >
                  🛠️ Mantenimiento / Mejoras
                </Button>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Asunto del correo:</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Asunto llamativo..."
                className="rounded-xl font-medium"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Cuerpo del correo:</label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={9}
                placeholder="Escribe el contenido del correo para todos los usuarios..."
                className="rounded-xl resize-none text-sm leading-relaxed"
              />
            </div>

            {/* Best practice tips banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-primary">💡 ¿Cómo funciona el envío masivo?</p>
              <p>
                1. Haz clic en <strong>"Copiar todos (BCC)"</strong> para copiar todas las direcciones de email.
              </p>
              <p>
                2. En tu Gmail, Outlook o gestor de correo, pega la lista en el campo <strong>CCO / BCC</strong>. De esta
                forma, los usuarios no verán los correos de los demás.
              </p>
              <p>
                3. Pega el asunto y el mensaje que redactaste arriba y envía. Si usas plataformas como Resend o
                Mailchimp, puedes exportar el archivo CSV directamente con el botón superior.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: In-App Broadcast */}
        <TabsContent value="inapp" className="space-y-4">
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
            <div className="border-b border-border/40 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4 text-primary" /> Publicar en el Chat de la App
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envía un mensaje oficial desde la app Panal que quedará guardado en el chat de todos los usuarios registrados y les enviará una notificación con acceso directo al chat.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Título del aviso / actualización:</label>
              <Input
                value={inAppTitle}
                onChange={(e) => setInAppTitle(e.target.value)}
                placeholder="Ej: 🚀 ¡Nueva versión disponible en Panal!"
                className="rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Mensaje completo:</label>
              <Textarea
                value={inAppMessage}
                onChange={(e) => setInAppMessage(e.target.value)}
                rows={5}
                placeholder="Detalla las novedades, mejoras o anuncio para los usuarios..."
                className="rounded-xl resize-none text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Se enviará como <strong>Panal</strong> al chat oficial de los {users.length} usuarios registrados.
              </p>
              <Button
                size="sm"
                onClick={handleSendInAppNotification}
                disabled={broadcastingNotification || !inAppMessage.trim() || users.length === 0}
                className="rounded-full gap-2 bg-primary hover:bg-primary/90 shrink-0"
              >
                {broadcastingNotification ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publicar en el chat de todos
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBroadcast;
