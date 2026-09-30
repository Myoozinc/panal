import { Link, useLocation } from "react-router-dom";
import { Flame, Heart, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import Logo from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useRealtimeTelemetry } from "@/lib/telemetry";

const items = [
  { to: "/discover", label: "Discover", icon: Flame },
  { to: "/matches", label: "Mensajes", icon: Heart },
  { to: "/feed", label: "Feed", icon: Sparkles },
  { to: "/me", label: "Yo", icon: User },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  useRealtimeTelemetry(user, profile);

  const hideChrome = pathname.startsWith("/chat/") || pathname.startsWith("/collab-ai/");
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {!hideChrome && (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-card/70 backdrop-blur-xl border-b border-border/40 max-w-2xl w-full mx-auto">
          <Logo size="sm" />
          <NotificationBell />
        </header>
      )}
      <main className={cn("flex-1 max-w-2xl w-full mx-auto", !hideChrome && "pb-20")}>
        {children}
      </main>
      {!hideChrome && (
        <nav
          className="fixed bottom-0 inset-x-0 z-50 border-t border-border/40 bg-card/85 backdrop-blur-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid grid-cols-4 max-w-2xl mx-auto">
            {items.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/discover" && pathname.startsWith(to));
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 transition-all",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-xl transition-all",
                        active && "bg-primary/15 scale-110"
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
