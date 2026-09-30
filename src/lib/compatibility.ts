import { DISCIPLINES, type Discipline } from "@/lib/constants";
import type { Profile } from "@/types/independent";

export interface CompatibilityResult {
  score: number; // 62 - 98
  badgeLabel: string; // e.g. "🔥 94% Afinidad Alta"
  highlight: string; // e.g. "¡Buscan exactamente lo mismo!"
  reasons: string[]; // e.g. ["⚡ Búsqueda mutua: Busca vocalistas", ...]
  isHighAffinity: boolean; // score >= 85
  sharedGenres: string[];
}

const disciplineName = (d: string | null | undefined): string => {
  if (!d) return "artistas";
  const found = DISCIPLINES.find((x) => x.value === d);
  return found ? found.label.toLowerCase() : d;
};

/**
 * Calculates a rich compatibility margin between the logged in user and another profile.
 * Incorporates reciprocal discipline seeking, shared musical genres, complementary skills,
 * location proximity, and experience level.
 */
export function calculateCompatibility(
  me: Profile | null | undefined,
  candidate: Profile
): CompatibilityResult {
  if (!me) {
    return {
      score: 75,
      badgeLabel: "🎯 75% Afinidad",
      highlight: "Potencial para conectar",
      reasons: ["Descubre su perfil y propuesta artística"],
      isHighAffinity: false,
      sharedGenres: [],
    };
  }

  let points = 60; // Baseline encouragement margin
  const reasons: string[] = [];

  // 1. Reciprocal Discipline Seeking (Max ~38 pts)
  const candidateSeeksMe =
    !!me.discipline &&
    Array.isArray(candidate.looking_for) &&
    candidate.looking_for.includes(me.discipline);

  const meSeekCandidate =
    !!candidate.discipline &&
    Array.isArray(me.looking_for) &&
    me.looking_for.includes(candidate.discipline);

  if (candidateSeeksMe && meSeekCandidate) {
    points += 38;
    reasons.push(
      `⚡ Búsqueda mutua: Busca ${disciplineName(me.discipline)} y tú buscas ${disciplineName(candidate.discipline)}`
    );
  } else if (candidateSeeksMe) {
    points += 22;
    reasons.push(`⚡ Busca ${disciplineName(me.discipline)} para colaborar`);
  } else if (meSeekCandidate) {
    points += 18;
    reasons.push(`🎯 Coincide con tu búsqueda de ${disciplineName(candidate.discipline)}`);
  }

  // 2. Shared Musical Genres (Max ~18 pts)
  const meGenres = (me.genres ?? []).map((g) => g.trim().toLowerCase());
  const candGenres = (candidate.genres ?? []).map((g) => g.trim().toLowerCase());
  const sharedGenres = (candidate.genres ?? []).filter((g) =>
    meGenres.includes(g.trim().toLowerCase())
  );

  if (sharedGenres.length >= 3) {
    points += 18;
    reasons.push(`🎵 ${sharedGenres.length} géneros en común: ${sharedGenres.slice(0, 3).join(", ")}`);
  } else if (sharedGenres.length === 2) {
    points += 14;
    reasons.push(`🎵 Coinciden en ${sharedGenres.join(" y ")}`);
  } else if (sharedGenres.length === 1) {
    points += 9;
    reasons.push(`🎵 Ambos hacen ${sharedGenres[0]}`);
  }

  // 3. Shared or Complementary Skills (Max ~10 pts)
  const meSkills = (me.skills ?? []).map((s) => s.trim().toLowerCase());
  const candSkills = (candidate.skills ?? []).map((s) => s.trim().toLowerCase());
  const sharedSkills = (candidate.skills ?? []).filter((s) =>
    meSkills.includes(s.trim().toLowerCase())
  );

  if (sharedSkills.length > 0) {
    points += 8;
    reasons.push(`🎹 Habilidades afines: ${sharedSkills.slice(0, 2).join(", ")}`);
  }

  // 4. Location Proximity (Max ~8 pts)
  if (
    me.city &&
    candidate.city &&
    me.city.trim().toLowerCase() === candidate.city.trim().toLowerCase()
  ) {
    points += 8;
    reasons.push(`📍 Misma ciudad: ${candidate.city}`);
  } else if (
    me.country &&
    candidate.country &&
    me.country.trim().toLowerCase() === candidate.country.trim().toLowerCase()
  ) {
    points += 4;
    reasons.push(`🌍 Mismo país: ${candidate.country}`);
  }

  // 5. Experience Level Match (Max ~5 pts)
  if (me.experience_level && candidate.experience_level) {
    if (me.experience_level === candidate.experience_level) {
      points += 5;
    } else {
      points += 2;
    }
  }

  // Cap between 62% and 98%
  const score = Math.min(Math.max(points, 62), 98);

  let badgeLabel = `🎯 ${score}% Compatibles`;
  let highlight = "Potencial para conectar y colaborar";

  if (score >= 90) {
    badgeLabel = `🔥 ${score}% Afinidad Alta`;
    highlight = "¡Buscan lo mismo y sus estilos encajan a la perfección!";
  } else if (score >= 80) {
    badgeLabel = `✨ ${score}% Gran Match`;
    highlight = "Gran afinidad musical y roles complementarios";
  } else if (score >= 70) {
    badgeLabel = `🎯 ${score}% Buena Conexión`;
    highlight = "Buenas coincidencias para crear un proyecto juntos";
  } else {
    badgeLabel = `💡 ${score}% Compatibilidad`;
    highlight = "Oportunidad de explorar estilos complementarios";
  }

  if (reasons.length === 0) {
    if (candidate.discipline) {
      reasons.push(`Perfil de ${disciplineName(candidate.discipline)} activo en Independent`);
    } else {
      reasons.push("Propuesta artística para explorar y colaborar");
    }
  }

  return {
    score,
    badgeLabel,
    highlight,
    reasons,
    isHighAffinity: score >= 85,
    sharedGenres,
  };
}
