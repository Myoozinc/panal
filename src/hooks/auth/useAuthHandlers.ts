import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseAuthHandlersProps {
  isResettingPassword: boolean;
  isRecovering: boolean;
  isSignUp: boolean;
  email: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
  fullName: string;
  setLoading: (loading: boolean) => void;
  setIsRecovering: (recovering: boolean) => void;
}

export const useAuthHandlers = ({
  isResettingPassword,
  isRecovering,
  isSignUp,
  email,
  password,
  newPassword,
  confirmPassword,
  fullName,
  setLoading,
  setIsRecovering,
}: UseAuthHandlersProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get redirect URL with better VPN compatibility
  const getRedirectUrl = (type: 'recovery' | 'signup' = 'signup') => {
    // Always use current origin for better VPN compatibility
    const baseUrl = window.location.origin;
    
    // Include type parameter to distinguish recovery from signup
    if (type === 'recovery') return `${baseUrl}/auth?type=recovery`;
    if (type === 'signup') return `${baseUrl}/auth?type=signup`;
    return `${baseUrl}/auth`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResettingPassword) {
        // Handle password reset
        if (newPassword !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (newPassword.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (error) throw error;
        
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente.",
        });
        navigate("/");
      } else if (isRecovering) {
        // Validate email format
        if (!email.includes('@') || !email.includes('.')) {
          throw new Error('Por favor ingresa un email válido');
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getRedirectUrl('recovery'),
        });
        if (error) throw error;
        toast({
          title: "Correo enviado",
          description: "Revisa tu correo para el enlace de recuperación de contraseña.",
        });
        setIsRecovering(false);
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: getRedirectUrl('signup'),
          },
        });
        if (error) throw error;
        toast({
          title: "¡Éxito!",
          description: "Revisa tu correo para verificar tu cuenta.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl('signup'),
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        }
      });

      if (error) {
        throw error;
      }

    } catch (error: any) {

      
      let errorMessage = "No se pudo conectar con Google.";
      
      if (error.message?.includes('403')) {
        errorMessage = "Error 403: Verifica la configuración de Google OAuth en el dashboard de Supabase.";
      } else if (error.message?.includes('redirect_uri')) {
        errorMessage = "Error de URL de redirección. Verifica la configuración en Google Cloud Console.";
      } else if (error.message?.includes('client_id')) {
        errorMessage = "Error de Client ID. Verifica la configuración en Supabase.";
      }
      
      toast({
        variant: "destructive",
        title: "Error de autenticación con Google",
        description: errorMessage,
      });
    }
  };

  return {
    handleAuth,
    handleOAuthSignIn,
  };
};