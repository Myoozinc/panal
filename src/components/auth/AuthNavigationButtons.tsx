import { Button } from "@/components/ui/button";

interface AuthNavigationButtonsProps {
  isSignUp: boolean;
  isRecovering: boolean;
  isResettingPassword: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  setIsRecovering: (isRecovering: boolean) => void;
}

export const AuthNavigationButtons = ({
  isSignUp,
  isRecovering,
  isResettingPassword,
  setIsSignUp,
  setIsRecovering,
}: AuthNavigationButtonsProps) => {
  if (isRecovering) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="w-full rounded-xl h-11 animate-fade-in"
        onClick={() => {
          setIsRecovering(false);
          setIsSignUp(false);
        }}
      >
        ← Volver al inicio de sesión
      </Button>
    );
  }

  if (isResettingPassword) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 pt-1 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-sm rounded-xl h-10"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp
          ? "¿Ya tienes cuenta? Iniciar sesión"
          : "¿No tienes cuenta? Crear cuenta"}
      </Button>
      {!isSignUp && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-xs text-muted-foreground h-auto p-0"
          onClick={() => setIsRecovering(true)}
        >
          ¿Olvidaste tu contraseña?
        </Button>
      )}
    </div>
  );
};
