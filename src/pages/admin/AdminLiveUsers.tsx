import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  Radio,
  Search,
  Laptop,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Users,
  RefreshCw,
  Compass,
  Activity,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { LiveUserPresence } from "@/lib/telemetry";

export const AdminLiveUsers = () => {
  const { toast } = useToast();
  const [liveSessions, setLiveSessions] = useState<LiveUserPresence[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Suscripción al canal Supabase Realtime Presence
  useEffect(() => {
    const channel = supabase.channel("panal-live-monitor");

    const syncPresence = () => {
      const state = channel.presenceState<LiveUserPresence>();
      const all: LiveUserPresence[] = [];
      Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (Array.isArray(presences) && presences.length > 0) {
          all.push(presences[presences.length - 1]);
        }
      });
      setLiveSessions(all);
      setLastSync(new Date());
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // También consultar usuarios registrados con datos geográficos de base de datos
  const { data: dbProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-geo-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, discipline, city, country, updated_at, created_at, is_verified")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIp(text);
      toast({ title: "Copiado", description: `${label} copiada al portapapeles.` });
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  // Filtrado de sesiones en vivo
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return liveSessions;
    const q = searchTerm.toLowerCase();
    return liveSessions.filter((s) => {
      return (
        s.ip?.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.currentPath?.toLowerCase().includes(q)
      );
    });
  }, [liveSessions, searchTerm]);

  // Métricas rápidas
  const uniqueCountries = useMemo(() => {
    const set = new Set(liveSessions.map((s) => s.country).filter(Boolean));
    return set.size;
  }, [liveSessions]);

  const mobileCount = useMemo(() => {
    return liveSessions.filter((s) => s.device?.includes("Móvil")).length;
  }, [liveSessions]);

  const desktopCount = liveSessions.length - mobileCount;

  return (
    <div className="space-y-6">
      {/* Header en Vivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Telemetría y Conexiones en Tiempo Real
            </h2>
            <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
              Live Presence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoreo en vivo de direcciones IP, geolocalización, dispositivos y páginas activas de los usuarios.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Sincronizado: {lastSync.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Cards de Métricas en Vivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/40 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>En línea ahora</span>
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {liveSessions.length}
          </div>
          <div className="text-[11px] text-emerald-500 font-medium">
            {liveSessions.length > 0 ? "🟢 Tráfico activo" : "Sin conexiones activas"}
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Países conectados</span>
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {uniqueCountries}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Regiones geográficas
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Móviles / Tablets</span>
            <Smartphone className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {mobileCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Dispositivos táctiles
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Escritorio</span>
            <Laptop className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {desktopCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Laptops y PCs
          </div>
        </div>
      </div>

      {/* Buscador de conexiones */}
      <div className="flex items-center gap-2 bg-card border border-border/40 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Buscar por IP, usuario, ciudad, país o ruta (/discover, /chat)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none bg-transparent h-7 text-xs focus-visible:ring-0 shadow-none px-1"
        />
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-6 text-xs px-2">
            Limpiar
          </Button>
        )}
      </div>

      {/* Lista de Conexiones Activas en Vivo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Sesiones Activas en Tiempo Real ({filteredSessions.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            Actualización continua vía WebSockets
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-card border border-border/40 rounded-2xl p-8 text-center space-y-2">
            <Radio className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <div className="text-sm font-semibold">No hay sesiones activas en este instante</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cuando los usuarios naveguen por la aplicación, sus IPs, ubicación geográfica y pantalla activa aparecerán aquí al segundo.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {filteredSessions.map((session, idx) => (
              <div
                key={session.sessionId || idx}
                className="bg-card border border-border/60 hover:border-primary/50 transition-all rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-2.5">
                  {/* Usuario */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-9 h-9 border border-border/40">
                      <AvatarImage src={session.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {session.displayName?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5 truncate">
                        <span className="truncate">{session.displayName || "Visitante"}</span>
                        {session.username && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            @{session.username}
                          </span>
                        )}
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="En línea ahora" />
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {session.discipline ? `Disciplina: ${session.discipline}` : "Navegación general"}
                      </div>
                    </div>
                  </div>

                  {/* Dirección IP y Copiar */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted/60 border border-border/50 rounded-lg px-2.5 py-1 text-xs font-mono">
                      <span className="text-muted-foreground text-[10px] uppercase font-sans font-semibold">IP:</span>
                      <span className="font-bold text-foreground">{session.ip || "127.0.0.1"}</span>
                      <button
                        onClick={() => copyToClipboard(session.ip, "Dirección IP")}
                        className="ml-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Copiar IP"
                      >
                        {copiedIp === session.ip ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalles de Ubicación, Dispositivo y Pantalla */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Ubicación */}
                  <div className="flex items-start gap-2 bg-background/50 rounded-lg p-2 border border-border/30">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Ubicación</span>
                      <span className="font-semibold text-foreground truncate block">
                        {session.city ? `${session.city}, ` : ""}{session.country || "Desconocido"}
                      </span>
                      {session.isp && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          Red: {session.isp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dispositivo y Sistema */}
                  <div className="flex items-start gap-2 bg-background/50 rounded-lg p-2 border border-border/30">
                    {session.device?.includes("Móvil") ? (
                      <Smartphone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <Laptop className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Dispositivo / SO</span>
                      <span className="font-semibold text-foreground truncate block">
                        {session.os} · {session.browser}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        Pantalla: {session.screenSize || "Estándar"}
                      </span>
                    </div>
                  </div>

                  {/* Pantalla / Ruta Actual */}
                  <div className="flex items-start gap-2 bg-background/50 rounded-lg p-2 border border-border/30">
                    <Compass className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Página Activa</span>
                      <span className="font-semibold text-primary font-mono text-[11px] truncate block">
                        {session.currentPath || "/"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Conectado: {new Date(session.onlineAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ubicaciones de Usuarios Registrados en Base de Datos */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Directorio Geográfico de Usuarios ({dbProfiles.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Ubicaciones registradas y declaradas por los artistas en sus perfiles
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Disciplina</th>
                  <th className="py-2.5 px-3">Ciudad / País</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {dbProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{p.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {p.display_name || "Sin nombre"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          @{p.username || "sin_usuario"}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {p.discipline || "General"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span>{p.city ? `${p.city}, ` : ""}{p.country || "No especificado"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {p.is_verified ? (
                        <span className="text-[10px] text-emerald-500 font-semibold">Verificado ✓</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Estándar</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to={`/admin/users/${p.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          Ver <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveUsers;
