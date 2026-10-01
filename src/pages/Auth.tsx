import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { useAuthHandlers } from "@/hooks/auth/useAuthHandlers";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthNavigationButtons } from "@/components/auth/AuthNavigationButtons";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const { user, loading: authLoading, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const authState = useAuthState();
  const {
    isSignUp,
    setIsSignUp,
    isRecovering,
    setIsRecovering,
    isResettingPassword,
    loading,
    setLoading,
    email,
    setEmail,
    password,
    setPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    fullName,
    setFullName,
  } = authState;

  const isRecoveryInUrl = 
    typeof window !== "undefined" && (
      window.location.search.includes("type=recovery") ||
      window.location.search.includes("reset=true") ||
      window.location.hash.includes("type=recovery")
    );

  const isResetFlow = isResettingPassword || isRecoveryInUrl;

  const { handleAuth, handleOAuthSignIn, handleDemoSignIn } = useAuthHandlers({
    isResettingPassword: isResetFlow,
    isRecovering,
    isSignUp,
    email,
    password,
    newPassword,
    confirmPassword,
    fullName,
    setLoading,
    setIsRecovering,
  });

  const getTitle = () => {
    if (isResetFlow) return "Nueva Contraseña";
    if (isRecovering) return "Recuperar Contraseña";
    if (isSignUp) return "Crear Cuenta";
    return "Bienvenido";
  };

  const getSubmitButtonText = () => {
    if (isResetFlow) return "Cambiar contraseña";
    if (isRecovering) return "Enviar enlace";
    if (isSignUp) return "Crear cuenta";
    return "Iniciar sesión";
  };

  useEffect(() => {
    if (!authLoading && user && !isResetFlow && !isRecovering) {
      navigate("/discover", { replace: true });
    }
  }, [user, authLoading, isResetFlow, isRecovering, navigate]);

  if (authLoading || (user && !isResetFlow && !isRecovering)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthLayout title={getTitle()}>
      <form onSubmit={handleAuth} className="space-y-5">
        {isResetFlow ? (
          <PasswordResetForm
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
        ) : (
          <LoginForm
            isSignUp={isSignUp}
            isRecovering={isRecovering}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            fullName={fullName}
            setFullName={setFullName}
          />
        )}

        <div className="flex flex-col space-y-3 pt-1">
          <Button
            type="submit"
            className="w-full h-12 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-base"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              getSubmitButtonText()
            )}
          </Button>

          {!isRecovering && !isResetFlow && (
            <>
              <OAuthButtons onOAuthSignIn={handleOAuthSignIn} />
              <Button
                type="button"
                variant="ghost"
                onClick={loginAsDemo}
                className="w-full text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-dashed border-amber-500/30 rounded-xl py-2.5 h-auto transition-all"
              >
                ⚡ Probar prototipo como Creador Demo (Acceso directo)
              </Button>
            </>
          )}

          <AuthNavigationButtons
            isSignUp={isSignUp}
            isRecovering={isRecovering}
            isResettingPassword={isResetFlow}
            setIsSignUp={setIsSignUp}
            setIsRecovering={setIsRecovering}
          />
        </div>
      </form>
    </AuthLayout>
  );
};

export default Auth;
