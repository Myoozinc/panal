import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!loading && !profileLoading && (!profile || !profile.onboarding_completed)) {
      if (location.pathname !== "/onboarding") {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [user, loading, profile, profileLoading, navigate, location.pathname]);

  if (loading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
