import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { DISCIPLINES } from "@/lib/constants";
import {
  ArrowRight,
  Check,
  Heart,
  Instagram,
  Layers,
  MessageCircle,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  Youtube,
  Zap,
  X as XIcon,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Bento Social Recap",
    desc: "Tu tarjeta de match destaca tu presencia en Instagram, TikTok, YouTube y tu potencial de audiencia real, no solo una foto.",
  },
  {
    icon: Zap,
    title: "Matriz de Colaboración",
    desc: "Deja claro al instante qué aportas (producción, comunidad, tech, storytelling) y qué sinergias buscas.",
  },
  {
    icon: Users,
    title: "Todos los Dominios",
    desc: "Creadores, marcas, streamers, founders, atletas, artistas y profesionales listos para co-crear.",
  },
  {
    icon: Rocket,
    title: "Acuerdos y Squads",
    desc: "Conecta con un swipe, chatea y estructura acuerdos claros para lanzamientos, campañas y marcas compartidas.",
  },
];

const steps = [
  { n: "01", title: "Crea tu perfil", desc: "Conecta tus redes y define qué aportas y qué buscas." },
  { n: "02", title: "Descubre y haz match", desc: "Explora perfiles con audiencias complementarias y desliza." },
  { n: "03", title: "Co-crea y crece", desc: "Formaliza el acuerdo, lanza el proyecto y suma audiencia." },
];

const stats = [
  { value: `${DISCIPLINES.length}+`, label: "disciplinas creativas" },
  { value: "3", label: "pasos para colaborar" },
  { value: "Beta", label: "abierta a creadores" },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

/** Static preview of a match card, used as the hero visual. */
const MatchPreview = () => (
  <div className="relative mx-auto w-full max-w-[380px]">
    {/* Back card */}
    <div className="absolute inset-x-6 -top-4 bottom-8 rounded-[2rem] bg-amber-100/70 dark:bg-amber-500/10 ring-1 ring-amber-500/20 rotate-[-5deg]" />

    <div className="relative rounded-[2rem] bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_80px_-24px_rgba(120,53,15,0.35)] overflow-hidden">
      <div className="relative h-44 bg-gradient-to-br from-amber-300 via-amber-400 to-orange-400">
        <div className="absolute inset-0 honeycomb-bg opacity-60 mix-blend-overlay" />
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-sm">
          <Sparkles className="w-3 h-3" /> 92% compatibilidad
        </div>
        <div className="absolute -bottom-10 left-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 ring-4 ring-card flex items-center justify-center font-display text-2xl font-extrabold text-amber-300">
          LV
        </div>
      </div>

      <div className="px-5 pt-12 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold leading-tight text-foreground">Lucía Vega</p>
            <p className="text-sm text-muted-foreground">Fotógrafa · Moda & Lifestyle</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Disponible
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Instagram, v: "84K", l: "Instagram" },
            { icon: TrendingUp, v: "120K", l: "TikTok" },
            { icon: Youtube, v: "18K", l: "YouTube" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-muted/60 px-2.5 py-2">
              <s.icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <p className="mt-1 text-sm font-bold text-foreground">{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Producción", "Dirección de arte", "Campañas"].map((t) => (
            <span key={t} className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-card ring-1 ring-border shadow-sm flex items-center justify-center text-muted-foreground">
            <XIcon className="w-5 h-5" />
          </div>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40 flex items-center justify-center text-white">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div className="w-12 h-12 rounded-full bg-card ring-1 ring-border shadow-sm flex items-center justify-center text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>

    {/* Floating toast */}
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="absolute -right-2 sm:-right-10 top-14 flex items-center gap-2.5 rounded-2xl bg-card/95 backdrop-blur px-3.5 py-2.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
    >
      <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-base">🐝</div>
      <div>
        <p className="text-xs font-bold text-foreground">¡Es un match!</p>
        <p className="text-[11px] text-muted-foreground">Lucía quiere colaborar</p>
      </div>
    </motion.div>
  </div>
);

const Landing = () => {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/discover" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" aria-label="Panal inicio">
            <Logo size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Producto</a>
            <a href="#how" className="hover:text-foreground transition-colors">Cómo funciona</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="font-semibold">Iniciar sesión</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full px-4 font-semibold bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 honeycomb-bg [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] pointer-events-none" />
        <div className="absolute -top-24 right-0 w-[40rem] h-[40rem] rounded-full bg-amber-400/20 blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border shadow-sm"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              La nueva era del match para creadores y marcas
            </motion.div>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 font-display text-[2.6rem] leading-[1.05] sm:text-6xl font-extrabold tracking-[-0.03em]"
            >
              Donde las redes hacen match para{" "}
              <span className="relative whitespace-nowrap text-amber-600 dark:text-amber-400">
                colaborar y crecer
                <svg className="absolute left-0 -bottom-2 w-full h-3 text-amber-400/60" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 9C60 3 150 1 298 7" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              Descubre creadores con audiencias complementarias en cualquier disciplina.
              Explora su recap de redes, conecta en un swipe y co-crea proyectos de alto impacto.
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-9 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link to="/auth" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 rounded-full text-base font-semibold bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-amber-600/20 hover:from-amber-300 hover:to-amber-500 transition-all"
                >
                  Entrar al Panal
                  <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
              <a href="#how" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-7 rounded-full text-base font-semibold bg-card">
                  Cómo funciona
                </Button>
              </a>
            </motion.div>

            <motion.ul
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground"
            >
              {["Acceso con Google", "Perfil en minutos", "Todas las disciplinas"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="px-4"
          >
            <MatchPreview />
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-muted/40">
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-3 divide-x divide-border/70">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-2">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">{s.value}</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 md:py-28 scroll-mt-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">Producto</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.02em]">
            Todo lo que necesitas para encontrar a tu próximo colaborador
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Perfiles pensados para mostrar tu impacto real, no solo tu foto.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative rounded-2xl bg-card p-7 ring-1 ring-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-500/25 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-slate-950" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 border-y border-border/60 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">Cómo funciona</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.02em]">
              De desconocidos a co-creadores en tres pasos
            </h2>
          </div>

          <ol className="mt-14 grid md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.n} className="relative text-center md:text-left">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-16 right-0 h-px bg-gradient-to-r from-amber-400/60 to-transparent" />
                )}
                <div className="relative mx-auto md:mx-0 w-12 h-12 rounded-full bg-card ring-1 ring-amber-500/30 shadow-sm flex items-center justify-center font-display font-extrabold text-amber-600 dark:text-amber-400">
                  {s.n}
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 sm:px-14 sm:py-16 text-center">
          <div className="absolute inset-0 honeycomb-bg opacity-60 pointer-events-none" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[20rem] rounded-full bg-amber-500/30 blur-[100px] pointer-events-none" />
          <div className="relative">
            <Logo size="lg" showText={false} className="justify-center" />
            <h2 className="mt-6 font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">
              Tu próxima gran colaboración te está esperando
            </h2>
            <p className="mt-4 text-slate-300 max-w-xl mx-auto">
              Únete a la beta de Panal y conecta con creadores que multiplican tu alcance.
            </p>
            <Link to="/auth" className="inline-block mt-8">
              <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg shadow-amber-500/30">
                Crear mi perfil
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <p>© {new Date().getFullYear()} Panal. Conectando creadores globales.</p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-foreground transition-colors">Condiciones de Uso</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
