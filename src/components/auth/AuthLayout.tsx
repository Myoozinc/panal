import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const AuthLayout = ({ title, children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-4 py-8 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-6 animate-fade-in">
          <Logo size="xl" showText={false} className="mb-3 animate-scale-in" />
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Panal
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Sinergia. Redes. Colaboraciones.</p>
        </div>

        <Card className="w-full border-border/40 shadow-2xl backdrop-blur-md bg-card/85 animate-scale-in rounded-3xl overflow-hidden">
          <CardHeader className="pb-2 pt-6 px-6">
            <h1 className="text-2xl font-bold text-center text-foreground">{title}</h1>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">{children}</CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 animate-fade-in leading-relaxed">
          Al continuar, aceptas nuestras{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Condiciones de Uso
          </Link>{" "}
          y{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  );
};
