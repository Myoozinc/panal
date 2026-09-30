import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, User, ArrowRight, ArrowLeft, AlertCircle, KeyRound, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { authenticateMasterAdmin } from "@/lib/adminAuth";

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const ok = authenticateMasterAdmin(username, password);
      if (ok) {
        onSuccess();
      } else {
        setError("Usuario o contraseña de administrador no válidos.");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl border border-border/60 bg-card/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-2xl bg-primary/15 border border-primary/30 shadow-inner">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30 mb-2">
                <Lock className="w-3 h-3" /> Panel Oculto de Administración
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Independent Master Console
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Ingresa tus credenciales maestras para acceder a métricas, IPs en tiempo real y gestión global.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Usuario Maestro
              </label>
              <Input
                type="text"
                placeholder="Ej. Gingerboy"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="h-11 rounded-xl bg-background/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-primary" /> Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl bg-background/60"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full h-11 rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20 text-sm mt-2"
            >
              {loading ? (
                <>Accediendo a la consola...</>
              ) : (
                <>
                  Entrar al Panel de Admin
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Back */}
          <div className="pt-2 border-t border-border/40 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a la aplicación
            </Link>
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-primary/40" /> Independent Admin System · Acceso Seguro
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
