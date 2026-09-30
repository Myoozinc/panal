// Edge function: collab-ai
// Drives the AI-guided casual collaboration plan between two matched users.
// Structured around 6 clear sequential phases:
// Phase 0: Qué buscan (intenciones iniciales)
// Phase 1: Quién hace qué (roles y aportes concretos)
// Phase 2: Cómo se reparte (splits de regalías y dinero)
// Phase 3: Plazos (demos y fechas clave)
// Phase 4: Créditos (reconocimiento y plataformas)
// Phase 5: Si algo cambia (revisiones y flexibilidad)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const PLAN_FIELDS = [
  { key: "que_buscan", stepNum: 0, label: "Qué buscan", emoji: "🎯" },
  { key: "quien_hace_que", stepNum: 1, label: "Quién hace qué", emoji: "👥" },
  { key: "reparto", stepNum: 2, label: "Cómo se reparte", emoji: "⚖️" },
  { key: "plazos", stepNum: 3, label: "Plazos", emoji: "⏱️" },
  { key: "creditos", stepNum: 4, label: "Créditos", emoji: "🏷️" },
  { key: "si_algo_cambia", stepNum: 5, label: "Si algo cambia", emoji: "💬" },
] as const;

export type FieldKey = typeof PLAN_FIELDS[number]["key"];

export const FIELD_LABELS: Record<FieldKey, string> = {
  que_buscan: "Qué buscan",
  quien_hace_que: "Quién hace qué (roles y entregables)",
  reparto: "Cómo se reparte (splits de regalías y ganancias)",
  plazos: "Plazos (demos y fechas estimadas)",
  creditos: "Créditos oficiales (Spotify, portada y redes)",
  si_algo_cambia: "Si algo cambia (revisiones y flexibilidad)",
};

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return fallback;
  }
}

const ROLE_GUIDANCE: Record<string, string> = {
  productor: "Productor musical. Enfoca: beat, arreglos, BPM/tonalidad, stems, mezcla, splits de máster.",
  cantante: "Cantante/vocalista. Enfoca: melodías, letras, tomas vocales, stems en seco/mojado, splits de autoría.",
  compositor: "Compositor/letrista. Enfoca: temática, letra, armonía, publishing splits, registro de obras.",
  instrumentista: "Músico instrumentista. Enfoca: instrumento grabado, tomas en alta fidelidad, créditos, tarifa o split.",
  disenador: "Diseñador visual. Enfoca: portada del single/álbum, formatos para Spotify/Apple Music, banners de redes.",
  ingeniero_sonido: "Técnico de sonido/mezcla. Enfoca: mezcla analógica/digital, mastering para plataformas, stems.",
  manager: "Manager. Enfoca: estrategia de lanzamiento, acuerdos comerciales, distribución, contactos.",
  videografo: "Videógrafo/filmmaker. Enfoca: videoclip, visualizer, reels/TikToks promocionales, rodaje, edición.",
  fotografo: "Fotógrafo. Enfoca: fotos de prensa, cover art, sesión de imagen promocional.",
  promotor: "Promotor. Enfoca: fechas de shows, difusión en medios, pauta y venta de tickets.",
  booking_agent: "Booking / Agente. Enfoca: fechas de presentaciones en vivo, fee por concierto, rider técnico.",
  marketing_agency: "Agencia de Marketing / PR. Enfoca: campaña de lanzamiento, prensa, playlists, redes sociales.",
  influencer: "Influencer / Creador. Enfoca: video con audio oficial en TikTok/Instagram, alcance, menciones de perfil.",
  brand_sponsor: "Marca / Sponsor. Enfoca: patrocinio, presencia de marca en video o lanzamiento, exclusividad.",
  record_label: "Sello Discográfico / A&R. Enfoca: contrato de distribución o máster, inversión, plan promocional.",
  actor: "Actor / Actriz. Enfoca: actuación en videoclip o material narrativo audiovisual, jornadas de rodaje.",
  voice_actor: "Actor de voz / Locutor. Enfoca: locución, narración o intro del tema, uso no clonable.",
  stylist: "Estilista / Moda. Enfoca: concepto visual de vestuario, outfits para videoclip o sesión de fotos.",
  otro: "Colaborador creativo. Enfoca: aporte concreto, plazos, créditos y splits correspondientes.",
};

function normalizeRole(raw?: string | null): string {
  const r = (raw ?? "").toLowerCase();
  if (r.includes("produc")) return "productor";
  if (r.includes("cant") || r.includes("vocal") || r.includes("singer")) return "cantante";
  if (r.includes("compos") || r.includes("letr") || r.includes("songwriter")) return "compositor";
  if (r.includes("instrum") || r.includes("music") || r.includes("guitar") || r.includes("piano") || r.includes("bater") || r.includes("bass")) return "instrumentista";
  if (r.includes("design") || r.includes("diseñ") || r.includes("disen") || r.includes("art")) return "disenador";
  if (r.includes("sound") || r.includes("ingenier") || r.includes("mix") || r.includes("master") || r.includes("sonido")) return "ingeniero_sonido";
  if (r.includes("booking") || r.includes("gira") || r.includes("tour")) return "booking_agent";
  if (r.includes("market") || r.includes("agencia") || r.includes("pr") || r.includes("prensa")) return "marketing_agency";
  if (r.includes("influenc") || r.includes("creador")) return "influencer";
  if (r.includes("brand") || r.includes("marca") || r.includes("sponsor") || r.includes("patrocin")) return "brand_sponsor";
  if (r.includes("label") || r.includes("sello") || r.includes("discogr") || r.includes("a&r")) return "record_label";
  if (r.includes("voice") || r.includes("voz") || r.includes("doblaje") || r.includes("locut")) return "voice_actor";
  if (r.includes("actor") || r.includes("actriz") || r.includes("dramat")) return "actor";
  if (r.includes("stylist") || r.includes("estilist") || r.includes("moda") || r.includes("vestuar")) return "stylist";
  if (r.includes("manager") || r.includes("management")) return "manager";
  if (r.includes("video") || r.includes("film") || r.includes("cine")) return "videografo";
  if (r.includes("photo") || r.includes("fot")) return "fotografo";
  if (r.includes("promo")) return "promotor";
  return "otro";
}

// Call AI with a 9-second timeout. If it fails, fallback is used gracefully without throwing 500
async function callAI(messages: Array<{ role: string; content: string }>, jsonMode = true): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("Missing LOVABLE_API_KEY");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI gateway error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// Generador semántico contextualizado por fase y disciplinas (respaldo de alta fidelidad)
function generateContextualPhaseQuestion(
  field: FieldKey,
  nameA: string,
  roleA: string,
  nameB: string,
  roleB: string,
  targetName: string,
  targetRole: string
): { question: string; options: string[]; allow_free_text: boolean } {
  const otherName = targetName === nameA ? nameB : nameA;

  if (field === "quien_hace_que") {
    let question = `📌 **Fase 1 de 5: Quién hace qué**\nPara que la colaboración con ${otherName} empiece con buen pie: ¿cómo se dividirán los entregables técnicos y creativos?`;
    let options = [
      `${targetName} produce la instrumental y mezcla; ${otherName} graba voces/melodía`,
      `Trabajo conjunto presencial en estudio (composición y producción simultánea)`,
      `Envío de stems de audio a distancia para revisión y mezcla final`,
      `Definir roles específicos según avance el primer borrador`,
    ];

    if (targetRole === "productor" || roleA === "productor" || roleB === "productor") {
      options = [
        `Producción del beat y mezcla completa a cargo del productor`,
        `Entrega de stems por pistas separadas (WAV 24-bit) para grabar voces`,
        `Grabación de voces en estudio y mezcla conjunta`,
        `Colaboración remota: beat listo, envío de referencias vocales`,
      ];
    } else if (targetRole === "disenador" || roleA === "disenador" || roleB === "disenador") {
      question = `📌 **Fase 1 de 5: Quién hace qué**\nPara coordinar el arte visual con la música de ${otherName}: ¿cuáles serán los entregables principales?`;
      options = [
        `Diseño de portada oficial para Spotify / Apple Music (3000x3000px)`,
        `Pack completo: portada + visualizer en loop para Spotify Canvas`,
        `Banners promocionales para Instagram, YouTube y redes sociales`,
        `Concepto visual integral y dirección de arte del lanzamiento`,
      ];
    } else if (targetRole === "videografo" || roleA === "videografo" || roleB === "videografo") {
      question = `📌 **Fase 1 de 5: Quién hace qué**\nPara planificar el material visual: ¿qué formato audiovisual desarrollarán?`;
      options = [
        `Videoclip oficial con 1 o 2 jornadas de rodaje y edición final`,
        `Visualizer cinematográfico en estudio o locación urbana`,
        `Pack de 3 teasers en formato vertical (Reels/TikTok) para el pre-save`,
        `Cobertura tras cámaras (making of) y fotos de rodaje`,
      ];
    }

    return { question, options, allow_free_text: true };
  }

  if (field === "reparto") {
    const question = `⚖️ **Fase 2 de 5: Cómo se reparte (Splits y Regalías)**\nPara que las cuentas queden claras desde el día uno: ¿cómo plantean dividir los ingresos y porcentajes de derechos de la colaboración?`;
    const options = [
      `50% / 50% división equitativa en plataformas y regalías`,
      `60% productor / 40% intérprete (según aporte creativo)`,
      `Tarifa fija única por servicio (sin reclamo de regalías futuras)`,
      `50% publishing (composición) y 50% máster en distribuidora`,
    ];
    return { question, options, allow_free_text: true };
  }

  if (field === "plazos") {
    const question = `⏱️ **Fase 3 de 5: Plazos y Fechas Clave**\n¿Qué calendario o tiempos estiman para tener lista la primera maqueta o avance tangible?`;
    const options = [
      `Primer demo o maqueta en 1 semana`,
      `Avance con voces o mezcla en 2 semanas`,
      `Producción final terminada en 1 mes`,
      `Sin fecha límite estricta, coordinar según inspiración`,
    ];
    return { question, options, allow_free_text: true };
  }

  if (field === "creditos") {
    const question = `🏷️ **Fase 4 de 5: Créditos y Reconocimiento**\n¿Cómo prefieren figurar oficialmente en Spotify, plataformas digitales y redes sociales?`;
    const options = [
      `${nameA} & ${nameB} (Co-artistas principales en el título)`,
      `Artista Principal feat. Colaborador`,
      `Mención explícita en portada y descripción ("Prod. by ...")`,
      `Etiquetado mutuo obligatorio en Instagram, TikTok y YouTube`,
    ];
    return { question, options, allow_free_text: true };
  }

  if (field === "si_algo_cambia") {
    const question = `💬 **Fase 5 de 5: Si algo cambia (Cláusula de Flexibilidad)**\nPara proteger la buena relación creativa si surge algún imprevisto o cambio de planes: ¿cómo lo resuelven?`;
    const options = [
      `Hasta 3 rondas de revisiones o ajustes en el track/diseño`,
      `Si en 30 días no hay avance, el proyecto se suspende cordialmente`,
      `Cualquier cambio de rumbo se conversa y renegocia por chat`,
      `Flexibilidad total basada en la confianza y el buen rollo`,
    ];
    return { question, options, allow_free_text: true };
  }

  return {
    question: `Para el punto de ${FIELD_LABELS[field]}, ¿cómo prefieren coordinarlo?`,
    options: ["Conversarlo por chat", "Definir según avance", "Acordar ahora", "Dejarlo abierto"],
    allow_free_text: true,
  };
}

async function translateIntentsCross(
  nameA: string, roleA: string, rawA: string,
  nameB: string, roleB: string, rawB: string
) {
  const fallback = {
    translated_a: rawA || "Crear algo de gran nivel y conectar con nuevas audiencias.",
    translated_b: rawB || "Crear algo de gran nivel y conectar con nuevas audiencias.",
    balance_note: "Ambos buscan potenciar su alcance y aportar lo mejor de su disciplina al proyecto.",
  };

  try {
    const sys = `Eres un copiloto y facilitador experto en la industria musical y creativa.
Convierte la expresión libre de dos colaboradores en un resumen CORTO (1 frase concisa por persona) sobre lo que busca cada uno.
Además, genera una frase casual y empática ("balance_note") que explique cómo se complementan.

Devuelve SOLO JSON:
{
  "translated_a": "...",
  "translated_b": "...",
  "balance_note": "<1 frase casual explicando cómo equilibrar lo que ambos buscan>"
}`;

    const userPrompt = `${nameA} (${roleA}) escribió: "${rawA}"
${nameB} (${roleB}) escribió: "${rawB}"
Traduce y sintetiza en JSON.`;

    const raw = await callAI([{ role: "system", content: sys }, { role: "user", content: userPrompt }]);
    return parseJSON<{ translated_a: string; translated_b: string; balance_note: string }>(raw, fallback);
  } catch (err) {
    console.warn("translateIntentsCross AI fallback used:", err);
    return fallback;
  }
}

async function loadAgreement(supabase: any, agreementId: string) {
  const { data: agreement, error } = await supabase.from("collab_agreements").select("*").eq("id", agreementId).single();
  if (error || !agreement) throw new Error("Agreement not found");
  const { data: msgs } = await supabase.from("collab_agreement_messages").select("*").eq("agreement_id", agreementId).order("created_at", { ascending: true });
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, discipline").in("id", [agreement.user_a, agreement.user_b]);
  const profileA = profiles?.find((p: any) => p.id === agreement.user_a) ?? { display_name: "Usuario A", discipline: null };
  const profileB = profiles?.find((p: any) => p.id === agreement.user_b) ?? { display_name: "Usuario B", discipline: null };
  return { agreement, msgs: (msgs ?? []), profileA, profileB };
}

// Armar la tarjeta final de colaboración compartida
async function buildCard(
  supabase: any,
  agreementId: string,
  agreement: any,
  msgs: any[],
  profileA: any,
  profileB: any
) {
  const nameA = profileA.display_name;
  const nameB = profileB.display_name;
  const summary = agreement.agreement_summary || {};
  const draft = summary.draft_fields || {};

  const transcript = msgs
    .filter((m: any) => m.message_type === "question" || m.message_type === "answer" || m.message_type === "intent_answer")
    .map((m: any) => {
      const who = m.for_user_id === agreement.user_a || m.sender_id === agreement.user_a ? nameA : nameB;
      if (m.message_type === "question") return `Copiloto a ${who}: ${m.content}`;
      if (m.message_type === "intent_answer") return `${who} busca: ${m.content}`;
      return `${who} acordó: ${m.selected_option ? `[${m.selected_option}] ` : ""}${m.content}`;
    })
    .join("\n");

  const fallbackCard = {
    title: `${nameA} x ${nameB} · Plan de Colaboración`,
    que_buscan: {
      [nameA]: agreement.intent_translated_a || agreement.intent_a || "Crear música y conectar",
      [nameB]: agreement.intent_translated_b || agreement.intent_b || "Crear música y conectar",
    },
    quien_hace_que: draft.quien_hace_que || "Roles complementarios acordados entre ambos.",
    coincidencias: summary.balance_note || "Ambos buscan potenciar su alcance y aportar lo mejor de su disciplina.",
    reparto: draft.reparto || "50% / 50% en plataformas y regalías acordadas.",
    plazos: draft.plazos || "Demo en 2 semanas · calendario coordinado por chat.",
    creditos: draft.creditos || `${nameA} & ${nameB} acreditados mutuamente en todas las plataformas.`,
    si_algo_cambia: draft.si_algo_cambia || "Hasta 3 revisiones · cualquier cambio se conversa aquí en el chat.",
  };

  let cardData = fallbackCard;
  try {
    const sys = `Eres un copiloto experto de la industria musical. Genera una tarjeta de colaboración amigable, clara y profesional entre ${nameA} y ${nameB}.
Basado en lo acordado por ambos en las 5 fases del plan:
${JSON.stringify(draft, null, 2)}

Devuelve SOLO JSON:
{
  "title": "${nameA} x ${nameB} · Plan de Colaboración",
  "que_buscan": {
    "${nameA}": "...",
    "${nameB}": "..."
  },
  "quien_hace_que": "...",
  "coincidencias": "...",
  "reparto": "...",
  "plazos": "...",
  "creditos": "...",
  "si_algo_cambia": "..."
}`;

    const userPrompt = `Conversación:\n${transcript}\n\nGenera la tarjeta final consolidada.`;
    const raw = await callAI([{ role: "system", content: sys }, { role: "user", content: userPrompt }]);
    const parsed = parseJSON<any>(raw, null);
    if (parsed && parsed.reparto) {
      cardData = { ...fallbackCard, ...parsed };
    }
  } catch (err) {
    console.warn("buildCard AI fallback used:", err);
  }

  const formattedDoc = `# ${cardData.title}

### 🎯 Lo que buscan
- **${nameA}**: ${cardData.que_buscan?.[nameA] || agreement.intent_translated_a || ""}
- **${nameB}**: ${cardData.que_buscan?.[nameB] || agreement.intent_translated_b || ""}

### 🤝 Dónde coinciden
${cardData.coincidencias || summary.balance_note || "Alineados en crear un proyecto de alta calidad."}

### 👥 Quién hace qué
${cardData.quien_hace_que || draft.quien_hace_que || "Roles definidos por acuerdo mutuo."}

### ⚖️ Cómo se reparte
${cardData.reparto || draft.reparto || "50/50 equitativo."}

### ⏱️ Plazos y Entregas
${cardData.plazos || draft.plazos || "A coordinar según avance del demo."}

### 🏷️ Créditos Oficiales
${cardData.creditos || draft.creditos || "Crédito mutuo en portada y plataformas digitales."}

### 💬 Si algo no cuadra
${cardData.si_algo_cambia || draft.si_algo_cambia || "Cualquier ajuste se conversa directamente aquí mismo con el copiloto."}
`;

  const updatedSummary = {
    ...summary,
    card: cardData,
    fields_status: {
      que_buscan: "listo",
      quien_hace_que: "listo",
      reparto: "listo",
      plazos: "listo",
      creditos: "listo",
      si_algo_cambia: "listo",
    },
    draft_fields: {
      ...draft,
      que_buscan: `${nameA}: ${cardData.que_buscan?.[nameA] || ""} | ${nameB}: ${cardData.que_buscan?.[nameB] || ""}`,
      quien_hace_que: cardData.quien_hace_que,
      reparto: cardData.reparto,
      plazos: cardData.plazos,
      creditos: cardData.creditos,
      si_algo_cambia: cardData.si_algo_cambia,
    },
  };

  await supabase.from("collab_agreements").update({
    agreement_document: formattedDoc,
    agreement_summary: updatedSummary,
    status: "pending_acceptance",
    accepted_by_a: false,
    accepted_by_b: false,
  }).eq("id", agreementId);

  const { data: inserted } = await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId,
    sender_id: null,
    sender_role: "ai",
    message_type: "agreement",
    content: formattedDoc,
    metadata: { title: cardData.title, card: cardData },
  }).select().single();

  return { message: inserted, finalized: true, card: cardData };
}

// Orquestador secuencial de fases (Maneja las 5 fases claramente y guarda el avance en tiempo real)
async function handleNextField(supabase: any, userId: string, agreementId: string) {
  const { agreement, msgs, profileA, profileB } = await loadAgreement(supabase, agreementId);
  if (agreement.user_a !== userId && agreement.user_b !== userId) throw new Error("Not a member");

  const nameA = profileA.display_name;
  const nameB = profileB.display_name;

  // Actualizar roles de disciplina si no estuvieran registrados
  if (!agreement.user_a_role || !agreement.user_b_role) {
    const upd: any = {};
    if (!agreement.user_a_role) upd.user_a_role = profileA.discipline ?? "otro";
    if (!agreement.user_b_role) upd.user_b_role = profileB.discipline ?? "otro";
    await supabase.from("collab_agreements").update(upd).eq("id", agreementId);
    Object.assign(agreement, upd);
  }

  const roleA = normalizeRole(agreement.user_a_role);
  const roleB = normalizeRole(agreement.user_b_role);

  // Fase 0: Preguntas privadas de intención
  const aHasIntent = !!agreement.intent_a;
  const bHasIntent = !!agreement.intent_b;
  const aHasPrompt = msgs.some((m: any) => m.message_type === "intent_prompt" && m.for_user_id === agreement.user_a);
  const bHasPrompt = msgs.some((m: any) => m.message_type === "intent_prompt" && m.for_user_id === agreement.user_b);

  const introText = (name: string) =>
    `¡Hola ${name}! 🎵 Soy tu copiloto para armar este plan de colaboración. Antes de definir detalles técnicos, cuéntame con total libertad: **¿qué buscas o esperas lograr con esta colaboración?** (ganar seguidores, hacer networking, lanzar tu primer tema, monetizar, etc.). Lo traduciré de forma empática para que ambos sintonicen desde el inicio. ✨`;

  if (!aHasPrompt || !bHasPrompt) {
    if (!aHasPrompt) {
      await supabase.from("collab_agreement_messages").insert({
        agreement_id: agreementId, sender_id: null, sender_role: "ai",
        message_type: "intent_prompt", content: introText(nameA),
        for_user_id: agreement.user_a, metadata: { allow_free_text: true, open: true, field: "que_buscan" },
      });
    }
    if (!bHasPrompt) {
      await supabase.from("collab_agreement_messages").insert({
        agreement_id: agreementId, sender_id: null, sender_role: "ai",
        message_type: "intent_prompt", content: introText(nameB),
        for_user_id: agreement.user_b, metadata: { allow_free_text: true, open: true, field: "que_buscan" },
      });
    }
    return { waiting: true, reason: "intent_prompts_created" };
  }

  // Si alguno aún no ha respondido su intención, esperar
  if (!aHasIntent || !bHasIntent) {
    return { waiting: true, reason: "waiting_intent" };
  }

  const summary = agreement.agreement_summary || {};
  const fieldsStatus: Record<string, string> = summary.fields_status || {
    que_buscan: "listo",
    quien_hace_que: "vacio",
    reparto: "vacio",
    plazos: "vacio",
    creditos: "vacio",
    si_algo_cambia: "vacio",
  };
  const draftFields = summary.draft_fields || {};

  // Determinar fases pendientes en orden estricto
  const sequentialPhases: FieldKey[] = ["quien_hace_que", "reparto", "plazos", "creditos", "si_algo_cambia"];
  const pendingFields = sequentialPhases.filter((f) => fieldsStatus[f] !== "listo");

  // Si todas las fases están listas, construir la tarjeta final
  if (pendingFields.length === 0) {
    return await buildCard(supabase, agreementId, agreement, msgs, profileA, profileB);
  }

  // Verificar si hay una pregunta pendiente sin responder por el usuario asignado
  const lastQuestion = [...msgs].reverse().find((m: any) => m.message_type === "question");
  if (lastQuestion) {
    const answered = msgs.some(
      (m: any) => m.message_type === "answer" && new Date(m.created_at) >= new Date(lastQuestion.created_at)
    );
    if (!answered) {
      return { waiting: true, waiting_for: lastQuestion.for_user_id, question: lastQuestion };
    }
  }

  // Tomamos la siguiente fase en orden
  const currentField = pendingFields[0];

  // Alternar al usuario que responderá para equilibrar la participación de ambos
  const answersA = msgs.filter((m: any) => m.message_type === "answer" && m.for_user_id === agreement.user_a).length;
  const answersB = msgs.filter((m: any) => m.message_type === "answer" && m.for_user_id === agreement.user_b).length;
  const askA = answersA <= answersB;
  const targetId = askA ? agreement.user_a : agreement.user_b;
  const targetName = askA ? nameA : nameB;
  const targetRole = askA ? roleA : roleB;

  // Generador contextual de respaldo
  const fallback = generateContextualPhaseQuestion(
    currentField,
    nameA,
    roleA,
    nameB,
    roleB,
    targetName,
    targetRole
  );

  let questionText = fallback.question;
  let options = fallback.options;
  let allowFreeText = fallback.allow_free_text;

  // Intentar generar pregunta dinámica y fresca con IA
  try {
    const sys = `Eres un copiloto creativo para artistas. Estás facilitando la fase "${FIELD_LABELS[currentField]}" entre ${nameA} (${roleA}) y ${nameB} (${roleB}).
Habla en tono cercano, directo y constructivo (como un productor amigo).
Le estás preguntando ahora a ${targetName} (${targetRole}).
Lo que busca ${nameA}: "${agreement.intent_translated_a || agreement.intent_a}"
Lo que busca ${nameB}: "${agreement.intent_translated_b || agreement.intent_b}"
Puntos ya definidos:
${JSON.stringify(draftFields, null, 2)}

Enfócate EXCLUSIVAMENTE en la fase "${FIELD_LABELS[currentField]}".
Inicia el mensaje con un encabezado claro de fase: "📌 **Fase ${PLAN_FIELDS.find(f => f.key === currentField)?.stepNum} de 5: ${PLAN_FIELDS.find(f => f.key === currentField)?.label}**".
Genera 1 pregunta concreta y 4 opciones múltiples específicas y realistas para esa fase y sus disciplinas.

Devuelve SOLO JSON:
{
  "question": "...",
  "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
  "allow_free_text": true
}`;

    const userPrompt = `Genera la pregunta para ${targetName} sobre ${FIELD_LABELS[currentField]}.`;
    const raw = await callAI([{ role: "system", content: sys }, { role: "user", content: userPrompt }]);
    const parsed = parseJSON<any>(raw, null);
    if (parsed && parsed.question && Array.isArray(parsed.options) && parsed.options.length > 0) {
      questionText = parsed.question;
      options = parsed.options;
      allowFreeText = parsed.allow_free_text ?? true;
    }
  } catch (err) {
    console.warn("handleNextField dynamic AI question fallback used:", err);
  }

  // Insertar la pregunta en la base de datos
  const { data: inserted, error: iErr } = await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId,
    sender_id: null,
    sender_role: "ai",
    message_type: "question",
    content: questionText,
    question_options: options,
    for_user_id: targetId,
    metadata: {
      field: currentField,
      allow_free_text: allowFreeText,
      step_num: PLAN_FIELDS.find(f => f.key === currentField)?.stepNum,
    },
  }).select().single();

  if (iErr) throw iErr;
  return { message: inserted, field: currentField };
}

// Registro estructurado de la respuesta a una pregunta y avance a la siguiente fase
async function handleAnswerQuestion(
  supabase: any,
  userId: string,
  agreementId: string,
  payload: { field?: string; answer?: string; option?: string | null }
) {
  const { agreement, msgs, profileA, profileB } = await loadAgreement(supabase, agreementId);
  if (agreement.user_a !== userId && agreement.user_b !== userId) throw new Error("Not a member");

  const nameA = profileA.display_name;
  const nameB = profileB.display_name;
  const senderName = userId === agreement.user_a ? nameA : nameB;

  // Determinar el campo respondido
  let field = payload.field as FieldKey;
  if (!field) {
    const lastQ = [...msgs].reverse().find((m: any) => m.message_type === "question" && m.for_user_id === userId);
    field = (lastQ?.metadata?.field as FieldKey) || "quien_hace_que";
  }

  const rawAnswer = (payload.answer ?? payload.option ?? "").trim();
  if (!rawAnswer) throw new Error("Respuesta vacía");

  // Guardar mensaje de respuesta del usuario si no fue insertado por el cliente
  const hasExistingMsg = msgs.some(
    (m: any) => m.message_type === "answer" && m.sender_id === userId && m.content.includes(rawAnswer)
  );

  if (!hasExistingMsg) {
    await supabase.from("collab_agreement_messages").insert({
      agreement_id: agreementId,
      sender_id: userId,
      sender_role: "user",
      message_type: "answer",
      content: rawAnswer,
      selected_option: payload.option ?? null,
      for_user_id: userId,
      metadata: { field },
    });
  }

  // Actualizar el estado de este campo en agreement_summary
  const summary = agreement.agreement_summary || {};
  const currentFieldsStatus = { ...(summary.fields_status || {}) };
  const currentDraftFields = { ...(summary.draft_fields || {}) };

  currentDraftFields[field] = rawAnswer;
  currentFieldsStatus[field] = "listo";

  const updatedSummary = {
    ...summary,
    fields_status: currentFieldsStatus,
    draft_fields: currentDraftFields,
  };

  await supabase.from("collab_agreements").update({
    agreement_summary: updatedSummary,
  }).eq("id", agreementId);

  // Notificar confirmación breve y amigable del punto acordado
  const stepLabel = FIELD_LABELS[field] || field;
  await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId,
    sender_id: null,
    sender_role: "ai",
    message_type: "system",
    content: `✅ **${stepLabel.split("(")[0].trim()} acordado:** "${rawAnswer}"`,
    for_user_id: null,
    metadata: { kind: "field_confirmed", field },
  });

  // Pasar a la siguiente fase
  return await handleNextField(supabase, userId, agreementId);
}

// Registro de respuesta de intención y sincronización cruzada
async function handleIntentAnswer(supabase: any, userId: string, agreementId: string, rawText: string) {
  const { agreement, profileA, profileB } = await loadAgreement(supabase, agreementId);
  if (agreement.user_a !== userId && agreement.user_b !== userId) throw new Error("Not a member");
  const isA = userId === agreement.user_a;

  await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId, sender_id: userId, sender_role: "user",
    message_type: "intent_answer", content: rawText, for_user_id: userId,
  });

  const upd: any = {};
  if (isA) upd.intent_a = rawText;
  else upd.intent_b = rawText;
  await supabase.from("collab_agreements").update(upd).eq("id", agreementId);

  // Verificar si ambos han respondido su intención
  const currentIntentA = isA ? rawText : agreement.intent_a;
  const currentIntentB = isA ? agreement.intent_b : rawText;

  if (currentIntentA && currentIntentB) {
    const nameA = profileA.display_name;
    const nameB = profileB.display_name;
    const roleA = normalizeRole(agreement.user_a_role || profileA.discipline);
    const roleB = normalizeRole(agreement.user_b_role || profileB.discipline);

    const crossResult = await translateIntentsCross(nameA, roleA, currentIntentA, nameB, roleB, currentIntentB);

    const initialSummary = {
      ...(agreement.agreement_summary || {}),
      balance_note: crossResult.balance_note,
      fields_status: {
        que_buscan: "listo",
        quien_hace_que: "vacio",
        reparto: "vacio",
        plazos: "vacio",
        creditos: "vacio",
        si_algo_cambia: "vacio",
      },
      draft_fields: {
        que_buscan: `${nameA}: ${crossResult.translated_a} | ${nameB}: ${crossResult.translated_b}`,
      },
    };

    await supabase.from("collab_agreements").update({
      intent_translated_a: crossResult.translated_a,
      intent_translated_b: crossResult.translated_b,
      agreement_summary: initialSummary,
    }).eq("id", agreementId);

    // Mensaje compartido visible para ambos
    await supabase.from("collab_agreement_messages").insert({
      agreement_id: agreementId,
      sender_id: null,
      sender_role: "ai",
      message_type: "system",
      content: `🎯 **Expectativas sobre la mesa:**\n\n• **${nameA}**: ${crossResult.translated_a}\n• **${nameB}**: ${crossResult.translated_b}\n\n💡 *${crossResult.balance_note}*`,
      for_user_id: null,
      metadata: {
        kind: "shared_intent_summary",
        translated_a: crossResult.translated_a,
        translated_b: crossResult.translated_b,
        balance_note: crossResult.balance_note,
      },
    });

    // Iniciar inmediatamente la Fase 1: Quién hace qué
    return await handleNextField(supabase, userId, agreementId);
  }

  // Notificación al usuario que respondió primero
  await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId, sender_id: null, sender_role: "ai",
    message_type: "system",
    content: `✓ ¡Genial! Registrado lo que buscas. En cuanto ${isA ? profileB.display_name : profileA.display_name} comparta su objetivo, alineamos expectativas e iniciamos juntos las fases del plan. ✨`,
    for_user_id: userId, metadata: { kind: "intent_waiting" },
  });

  return { waiting: true, reason: "waiting_other_intent" };
}

// Ajustar un punto específico sin alterar las otras fases
async function handleAdjustField(
  supabase: any,
  userId: string,
  agreementId: string,
  field: string,
  reason?: string
) {
  const { agreement, profileA, profileB } = await loadAgreement(supabase, agreementId);
  if (agreement.user_a !== userId && agreement.user_b !== userId) throw new Error("Not a member");

  const nameA = profileA.display_name;
  const nameB = profileB.display_name;
  const requestingName = userId === agreement.user_a ? nameA : nameB;

  const currentSummary = agreement.agreement_summary || {};
  const currentVal = currentSummary.draft_fields?.[field] || currentSummary.card?.[field] || "Por definir";

  let questionText = `✏️ Para ajustar el punto de **${FIELD_LABELS[field as FieldKey] || field}**: ¿cómo te gustaría plantearlo ahora?`;
  let options = ["Proponer nueva división", "Ajustar tiempos", "Revisar acuerdos", "Escribir propuesta"];

  try {
    const sys = `Eres un copiloto creativo. Estás ajustando ÚNICAMENTE el punto "${field}" del plan entre ${nameA} y ${nameB}. El resto del plan NO cambia.
Valor actual: "${currentVal}"
Motivo del cambio: "${reason || "Ajuste solicitado por " + requestingName}"

Genera 1 pregunta clara y 4 opciones directas para ajustar este punto.
Devuelve SOLO JSON:
{
  "question": "...",
  "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
  "allow_free_text": true
}`;

    const raw = await callAI([{ role: "system", content: sys }, { role: "user", content: `Ajuste para ${field}` }]);
    const parsed = parseJSON<any>(raw, null);
    if (parsed && parsed.question && Array.isArray(parsed.options)) {
      questionText = parsed.question;
      options = parsed.options;
    }
  } catch (err) {
    console.warn("handleAdjustField AI fallback used:", err);
  }

  // Reabrir el estado del campo
  const updatedStatus = { ...(currentSummary.fields_status || {}), [field]: "a_medias" };
  await supabase.from("collab_agreements").update({
    status: "in_progress",
    accepted_by_a: false,
    accepted_by_b: false,
    agreement_summary: { ...currentSummary, fields_status: updatedStatus },
  }).eq("id", agreementId);

  await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId,
    sender_id: userId,
    sender_role: "system",
    message_type: "system",
    content: `✏️ ${requestingName} abrió el ajuste para: **${FIELD_LABELS[field as FieldKey] || field}**${reason ? ` ("${reason}")` : ""}.`,
  });

  const { data: inserted } = await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId,
    sender_id: null,
    sender_role: "ai",
    message_type: "question",
    content: questionText,
    question_options: options,
    for_user_id: userId,
    metadata: { field, allow_free_text: true, is_adjustment: true },
  }).select().single();

  return { message: inserted, field };
}

// Sugerencias de colaboradores
async function handleSuggestCollaborators(supabase: any, userId: string, agreementId: string) {
  const { agreement, profileA, profileB } = await loadAgreement(supabase, agreementId);
  const otherId = userId === agreement.user_a ? agreement.user_b : agreement.user_a;
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const candidateIds = (matches ?? [])
    .map((m: any) => (m.user_a === userId ? m.user_b : m.user_a))
    .filter((id: string) => id !== otherId);

  if (candidateIds.length === 0) {
    await supabase.from("collab_agreement_messages").insert({
      agreement_id: agreementId, sender_id: null, sender_role: "ai",
      message_type: "suggestion", content: "Aún no tienes otros matches para sumar. ¡Sigue descubriendo talento en Independent! ✨",
      for_user_id: userId, metadata: { candidates: [] },
    });
    return { suggested: 0 };
  }

  const { data: candidates } = await supabase
    .from("profiles").select("id, display_name, username, discipline, bio")
    .in("id", candidateIds).limit(10);

  const fallbackSuggestions = (candidates ?? []).slice(0, 3).map((c: any) => ({
    user_id: c.id,
    display_name: c.display_name,
    username: c.username,
    discipline: c.discipline,
    reason: `Podría sumar en la faceta de ${c.discipline || "producción y difusión"} para este proyecto.`,
  }));

  let enriched = fallbackSuggestions;
  try {
    const sys = `Eres una IA que recomienda talentos musicales para complementar un proyecto. Devuelve SOLO JSON: {"suggestions":[{"user_id":"...","reason":"..."}]}`;
    const userPrompt = `Proyecto entre ${profileA.display_name} y ${profileB.display_name}.
Candidatos disponibles:
${(candidates ?? []).map((c: any) => `- ${c.id} | ${c.display_name} (${c.discipline}) — ${c.bio ?? ""}`).join("\n")}`;

    const raw = await callAI([{ role: "system", content: sys }, { role: "user", content: userPrompt }]);
    const parsed = parseJSON<any>(raw, null);
    if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      enriched = parsed.suggestions.map((s: any) => {
        const p = candidates?.find((c: any) => c.id === s.user_id);
        return { user_id: s.user_id, reason: s.reason, display_name: p?.display_name, username: p?.username, discipline: p?.discipline };
      }).filter((s: any) => s.display_name);
    }
  } catch (err) {
    console.warn("handleSuggestCollaborators AI fallback used:", err);
  }

  await supabase.from("collab_agreement_messages").insert({
    agreement_id: agreementId, sender_id: null, sender_role: "ai",
    message_type: "suggestion",
    content: enriched.length > 0 ? `Estos colaboradores de tus matches podrían potenciar este plan:` : "No encontré matches adicionales que encajen específicamente con este plan por ahora.",
    for_user_id: userId, metadata: { candidates: enriched },
  });
  return { suggested: enriched.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = await req.json();
    const { action, agreementId, payload } = body as { action: string; agreementId: string; payload?: any };

    const { data: agreementCheck } = await userClient.from("collab_agreements").select("id").eq("id", agreementId).maybeSingle();
    if (!agreementCheck) return new Response(JSON.stringify({ error: "No access" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let result: any;
    if (action === "next" || action === "answer_question") {
      if (payload && (payload.answer || payload.option || payload.field)) {
        result = await handleAnswerQuestion(service, user.id, agreementId, payload);
      } else {
        result = await handleNextField(service, user.id, agreementId);
      }
    } else if (action === "intent_answer") {
      result = await handleIntentAnswer(service, user.id, agreementId, String(payload?.text ?? ""));
    } else if (action === "adjust_field") {
      result = await handleAdjustField(service, user.id, agreementId, String(payload?.field ?? "reparto"), payload?.reason);
    } else if (action === "finalize") {
      const { agreement, msgs, profileA, profileB } = await loadAgreement(service, agreementId);
      result = await buildCard(service, agreementId, agreement, msgs, profileA, profileB);
    } else if (action === "suggest_collaborators") {
      result = await handleSuggestCollaborators(service, user.id, agreementId);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("collab-ai error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
