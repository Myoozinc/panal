import { DEMO_CREATORS } from "@/lib/demoData";
import type { Profile } from "@/types/independent";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

const STORAGE_SWIPES_KEY = "panal_local_swipes";
const STORAGE_MATCHES_KEY = "panal_local_matches";

export interface CollabPlan {
  id: string;
  conversationId: string;
  userAId: string;
  userBId: string;
  synergyType: "content_campaign" | "co_branding" | "cross_promo" | "sponsorship" | "custom";
  title: string;
  description: string;
  deliverablesA: string[];
  deliverablesB: string[];
  compensationType: "equal_split" | "rev_share" | "fixed_fee" | "cross_value";
  splitPercentage?: number;
  fixedAmount?: string;
  launchDate?: string;
  status: "draft" | "agreed" | "active" | "completed";
  updatedAt: string;
}

export class PanalService {
  /**
   * Obtiene los creadores para la pantalla de Match / Discover.
   * Si Firestore está configurado, busca en la colección 'profiles'.
   * Si no hay perfiles en la base o se está en modo prototipo, entrega los DEMO_CREATORS.
   */
  static async getDiscoverCreators(
    currentUserId?: string,
    filters?: {
      disciplines?: string[];
      city?: string;
      verifiedOnly?: boolean;
    }
  ): Promise<Profile[]> {
    let profiles: Profile[] = [];

    if (isFirebaseConfigured) {
      try {
        const colRef = collection(db, "profiles");
        let q = query(colRef, limit(30));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profiles = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile));
        }
      } catch (err) {
        console.warn("Firebase query failed, using demo creators fallback:", err);
      }
    }

    // Si la base está vacía o no hay perfiles, usamos el catálogo multi-dominio de demostración
    if (profiles.length === 0) {
      profiles = [...DEMO_CREATORS];
    }

    // Excluir al usuario actual si está en la lista
    if (currentUserId) {
      profiles = profiles.filter((p) => p.id !== currentUserId);
    }

    // Filtrar por disciplinas
    if (filters?.disciplines && filters.disciplines.length > 0) {
      profiles = profiles.filter(
        (p) => p.discipline && filters.disciplines!.includes(p.discipline)
      );
    }

    // Filtrar por ciudad
    if (filters?.city && filters.city.trim()) {
      const c = filters.city.toLowerCase().trim();
      profiles = profiles.filter(
        (p) => (p.city && p.city.toLowerCase().includes(c)) || (p.country && p.country.toLowerCase().includes(c))
      );
    }

    // Filtrar por verificados
    if (filters?.verifiedOnly) {
      profiles = profiles.filter((p) => p.is_verified);
    }

    return profiles;
  }

  /**
   * Registra un swipe (Like / Pass).
   */
  static async recordSwipe(
    swiperId: string,
    swipedId: string,
    direction: "like" | "pass"
  ): Promise<{ matched: boolean; targetProfile?: Profile }> {
    // Guardar en Firestore si está conectado
    if (isFirebaseConfigured) {
      try {
        const swipeId = `${swiperId}_${swipedId}`;
        await setDoc(doc(db, "swipes", swipeId), {
          swiper_id: swiperId,
          swiped_id: swipedId,
          direction,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Could not save swipe to Firestore:", e);
      }
    }

    // Guardar también en localStorage para persistencia instantánea en el prototipo
    const rawSwipes = localStorage.getItem(STORAGE_SWIPES_KEY);
    const swipes: Record<string, string> = rawSwipes ? JSON.parse(rawSwipes) : {};
    swipes[swipedId] = direction;
    localStorage.setItem(STORAGE_SWIPES_KEY, JSON.stringify(swipes));

    const targetProfile = DEMO_CREATORS.find((c) => c.id === swipedId);

    // En el prototipo, un swipe de "like" tiene una alta probabilidad de crear Match para probar la app
    const isMatch = direction === "like";

    if (isMatch && targetProfile) {
      const rawMatches = localStorage.getItem(STORAGE_MATCHES_KEY);
      const matches: Profile[] = rawMatches ? JSON.parse(rawMatches) : [];
      if (!matches.some((m) => m.id === targetProfile.id)) {
        matches.push(targetProfile);
        localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches));
      }
    }

    return { matched: isMatch, targetProfile };
  }

  /**
   * Obtiene los matches del usuario.
   */
  static async getMatches(userId: string): Promise<Profile[]> {
    const rawMatches = localStorage.getItem(STORAGE_MATCHES_KEY);
    const localMatches: Profile[] = rawMatches ? JSON.parse(rawMatches) : [];

    // Por defecto en prototipo aseguramos al menos 2 matches activos para que la pantalla de matches y chat no esté vacía
    if (localMatches.length === 0) {
      const initialMatches = [DEMO_CREATORS[0], DEMO_CREATORS[1]];
      localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(initialMatches));
      return initialMatches;
    }

    return localMatches;
  }

  /**
   * Obtiene o crea un plan de sinergia entre dos creadores.
   */
  static getCollabPlan(conversationId: string, userAId: string, userBId: string): CollabPlan {
    const key = `panal_plan_${conversationId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }

    const defaultPlan: CollabPlan = {
      id: `plan-${conversationId}`,
      conversationId,
      userAId,
      userBId,
      synergyType: "content_campaign",
      title: "Campaña Cruzada de Alto Impacto en Redes",
      description: "Co-creación de serie de videos cortos y mención mutua para transferir audiencias afines.",
      deliverablesA: [
        "1 Video Reel colaborativo en Instagram",
        "2 Menciones en Historias de Instagram con enlace directo",
      ],
      deliverablesB: [
        "1 Video TikTok con audio y formato de tendencia",
        "Participación o mención en directo / stream",
      ],
      compensationType: "cross_value",
      splitPercentage: 50,
      launchDate: "En 2 semanas",
      status: "draft",
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(defaultPlan));
    return defaultPlan;
  }

  /**
   * Guarda las modificaciones de un plan de sinergia.
   */
  static saveCollabPlan(plan: CollabPlan): void {
    const key = `panal_plan_${plan.conversationId}`;
    localStorage.setItem(key, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
  }
}
