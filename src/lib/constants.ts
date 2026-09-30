import { z } from "zod";

export const DISCIPLINES = [
  // Creadores & Redes
  { value: "influencer", label: "Creador de Contenido / Influencer", emoji: "📱", domain: "social" },
  { value: "streamer", label: "Streamer / Gaming", emoji: "🎮", domain: "gaming" },
  { value: "podcaster", label: "Podcaster / Media", emoji: "🎙️", domain: "media" },
  { value: "videographer", label: "Videógrafo / Filmmaker", emoji: "🎥", domain: "video" },
  { value: "photographer", label: "Fotógrafo/a", emoji: "📸", domain: "visual" },
  { value: "designer", label: "Diseñador / Director de Arte / 3D", emoji: "🎨", domain: "visual" },
  
  // Tech & Negocios
  { value: "tech_founder", label: "Developer / Tech Founder", emoji: "💻", domain: "tech" },
  { value: "marketing_agency", label: "Growth / Marketing & PR", emoji: "🚀", domain: "business" },
  { value: "brand_sponsor", label: "Marca / Sponsor / Empresa", emoji: "🏷️", domain: "business" },
  { value: "manager", label: "Manager / Representante", emoji: "📋", domain: "business" },

  // Estilo de Vida, Deporte & Bienestar
  { value: "fitness_coach", label: "Fitness, Deporte & Salud", emoji: "⚡", domain: "lifestyle" },
  { value: "stylist", label: "Moda / Estilista / Modelo", emoji: "👗", domain: "lifestyle" },
  { value: "culinary_creator", label: "Gastronomía / Foodie / Chef", emoji: "🍕", domain: "lifestyle" },

  // Música & Audio
  { value: "producer", label: "Productor Musical / Beatmaker", emoji: "🎛️", domain: "music" },
  { value: "singer", label: "Cantante / Vocalista", emoji: "🎤", domain: "music" },
  { value: "musician", label: "Músico / Instrumentista", emoji: "🎸", domain: "music" },
  { value: "songwriter", label: "Compositor / Letrista", emoji: "📝", domain: "music" },
  { value: "sound_engineer", label: "Ingeniero de Sonido / Mezcla", emoji: "🎚️", domain: "music" },
  { value: "record_label", label: "Sello Discográfico / A&R", emoji: "💿", domain: "music" },

  // Artes Escénicas & Educación
  { value: "actor", label: "Actor / Actriz", emoji: "🎭", domain: "arts" },
  { value: "dancer", label: "Bailarín / Coreógrafo", emoji: "💃", domain: "arts" },
  { value: "voice_actor", label: "Locutor / Actor de Voz", emoji: "🔊", domain: "media" },
  { value: "booking_agent", label: "Booking & Giras", emoji: "🎟️", domain: "business" },
  { value: "promoter", label: "Promotor de Eventos", emoji: "📢", domain: "business" },
  { value: "journalist", label: "Periodista / Redactor", emoji: "📰", domain: "media" },
  { value: "teacher", label: "Educador / Mentor", emoji: "🎓", domain: "education" },
  { value: "other", label: "Otro Talento / Creador", emoji: "✨", domain: "general" },
] as const;

export type Discipline = typeof DISCIPLINES[number]["value"];

export const zDiscipline = z.enum([
  "producer", "musician", "singer", "dancer",
  "designer", "sound_engineer", "manager", "songwriter",
  "videographer", "photographer", "promoter", "journalist",
  "teacher", "other",
  "booking_agent", "marketing_agency", "influencer",
  "brand_sponsor", "record_label", "actor", "voice_actor", "stylist",
  "streamer", "podcaster", "tech_founder", "fitness_coach", "culinary_creator"
]);

export const DOMAINS = [
  { id: "all", label: "Todos los dominios", emoji: "🌐" },
  { id: "social", label: "Redes & Creadores", emoji: "📱" },
  { id: "tech", label: "Tech, AI & Startups", emoji: "💻" },
  { id: "lifestyle", label: "Fitness, Moda & Salud", emoji: "✨" },
  { id: "visual", label: "Diseño, 3D & Fotografía", emoji: "🎨" },
  { id: "video", label: "Video, Cine & Animación", emoji: "🎥" },
  { id: "music", label: "Música & Audio", emoji: "🎵" },
  { id: "gaming", label: "Gaming & Streaming", emoji: "🎮" },
  { id: "business", label: "Marcas, Growth & Business", emoji: "🚀" },
  { id: "media", label: "Podcasts & Periodismo", emoji: "🎙️" },
] as const;

export const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", color: "#E1306C", prefix: "@" },
  { id: "tiktok", name: "TikTok", color: "#000000", prefix: "@" },
  { id: "youtube", name: "YouTube", color: "#FF0000", prefix: "@" },
  { id: "twitch", name: "Twitch", color: "#9146FF", prefix: "" },
  { id: "x", name: "X (Twitter)", color: "#1DA1F2", prefix: "@" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", prefix: "" },
  { id: "spotify", name: "Spotify", color: "#1DB954", prefix: "" },
  { id: "website", name: "Web / Portafolio", color: "#F59E0B", prefix: "https://" },
] as const;

export const COLLAB_OFFERINGS = [
  { id: "audience", label: "Audiencia y Alcance Viral", emoji: "📢" },
  { id: "production", label: "Producción Audiovisual / 4K", emoji: "🎬" },
  { id: "dev", label: "Desarrollo Web / App / IA", emoji: "💻" },
  { id: "design", label: "Diseño Visual y Branding", emoji: "🎨" },
  { id: "music_prod", label: "Producción Musical / Beat", emoji: "🎛️" },
  { id: "face_talent", label: "Presencia, Voz y Actuación", emoji: "🎭" },
  { id: "growth_strategy", label: "Estrategia de Ventas y Growth", emoji: "📈" },
  { id: "brand_budget", label: "Inversión y Presupuesto de Marca", emoji: "💰" },
  { id: "product_gifting", label: "Productos / Envíos a Creadores", emoji: "🎁" },
];

export const COLLAB_SEEKING = [
  { id: "cross_promo", label: "Intercambio de Audiencia (Cross-Promo)", emoji: "🤝" },
  { id: "co_brand", label: "Lanzar un Producto o Servicio Juntos", emoji: "🚀" },
  { id: "content_creator", label: "Creadores para Campaña de mi Marca", emoji: "📱" },
  { id: "tech_collab", label: "Socio Técnico / Desarrollador", emoji: "💻" },
  { id: "video_editor", label: "Videógrafo / Editor para mis Redes", emoji: "🎥" },
  { id: "podcast_guest", label: "Invitado a Podcast / Directo", emoji: "🎙️" },
  { id: "sponsorship", label: "Marcas interesadas en Patrocinio", emoji: "🏷️" },
  { id: "creative_collab", label: "Sesión Creativa Libre", emoji: "✨" },
];

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Iniciando / Creciendo" },
  { value: "intermediate", label: "Intermedio / Con Tracción" },
  { value: "pro", label: "Consolidado / Pro" },
] as const;

export const COMMON_GENRES = [
  "Tech & IA", "Startups", "Humor & Entretenimiento", "Fitness & Calistenia",
  "Moda & Streetwear", "Gaming & Esports", "Educación Financiera", "Lifestyle",
  "Cine & Series", "Fotografía Urbana", "Marketing Digital", "E-commerce",
  "Música Urbana", "Pop & Indie", "Electrónica", "Podcasts", "Gastronomía",
  "Viajes & Aventura", "Desarrollo Personal", "Diseño & 3D"
];

export const COMMON_SKILLS = [
  "TikTok / Reels virales", "Edición Premiere / CapCut", "Storytelling",
  "Comunidad activa", "Campañas con marcas", "Fotografía editorial",
  "Desarrollo Frontend", "IA generativa", "Branding de marcas",
  "Live streaming", "Organización de eventos", "Locución",
  "Co-branding", "Producción musical", "Mezcla y máster",
  "SEO y copywriting", "Growth hacking", "Dirección de arte",
];

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]["value"];

export const OFFICIAL_SUPPORT_USER_ID = "00000000-0000-0000-0000-000000000001";
export const OFFICIAL_APP_USER_ID = OFFICIAL_SUPPORT_USER_ID;

export const OFFICIAL_SUPPORT_PROFILE = {
  id: OFFICIAL_SUPPORT_USER_ID,
  display_name: "Panal Oficial",
  username: "panal",
  avatar_url: "/logo.png",
  discipline: "other" as const,
  bio: "Canal oficial de Panal. Conectando creadores, marcas y mentes brillantes en todos los dominios.",
  is_verified: true,
};
export const OFFICIAL_APP_PROFILE = OFFICIAL_SUPPORT_PROFILE;
