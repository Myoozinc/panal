import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Logo from "@/components/Logo";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const highlights = [
  "Muestra tu recap de redes en una sola tarjeta",
  "Haz match con audiencias complementarias",
  "Formaliza acuerdos y lanza proyectos juntos",
];

export const AuthLayout = ({ title, children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
        <div className="absolute inset-0 honeycomb-bg opacity-70 pointer-events-none" />
        <div className="absolute -bottom-40 -left-24 w-[34rem] h-[34rem] rounded-full bg-amber-500/25 blur-[120px] pointer-events-none" />

        <Link to="/" className="relative w-fit">
          <Logo size="md" showText={false} />
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-[-0.02em]">
            El panal donde las redes hacen match.
          </h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Conecta con creadores, marcas y talentos que multiplican tu alcance.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Panal</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute inset-0 honeycomb-bg [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] lg:hidden pointer-events-none" />

        <div className="relative w-full max-w-sm animate-fade-in">
          <Link to="/" className="flex justify-center mb-8">
            <Logo size="lg" />
          </Link>

          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sinergia. Redes. Colaboraciones.</p>
          </div>

          <div className="rounded-2xl bg-card p-6 ring-1 ring-border shadow-[0_20px_50px_-20px_rgba(15,23,42,0.18)]">
            {children}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            Al continuar, aceptas nuestras{" "}
            <Link to="/terms" className="font-medium text-foreground/80 underline-offset-4 hover:underline">
              Condiciones de Uso
            </Link>{" "}
            y{" "}
            <Link to="/privacy" className="font-medium text-foreground/80 underline-offset-4 hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};
