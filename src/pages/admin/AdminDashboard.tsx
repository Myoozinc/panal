import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Flag,
  Users,
  ArrowRight,
  MessageSquare,
  Radio,
  Flame,
  Heart,
  Sparkles,
  TrendingUp,
  Globe,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveUserPresence } from "@/lib/telemetry";

const useCount = (key: string, fetcher: () => Promise<number>) =>
  useQuery({ queryKey: ["admin-count", key], queryFn: fetcher });

export const AdminDashboard = () => {
  const [liveCount, setLiveCount] = useState<number>(0);

  // Escuchar usuarios conectados en tiempo real
  useEffect(() => {
    const channel = supabase.channel("panal-live-monitor");
    const countPresence = () => {
      const state = channel.presenceState<LiveUserPresence>();
      const all: any[] = [];
      Object.keys(state).forEach((k) => all.push(...state[k]));
      setLiveCount(all.length);
    };

    channel
      .on("presence", { event: "sync" }, countPresence)
      .on("presence", { event: "join" }, countPresence)
      .on("presence", { event: "leave" }, countPresence)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Consultas de conteo
  const pendingVerif = useCount("verif-pending", async () => {
    const { count } = await supabase
      .from("verification_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    return count ?? 0;
  });

  const openReports = useCount("reports-open", async () => {
    const { count } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    return count ?? 0;
  });

  const totalUsers = useCount("users-total", async () => {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  });

  const totalConvs = useCount("convs-total", async () => {
    const { count } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  });

  const totalMatches = useCount("matches-total", async () => {
    try {
      const { count } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  });

  const totalSwipes = useCount("swipes-total", async () => {
    try {
      const { count } = await supabase
        .from("swipes")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  });

  const totalAgreements = useCount("agreements-total", async () => {
    try {
      const { count } = await supabase
        .from("collab_agreements")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  });

  const acceptedAgreements = useCount("agreements-accepted", async () => {
    try {
      const { count } = await supabase
        .from("collab_agreements")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted");
      return count ?? 0;
    } catch {
      return 0;
    }
  });

  // Datos para gráficos de disciplinas y crecimiento
  const { data: rawProfiles = [] } = useQuery({
    queryKey: ["admin-profiles-breakdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, created_at, discipline, is_verified, country")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Distribución de disciplinas
  const disciplineData = useMemo(() => {
    const counts: Record<string, number> = {};
    rawProfiles.forEach((p) => {
      const disc = p.discipline || "otro";
      counts[disc] = (counts[disc] || 0) + 1;
    });

    const labelsMap: Record<string, string> = {
      productor: "Productor",
      cantante: "Cantante",
      compositor: "Compositor",
      instrumentista: "Músico",
      disenador: "Diseñador",
      videografo: "Filmmaker",
      ingeniero_sonido: "Ing. Sonido",
      marketing_agency: "Marketing/PR",
      booking_agent: "Booking",
      influencer: "Influencer",
      brand_sponsor: "Marca/Sponsor",
      record_label: "Sello/A&R",
      actor: "Actor",
      otro: "Otro",
    };

    return Object.keys(counts)
      .map((k) => ({
        name: labelsMap[k] || k,
        count: counts[k],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [rawProfiles]);

  // Crecimiento temporal simulado/agrupado
  const userGrowthData = useMemo(() => {
    if (rawProfiles.length === 0) {
      return [
        { name: "Semana 1", usuarios: 1 },
        { name: "Semana 2", usuarios: 2 },
        { name: "Semana 3", usuarios: 4 },
        { name: "Semana 4", usuarios: 8 },
        { name: "Hoy", usuarios: 12 },
      ];
    }

    const byMonth: Record<string, number> = {};
    let runningTotal = 0;
    rawProfiles.forEach((p) => {
      const d = new Date(p.created_at);
      const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      byMonth[label] = (byMonth[label] || 0) + 1;
    });

    return Object.keys(byMonth).slice(-7).map((k) => {
      runningTotal += byMonth[k];
      return {
        name: k,
        nuevos: byMonth[k],
        total: runningTotal,
      };
    });
  }, [rawProfiles]);

  // Estado de acuerdos de colaboración
  const agreementsData = useMemo(() => {
    const total = totalAgreements.data ?? 0;
    const accepted = acceptedAgreements.data ?? 0;
    const inProgress = Math.max(0, total - accepted);

    return [
      { name: "Acordados ✓", value: accepted, color: "#10b981" },
      { name: "En progreso / revisión", value: inProgress, color: "#8b5cf6" },
    ];
  }, [totalAgreements.data, acceptedAgreements.data]);

  const cards = [
    {
      to: "/admin/live",
      label: "En línea ahora (Live)",
      value: liveCount,
      icon: Radio,
      color: "text-emerald-500",
      sub: "Conexiones activas en tiempo real",
      badge: "LIVE",
    },
    {
      to: "/admin/users",
      label: "Usuarios totales",
      value: totalUsers.data,
      icon: Users,
      color: "text-foreground",
      sub: "Cuentas registradas",
    },
    {
      to: "/admin/conversations",
      label: "Conversaciones",
      value: totalConvs.data,
      icon: MessageSquare,
      color: "text-secondary",
      sub: "Salas de chat activas",
    },
    {
      to: "/admin/dashboard",
      label: "Matches generados",
      value: totalMatches.data,
      icon: Heart,
      color: "text-rose-500",
      sub: "Conexiones de artistas",
    },
    {
      to: "/admin/dashboard",
      label: "Planes de Acuerdo IA",
      value: totalAgreements.data,
      icon: Sparkles,
      color: "text-primary",
      sub: `${acceptedAgreements.data ?? 0} cerrados con éxito`,
    },
    {
      to: "/admin/verifications",
      label: "Verificaciones pendientes",
      value: pendingVerif.data,
      icon: ShieldCheck,
      color: "text-amber-500",
      sub: "Solicitudes de insignia",
    },
    {
      to: "/admin/reports",
      label: "Reportes abiertos",
      value: openReports.data,
      icon: Flag,
      color: "text-destructive",
      sub: "Alertas de moderación",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida consola */}
      <div className="bg-gradient-to-r from-card via-card/90 to-primary/10 border border-border/60 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">Consola Maestra de Métricas</h1>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary bg-primary/10">
              Super Admin
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            Visión global del ecosistema Panal: actividad en vivo, telemetría, interacciones, crecimiento y acuerdos colaborativos.
          </p>
        </div>

        <Link to="/admin/live">
          <Button className="rounded-xl gap-2 font-semibold shadow-md shadow-primary/20 text-xs sm:text-sm">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Ver Usuarios & IPs en Vivo
          </Button>
        </Link>
      </div>

      {/* Grid de KPIs principales */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(({ to, label, value, icon: Icon, color, sub, badge }) => (
          <Link
            key={label}
            to={to}
            className="group bg-card border border-border/50 rounded-2xl p-4 sm:p-5 hover:border-primary/60 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-xl bg-muted/40 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              {badge ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {badge}
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
              {value ?? "—"}
            </div>
            <div className="text-xs font-semibold text-foreground/90 mt-1">{label}</div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</div>
          </Link>
        ))}
      </div>

      {/* Gráficos ejecutivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Crecimiento de usuarios */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Crecimiento de Registros
              </h3>
              <p className="text-[11px] text-muted-foreground">Evolución de nuevos artistas en la plataforma</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Acumulado
            </Badge>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888888" />
                <YAxis tick={{ fontSize: 10 }} stroke="#888888" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#userGrowth)"
                  name="Usuarios Registrados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Disciplinas más populares */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-secondary" />
                Talento por Disciplina
              </h3>
              <p className="text-[11px] text-muted-foreground">Distribución del catálogo de artistas</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Top Categorías
            </Badge>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disciplineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888888" />
                <YAxis tick={{ fontSize: 10 }} stroke="#888888" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Artistas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Acuerdos Colaborativos IA */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Tasa de Cierre de Acuerdos (Collab AI)
              </h3>
              <p className="text-[11px] text-muted-foreground">Planes completados vs en negociación</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {totalAgreements.data ?? 0} totales
            </Badge>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {totalAgreements.data && totalAgreements.data > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agreementsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {agreementsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <Sparkles className="w-6 h-6 text-muted-foreground mx-auto opacity-40" />
                <div>Los planes de colaboración se registrarán aquí conforme los artistas acuerden.</div>
              </div>
            )}
          </div>
        </div>

        {/* Acceso Rápido y Seguridad */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              Telemetría y Control de IPs
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supervisión de direcciones IP públicas, países, ciudades, dispositivos y páginas activas en vivo.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
                <span className="text-muted-foreground">Monitoreo WebSocket:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Activo
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
                <span className="text-muted-foreground">Geolocalización:</span>
                <span className="font-semibold text-foreground">Habilitada (ipapi + geo)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
                <span className="text-muted-foreground">Autenticación Maestra:</span>
                <span className="font-semibold text-primary">Gingerboy (Master Admin)</span>
              </div>
            </div>
          </div>

          <Link to="/admin/live" className="pt-2">
            <Button variant="outline" className="w-full text-xs font-semibold rounded-xl gap-2">
              Abrir Mapa y Lista de IPs en Tiempo Real →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
