import { useState, useEffect } from "react";
import { isMasterAdminAuthenticated } from "@/lib/adminAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminLogin from "@/components/admin/AdminLogin";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [, setTick] = useState(0);
  const { isAdmin: isSupabaseAdmin } = useIsAdmin();

  // Re-evaluar estado de autenticación
  const isMasterAuth = isMasterAdminAuthenticated();
  const hasAccess = isMasterAuth || isSupabaseAdmin;

  if (!hasAccess) {
    return <AdminLogin onSuccess={() => setTick((t) => t + 1)} />;
  }

  return <>{children}</>;
};

export default AdminRoute;
