import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  Zap,
  Users,
  Check,
  Calendar,
  DollarSign,
  Share2,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { PanalService, type CollabPlan } from "@/services/panalService";
import { DEMO_CREATORS } from "@/lib/demoData";
import jsPDF from "jspdf";

const SYNERGY_TEMPLATES = [
  {
    type: "content_campaign" as const,
    label: "📱 Campaña de Redes (Reels / TikTok)",
    desc: "Co-creación de videos virales y mención mutua en historias y streams.",
    defaultA: ["1 Reel colaborativo en Instagram", "2 Stories con enlace"],
    defaultB: ["1 TikTok de formato viral", "Mención en descripción"],
    comp: "cross_value" as const,
  },
  {
    type: "co_branding" as const,
    label: "🚀 Co-Branding de Producto / Marca",
    desc: "Lanzar un producto, software o servicio conjunto explotando ambas marcas.",
    defaultA: ["Diseño y producción del producto", "Estrategia de lanzamiento"],
    defaultB: ["Campaña de difusión a su audiencia", "Rostro y contenido exclusivo"],
    comp: "equal_split" as const,
  },
  {
    type: "cross_promo" as const,
    label: "🤝 Cross-Promotion de Audiencia",
    desc: "Intercambio de tráfico y menciones para crecer seguidores sin coste monetario.",
    defaultA: ["Aparición invitada en directo / podcast", "Post cruzado en X/Twitter"],
    defaultB: ["Publicación de recomendación en canal", "Mención en newsletter"],
    comp: "cross_value" as const,
  },
  {
    type: "sponsorship" as const,
    label: "🏷️ Patrocinio de Marca & Comisión",
    desc: "Patrocinio directo con tarifa fija o porcentaje de ventas por afiliado.",
    defaultA: ["Presupuesto de patrocinio y producto de muestra"],
    defaultB: ["3 publicaciones dedicadas con código de descuento exclusivo"],
    comp: "rev_share" as const,
  },
];

const CollabAgreement = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const otherCreator = DEMO_CREATORS[0]; // Partner for collaboration
  const myName = user?.email?.split("@")[0] || "Mi Perfil";
  const partnerName = otherCreator.display_name;

  const [plan, setPlan] = useState<CollabPlan>(() =>
    PanalService.getCollabPlan(conversationId || "default", user?.id || "me", otherCreator.id)
  );

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [newDeliverableA, setNewDeliverableA] = useState("");
  const [newDeliverableB, setNewDeliverableB] = useState("");

  const handleSave = () => {
    PanalService.saveCollabPlan(plan);
    toast({
      title: "Acuerdo guardado",
      description: "Los términos de colaboración han sido actualizados.",
    });
  };

  const handleSignAgreement = () => {
    const updated: CollabPlan = { ...plan, status: "agreed" };
    setPlan(updated);
    PanalService.saveCollabPlan(updated);
    toast({
      title: "¡Acuerdo Confirmado! 🐝",
      description: "Ambas partes han cerrado los términos de la colaboración.",
    });
  };

  const handleAIAssist = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      setIsGeneratingAI(false);
      const enhanced: CollabPlan = {
        ...plan,
        title: `Sinergia de Audiencias: ${myName} x ${partnerName}`,
        description: `Estrategia de crecimiento conjunto y monetización entre ${myName} y ${partnerName}. Aprovecha la audiencia combinada de ${otherCreator.social_stats?.total_reach || "+250K"} para generar tracción inmediata en lanzamientos y engagement cruzado.`,
        deliverablesA: [
          `Publicar 2 Reels conjuntos en Instagram etiquetando a @${otherCreator.username}`,
          "Integrar enlace personalizado en la bio durante 14 días",
          "Participar en un Live Stream de preguntas y respuestas",
        ],
        deliverablesB: [
          `Publicar 1 TikTok viral con el formato de tendencia de la marca`,
          "Crear 3 Historias destacadas con call-to-action directo",
          "Mención fija en el primer comentario de YouTube",
        ],
        compensationType: "rev_share",
        splitPercentage: 50,
        launchDate: "Dentro de 10 días",
      };
      setPlan(enhanced);
      PanalService.saveCollabPlan(enhanced);
      toast({
        title: "⚡ Sinergia Generada con IA",
        description: "Se han optimizado los entregables basándose en las métricas de ambos perfiles.",
      });
    }, 1200);
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PANAL — ACUERDO DE COLABORACIÓN Y SINERGIA", 20, 25);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 20, 35);
      doc.text(`Colaboradores: ${myName} & ${partnerName}`, 20, 42);
      doc.text(`Tipo de Sinergia: ${plan.title}`, 20, 49);

      doc.line(20, 55, 190, 55);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("1. Resumen y Objetivos", 20, 65);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(plan.description, 170);
      doc.text(splitDesc, 20, 72);

      let yPos = 72 + splitDesc.length * 6 + 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`2. Entregables de ${myName}`, 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      plan.deliverablesA.forEach((d) => {
        doc.text(`• ${d}`, 25, yPos);
        yPos += 6;
      });

      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`3. Entregables de ${partnerName}`, 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      plan.deliverablesB.forEach((d) => {
        doc.text(`• ${d}`, 25, yPos);
        yPos += 6;
      });

      yPos += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("4. Modelo de Monetización y Splits", 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Modelo acordado: ${
          plan.compensationType === "equal_split"
            ? "Split Equitativo 50% / 50%"
            : plan.compensationType === "rev_share"
            ? `Reparto de Ingresos (${plan.splitPercentage}% / ${100 - (plan.splitPercentage || 50)}%)`
            : "Intercambio de Audiencia y Visibilidad Mutua"
        }`,
        20,
        yPos
      );

      yPos += 20;
      doc.line(20, yPos, 85, yPos);
      doc.line(115, yPos, 180, yPos);
      yPos += 6;
      doc.text(`Firma: ${myName}`, 20, yPos);
      doc.text(`Firma: ${partnerName}`, 115, yPos);

      doc.save(`Acuerdo_Panal_${partnerName.replace(/\s+/g, "_")}.pdf`);
      toast({ title: "PDF Descargado", description: "El acuerdo formal ha sido guardado en tu equipo." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al generar PDF", description: err.message });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <Link to={`/chat/${conversationId}`}>
          <Button variant="ghost" size="sm" className="rounded-full gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al chat</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="rounded-full gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSignAgreement}
            className="rounded-full gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
          >
            <Check className="w-4 h-4" />
            <span>{plan.status === "agreed" ? "Acuerdo Activo ✓" : "Cerrar Acuerdo"}</span>
          </Button>
        </div>
      </div>

      {/* Main Partnership Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-card border border-amber-500/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 ring-2 ring-amber-400 shadow-md">
              <AvatarImage src={otherCreator.avatar_url ?? undefined} />
              <AvatarFallback className="bg-amber-500/20 text-amber-500 font-bold">
                {partnerName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">Sinergia con {partnerName}</h1>
                <Badge variant="outline" className="bg-amber-500/15 border-amber-500/40 text-amber-500 text-xs">
                  {plan.status === "agreed" ? "Acordado 🐝" : "En Borrador"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{otherCreator.discipline}</span>
                <span>•</span>
                <span className="text-amber-500 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {otherCreator.social_stats?.total_reach || "+250K"}
                </span>
              </p>
            </div>
          </div>

          <Button
            onClick={handleAIAssist}
            disabled={isGeneratingAI}
            variant="outline"
            className="rounded-full gap-2 border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingAI ? "Analizando nichos..." : "⚡ Sugerir Sinergia con IA"}</span>
          </Button>
        </div>

        {/* Template Selector */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Tipo de Sinergia
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SYNERGY_TEMPLATES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setPlan({
                    ...plan,
                    synergyType: t.type,
                    title: t.label,
                    description: t.desc,
                    deliverablesA: t.defaultA,
                    deliverablesB: t.defaultB,
                    compensationType: t.comp,
                  });
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  plan.synergyType === t.type
                    ? "border-amber-400 bg-amber-500/15 shadow-sm"
                    : "border-border/60 bg-card/60 hover:border-amber-500/40"
                }`}
              >
                <div className="font-bold text-sm text-foreground">{t.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Deliverables Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Deliverables A */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Tus Entregables ({myName})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {plan.deliverablesA.length} puntos
              </span>
            </div>
            <ul className="space-y-1.5 text-xs">
              {plan.deliverablesA.map((d, i) => (
                <li key={i} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="flex-1">{d}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = plan.deliverablesA.filter((_, idx) => idx !== i);
                      setPlan({ ...plan, deliverablesA: next });
                    }}
                    className="text-muted-foreground hover:text-destructive text-sm px-1"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Añadir entregable..."
                value={newDeliverableA}
                onChange={(e) => setNewDeliverableA(e.target.value)}
                className="h-9 text-xs rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDeliverableA.trim()) {
                    setPlan({ ...plan, deliverablesA: [...plan.deliverablesA, newDeliverableA.trim()] });
                    setNewDeliverableA("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => {
                  if (newDeliverableA.trim()) {
                    setPlan({ ...plan, deliverablesA: [...plan.deliverablesA, newDeliverableA.trim()] });
                    setNewDeliverableA("");
                  }
                }}
              >
                +
              </Button>
            </div>
          </div>

          {/* Deliverables B */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Entregables de {partnerName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {plan.deliverablesB.length} puntos
              </span>
            </div>
            <ul className="space-y-1.5 text-xs">
              {plan.deliverablesB.map((d, i) => (
                <li key={i} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="flex-1">{d}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = plan.deliverablesB.filter((_, idx) => idx !== i);
                      setPlan({ ...plan, deliverablesB: next });
                    }}
                    className="text-muted-foreground hover:text-destructive text-sm px-1"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Añadir entregable..."
                value={newDeliverableB}
                onChange={(e) => setNewDeliverableB(e.target.value)}
                className="h-9 text-xs rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDeliverableB.trim()) {
                    setPlan({ ...plan, deliverablesB: [...plan.deliverablesB, newDeliverableB.trim()] });
                    setNewDeliverableB("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => {
                  if (newDeliverableB.trim()) {
                    setPlan({ ...plan, deliverablesB: [...plan.deliverablesB, newDeliverableB.trim()] });
                    setNewDeliverableB("");
                  }
                }}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Compensation & Timeline */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
              Modelo Económico
            </label>
            <select
              value={plan.compensationType}
              onChange={(e) => setPlan({ ...plan, compensationType: e.target.value as any })}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-xs font-semibold"
            >
              <option value="cross_value">Intercambio de Audiencia (Sin dinero)</option>
              <option value="equal_split">Split Equitativo 50% / 50%</option>
              <option value="rev_share">Reparto por Ventas de Afiliados (%)</option>
              <option value="fixed_fee">Tarifa Fija de Patrocinio (€ / $)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
              Fecha Estimada de Lanzamiento
            </label>
            <Input
              value={plan.launchDate || "En 2 semanas"}
              onChange={(e) => setPlan({ ...plan, launchDate: e.target.value })}
              placeholder="Ej. Octubre 2026 / 15 días"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleSave} className="rounded-xl text-xs font-bold">
            Guardar Borrador
          </Button>
          <Button
            onClick={handleSignAgreement}
            className="rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-500 shadow-md shadow-amber-500/20"
          >
            {plan.status === "agreed" ? "Acuerdo Activo ✓" : "Cerrar Acuerdo con 1 Clic"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CollabAgreement;
