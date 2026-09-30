import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface ClientGeoInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat?: number;
  lon?: number;
  isp?: string;
  device: string;
  browser: string;
  os: string;
  screenSize: string;
}

export interface LiveUserPresence extends ClientGeoInfo {
  sessionId: string;
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  discipline?: string | null;
  currentPath: string;
  onlineAt: string;
  lastPing: string;
}

const CACHE_KEY = "independent_client_geo_cache";

function getBrowserAndOS(): { browser: string; os: string; device: string } {
  if (typeof window === "undefined" || !navigator) {
    return { browser: "Desconocido", os: "Desconocido", device: "Desktop" };
  }
  const ua = navigator.userAgent;
  let os = "Otro OS";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac") && !ua.includes("iPhone") && !ua.includes("iPad")) os = "macOS";
  else if (ua.includes("iPhone")) os = "iOS (iPhone)";
  else if (ua.includes("iPad")) os = "iOS (iPad)";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  let browser = "Navegador";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const device = isMobile ? "Móvil / Tablet" : "Escritorio";

  return { browser, os, device };
}

export async function fetchClientGeo(): Promise<ClientGeoInfo> {
  const { browser, os, device } = getBrowserAndOS();
  const screenSize = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown";

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...parsed, screenSize, browser, os, device };
    }
  } catch {}

  // Intento 1: ipapi.co (muy completo con ciudad, país, coordenadas, ISP)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const d = await res.json();
      if (d.ip) {
        const info: ClientGeoInfo = {
          ip: d.ip,
          city: d.city || "Ciudad no detectada",
          region: d.region || "",
          country: d.country_name || d.country || "Desconocido",
          countryCode: d.country_code || "",
          lat: d.latitude,
          lon: d.longitude,
          isp: d.org || "",
          device,
          browser,
          os,
          screenSize,
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(info));
        } catch {}
        return info;
      }
    }
  } catch {}

  // Intento 2: freeipapi.com
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://freeipapi.com/api/json", { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const d = await res.json();
      if (d.ipAddress) {
        const info: ClientGeoInfo = {
          ip: d.ipAddress,
          city: d.cityName || "Ciudad no detectada",
          region: d.regionName || "",
          country: d.countryName || "Desconocido",
          countryCode: d.countryCode || "",
          lat: d.latitude,
          lon: d.longitude,
          device,
          browser,
          os,
          screenSize,
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(info));
        } catch {}
        return info;
      }
    }
  } catch {}

  // Intento 3: api.ipify.org (solo IP como último recurso)
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const d = await res.json();
      const info: ClientGeoInfo = {
        ip: d.ip,
        city: "En línea",
        region: "",
        country: "Conectado",
        countryCode: "",
        device,
        browser,
        os,
        screenSize,
      };
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(info));
      } catch {}
      return info;
    }
  } catch {}

  return {
    ip: "127.0.0.1",
    city: "Local",
    region: "",
    country: "Local",
    countryCode: "",
    device,
    browser,
    os,
    screenSize,
  };
}

let globalSessionId: string | null = null;
export function getOrCreateSessionId(): string {
  if (globalSessionId) return globalSessionId;
  try {
    const s = sessionStorage.getItem("independent_session_id");
    if (s) {
      globalSessionId = s;
      return s;
    }
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("independent_session_id", newId);
    globalSessionId = newId;
    return newId;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/**
 * Hook para transmitir presencia y telemetría en tiempo real hacia el panel de admin
 */
export function useRealtimeTelemetry(user?: any, profile?: any) {
  const location = useLocation();
  const channelRef = useRef<any>(null);
  const geoRef = useRef<ClientGeoInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    const sessionId = getOrCreateSessionId();

    async function init() {
      const geo = await fetchClientGeo();
      if (!mounted) return;
      geoRef.current = geo;

      const channel = supabase.channel("independent-live-monitor", {
        config: { presence: { key: sessionId } },
      });
      channelRef.current = channel;

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && mounted) {
          const payload: LiveUserPresence = {
            ...geo,
            sessionId,
            userId: user?.id || null,
            username: profile?.username || null,
            displayName: profile?.display_name || (user ? "Usuario" : "Visitante"),
            avatarUrl: profile?.avatar_url || null,
            discipline: profile?.discipline || null,
            currentPath: window.location.pathname,
            onlineAt: new Date().toISOString(),
            lastPing: new Date().toISOString(),
          };
          await channel.track(payload);
        }
      });
    }

    init();

    // Heartbeat cada 30 segundos
    const interval = setInterval(async () => {
      if (channelRef.current && geoRef.current) {
        const payload: LiveUserPresence = {
          ...geoRef.current,
          sessionId,
          userId: user?.id || null,
          username: profile?.username || null,
          displayName: profile?.display_name || (user ? "Usuario" : "Visitante"),
          avatarUrl: profile?.avatar_url || null,
          discipline: profile?.discipline || null,
          currentPath: window.location.pathname,
          onlineAt: new Date().toISOString(),
          lastPing: new Date().toISOString(),
        };
        try {
          await channelRef.current.track(payload);
        } catch {}
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {}
      }
    };
  }, [user?.id, profile?.username]);

  // Actualizar ruta actual cuando cambia de página
  useEffect(() => {
    if (channelRef.current && geoRef.current) {
      const sessionId = getOrCreateSessionId();
      const payload: LiveUserPresence = {
        ...geoRef.current,
        sessionId,
        userId: user?.id || null,
        username: profile?.username || null,
        displayName: profile?.display_name || (user ? "Usuario" : "Visitante"),
        avatarUrl: profile?.avatar_url || null,
        discipline: profile?.discipline || null,
        currentPath: location.pathname,
        onlineAt: new Date().toISOString(),
        lastPing: new Date().toISOString(),
      };
      channelRef.current.track(payload).catch(() => {});
    }
  }, [location.pathname]);
}
