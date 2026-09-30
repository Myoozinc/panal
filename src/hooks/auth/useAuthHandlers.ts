import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider, isFirebaseConfigured, db } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

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

  const getRedirectUrl = (type: "recovery" | "signup" = "signup") => {
    const baseUrl = window.location.origin;
    if (type === "recovery") return `${baseUrl}/auth?type=recovery`;
    if (type === "signup") return `${baseUrl}/auth?type=signup`;
    return `${baseUrl}/auth`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResettingPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }
        if (newPassword.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }

        if (isFirebaseConfigured && auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
        } else {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;
        }

        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente.",
        });
        navigate("/discover");
      } else if (isRecovering) {
        if (!email.includes("@") || !email.includes(".")) {
          throw new Error("Por favor ingresa un email válido");
        }

        if (isFirebaseConfigured) {
          await sendPasswordResetEmail(auth, email);
        } else {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl("recovery"),
          });
          if (error) throw error;
        }

        toast({
          title: "Correo enviado",
          description: "Revisa tu correo para el enlace de recuperación de contraseña.",
        });
        setIsRecovering(false);
      } else if (isSignUp) {
        if (isFirebaseConfigured) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const fbUser = cred.user;

          try {
            const profileRef = doc(db, "profiles", fbUser.uid);
            await setDoc(
              profileRef,
              {
                id: fbUser.uid,
                display_name: fullName || email.split("@")[0] || "Creador Panal",
                username: (fullName || email.split("@")[0] || "creador")
                  .toLowerCase()
                  .replace(/\s+/g, "_")
                  .replace(/[^a-z0-9_]/g, ""),
                email: fbUser.email,
                avatar_url: "/logo.png",
                bio: "Creador en Panal 🐝",
                discipline: "other",
                is_verified: false,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (syncErr) {
            console.warn("Firestore save warning:", syncErr);
          }

          toast({
            title: "¡Bienvenido a Panal!",
            description: "Tu cuenta ha sido creada exitosamente.",
          });
          navigate("/discover");
        } else {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: getRedirectUrl("signup"),
            },
          });
          if (error) throw error;
          toast({
            title: "¡Éxito!",
            description: "Revisa tu correo para verificar tu cuenta.",
          });
        }
      } else {
        // Sign in with password
        if (isFirebaseConfigured) {
          await signInWithEmailAndPassword(auth, email, password);
          toast({
            title: "¡Bienvenido de vuelta!",
            description: "Has iniciado sesión en Panal.",
          });
          navigate("/discover");
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          navigate("/discover");
        }
      }
    } catch (error: any) {
      let desc = error.message;
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        desc = "Credenciales incorrectas. Verifica tu correo y contraseña.";
      } else if (error.code === "auth/email-already-in-use") {
        desc = "Este correo ya está registrado. Intenta iniciar sesión.";
      } else if (error.code === "auth/weak-password") {
        desc = "La contraseña debe tener al menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: desc,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google") => {
    try {
      setLoading(true);

      if (isFirebaseConfigured) {
        const res = await signInWithPopup(auth, googleProvider);
        const fbUser = res.user;

        try {
          const profileRef = doc(db, "profiles", fbUser.uid);
          await setDoc(
            profileRef,
            {
              id: fbUser.uid,
              display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "Creador Panal",
              username: (fbUser.displayName || fbUser.email?.split("@")[0] || "creador")
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, ""),
              email: fbUser.email,
              avatar_url: fbUser.photoURL || "/logo.png",
              bio: "Creador en Panal 🐝",
              discipline: "other",
              is_verified: false,
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (syncErr) {
          console.warn("Firestore sync warning:", syncErr);
        }

        toast({
          title: "¡Bienvenido a Panal!",
          description: `Sesión iniciada como ${fbUser.displayName || fbUser.email}`,
        });
        navigate("/discover");
        return;
      }

      // Supabase fallback
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl("signup"),
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        return;
      }
      if (error.code === "auth/unauthorized-domain") {
        toast({
          variant: "destructive",
          title: "Dominio no autorizado",
          description: "Agrega tu dominio de Vercel en Firebase Console > Authentication > Configuración > Dominios autorizados.",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Error de autenticación con Google",
        description: error.message || "No se pudo conectar con Google.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    const demoUser = {
      id: "demo-creator-pro",
      email: "demo@panal.app",
      user_metadata: {
        full_name: "Alex Rivera (Demo)",
        username: "alexrivera",
        avatar_url: "/logo.png",
      },
      app_metadata: { provider: "demo" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("panal_demo_session", JSON.stringify(demoUser));
    toast({
      title: "Acceso Demo Activado 🐝",
      description: "Entraste como creador de prueba. Explora todas las funciones de Panal.",
    });
    navigate("/discover");
  };

  return {
    handleAuth,
    handleOAuthSignIn,
    handleDemoSignIn,
  };
};