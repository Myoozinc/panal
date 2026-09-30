import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Flag,
  LayoutDashboard,
  Users,
  MessageSquare,
  Megaphone,
  Radio,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logoutMasterAdmin } from "@/lib/adminAuth";

const tabs = [
  { to: "/admin", label: "Dashboard & Métricas", icon: LayoutDashboard, end: true },
  { to: "/admin/live", label: "En Vivo & IPs", icon: Radio, isLive: true },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/broadcast", label: "Difusión & Correos", icon: Megaphone },
  { to: "/admin/conversations", label: "Chats", icon: MessageSquare },
  { to: "/admin/verifications", label: "Verificaciones", icon: ShieldCheck },
  { to: "/admin/reports", label: "Reportes", icon: Flag },
];

export const AdminLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutMasterAdmin();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-30 bg-card/85 backdrop-blur-xl border-b border-border/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="p-1.5 -ml-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ir a la app">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <h1 className="font-bold text-base sm:text-lg truncate">Panal Admin Console</h1>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] uppercase font-bold border-amber-500/40 text-amber-500 bg-amber-500/10">
                Gingerboy
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8 px-2.5 rounded-lg"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto scrollbar-none border-t border-border/20">
          {tabs.map(({ to, label, icon: Icon, end, isLive }: any) => {
            const active = end ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors relative",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4", isLive && "text-emerald-500")} />
                <span>{label}</span>
                {isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute right-1 top-2" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-5">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
