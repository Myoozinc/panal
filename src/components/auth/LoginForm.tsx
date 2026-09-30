import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock } from "lucide-react";

interface LoginFormProps {
  isSignUp: boolean;
  isRecovering: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  fullName: string;
  setFullName: (fullName: string) => void;
}

export const LoginForm = ({
  isSignUp,
  isRecovering,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
}: LoginFormProps) => {
  return (
    <div className="space-y-4">
      {isSignUp && !isRecovering && (
        <div className="space-y-1.5 animate-fade-in">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Nombre completo
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={isSignUp}
              className="h-12 pl-10 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
        </div>
      )}
      <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "50ms" }}>
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          {isRecovering ? "Correo de recuperación" : "Correo electrónico"}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 pl-10 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
          />
        </div>
      </div>
      {!isRecovering && (
        <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 pl-10 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
          {isSignUp && (
            <p className="text-xs text-muted-foreground pl-1">
              Mínimo 6 caracteres
            </p>
          )}
        </div>
      )}
    </div>
  );
};
