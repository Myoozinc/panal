import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthState = () => {
  const [searchParams] = useSearchParams();
  const inviteName = searchParams.get("invite_name") ?? "";
  const isInvite = !!inviteName || searchParams.get("signup") === "1";
  const [isSignUp, setIsSignUp] = useState(isInvite);
  const [isRecovering, setIsRecovering] = useState(false);
  const checkInitialReset = () => {
    if (typeof window === "undefined") return false;
    const search = window.location.search;
    const hash = window.location.hash;
    return (
      search.includes("type=recovery") ||
      search.includes("reset=true") ||
      hash.includes("type=recovery")
    );
  };
  const [isResettingPassword, setIsResettingPassword] = useState(checkInitialReset);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(inviteName);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check authentication links and handle different flows
  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('Auth callback triggered');
      console.log('Current URL:', window.location.href);
      
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParamsObj = Object.fromEntries(searchParams.entries());
      
      console.log('Hash params:', Object.fromEntries(hashParams.entries()));
      console.log('Search params:', searchParamsObj);
      
      // First, check for PKCE flow (code parameter)
      const code = searchParams.get('code');
      const typeSearch = searchParams.get('type');
      
      if (code) {
        console.log('PKCE flow detected with code:', code, 'type:', typeSearch);
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            throw error;
          }
          
          console.log('Session established via PKCE:', data);
          
          if (typeSearch === 'recovery') {
            // Password reset flow - show password reset form
            console.log('Password recovery flow via PKCE');
            setIsResettingPassword(true);
            toast({
              title: "Enlace válido",
              description: "Ahora puedes establecer tu nueva contraseña.",
            });
            window.history.replaceState({}, document.title, '/auth?reset=true');
            return;
          } else {
            // Signup confirmation - redirect to dashboard
            console.log('Signup confirmation via PKCE - redirecting to dashboard');
            toast({
              title: "Cuenta verificada",
              description: "Redirigiendo al panel principal...",
            });
            setTimeout(() => {
              window.location.href = '/discover';
            }, 1000);
            return;
          }
        } catch (error: any) {
          console.error('PKCE exchange error:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Problema con el enlace de verificación. Intenta nuevamente.",
          });
          window.history.replaceState({}, document.title, '/auth');
          return;
        }
      }
      
      // Check for error parameters in hash
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      
      if (error) {
        console.log('Auth error detected:', error, errorCode);
        let errorMessage = "Error en el enlace de autenticación.";
        
        if (errorCode === 'otp_expired') {
          errorMessage = "El enlace ha expirado. Solicita uno nuevo.";
        } else if (error === 'access_denied') {
          errorMessage = "El enlace es inválido o ha expirado.";
        }
        
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
        
        window.history.replaceState({}, document.title, '/auth');
        return;
      }

      // Get auth tokens and type from hash (legacy flow)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('Auth tokens present:', !!accessToken, !!refreshToken);
      console.log('Auth type:', type);

      // Handle auth callback with tokens
      if (accessToken && refreshToken) {
        try {
          console.log('Setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session error:', error);
            throw error;
          }

          console.log('Session set successfully:', data);
          
          const isRecoveryFlow = 
            type === 'recovery' || 
            typeSearch === 'recovery' || 
            searchParams.get('reset') === 'true' ||
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('type=recovery');

          if (isRecoveryFlow) {
            // Password reset flow - show password reset form
            console.log('Password recovery flow detected');
            setIsResettingPassword(true);
            toast({
              title: "Enlace válido",
              description: "Ahora puedes establecer tu nueva contraseña.",
            });
            window.history.replaceState({}, document.title, '/auth?reset=true');
          } else {
            // Magic link or email confirmation - redirect to dashboard
            console.log('Magic link flow - redirecting to dashboard');
            toast({
              title: "Acceso confirmado",
              description: "Redirigiendo al panel principal...",
            });
            window.history.replaceState({}, document.title, '/auth');
            setTimeout(() => {
              window.location.href = '/discover';
            }, 1000);
          }
        } catch (error: any) {
          console.error('Auth session error:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Problema de conexión. Verifica tu conexión a internet e intenta nuevamente.",
          });
          window.history.replaceState({}, document.title, '/auth');
        }
      } else {
        // No tokens, check if this is a manual password reset request or recovery URL
        console.log('No tokens in hash, checking for recovery flags');
        if (
          searchParams.get('reset') === 'true' ||
          searchParams.get('type') === 'recovery' ||
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery')
        ) {
          console.log('Recovery state confirmed via URL');
          setIsResettingPassword(true);
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, toast]);

  return {
    isSignUp,
    setIsSignUp,
    isRecovering,
    setIsRecovering,
    isResettingPassword,
    setIsResettingPassword,
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
    loading,
    setLoading,
  };
};
