import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { ArrowRight, Heart, Sparkles, Users, TrendingUp, Layers, Zap, Rocket } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Bento Social Recap",
    desc: "En lugar de solo una foto, tu tarjeta de match destaca tu presencia en Instagram, TikTok, YouTube y tu potencial de audiencia real.",
  },
  {
    icon: Zap,
    title: "Matriz de Colaboración",
    desc: "Deja claro al instante qué aportas a la mesa (producción, comunidad, tech, storytelling) y qué sinergias buscas explotar.",
  },
  {
    icon: Users,
    title: "Todos los Dominios",
    desc: "Creadores, marcas, streamers, founders tech, atletas, artistas y profesionales listos para co-crear y hacer crecer sus proyectos.",
  },
  {
    icon: Rocket,
    title: "Acuerdos y Squads",
    desc: "Conecta mediante swipe, chatea y estructura acuerdos claros para lanzamientos, campañas y marcas compartidas.",
  },
];

const Landing = () => {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/discover" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/10 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-[28rem] h-[28rem] rounded-full bg-yellow-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[24rem] h-[24rem] rounded-full bg-amber-600/15 blur-3xl pointer-events-none" />

      <header className="relative max-w-6xl mx-auto px-5 pt-6 flex items-center justify-between">
        <Logo size="md" />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="rounded-full">Entrar</Button>
        </Link>
      </header>

      <main className="relative max-w-3xl mx-auto px-5 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold mb-6"
        >
          <span>🐝</span>
          <span>La nueva era del Match para Creadores & Marcas</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.95]"
        >
          El panal donde las redes hacen match para{" "}
          <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            colaborar y crecer
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
        >
          Descubre creadores con audiencias complementarias en cualquier disciplina.
          Explora su recap de redes, conecta en un swipe y co-crea marcas de alto impacto.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <Link to="/auth">
            <Button size="lg" className="h-14 px-8 rounded-full text-base font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:scale-105 transition-all">
              Entrar al Panal
              <ArrowRight className="ml-1.5 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>

        <div className="mt-24 grid sm:grid-cols-2 gap-4 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="rounded-3xl bg-card/70 backdrop-blur-sm border border-amber-500/20 p-6 hover:border-amber-500/40 hover:scale-[1.02] transition-all shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
                <f.icon className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-bold text-lg text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-border/40 py-8 mt-16 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Panal. Conectando creadores globales.</p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-foreground transition-colors underline">
              Condiciones de Uso
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors underline">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
