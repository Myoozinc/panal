import { Bell, Heart, Sparkles, MessageCircle, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, markNotificationsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/independent";

const iconFor = (t: AppNotification["type"]) => {
  switch (t) {
    case "like": return <Heart className="w-4 h-4 text-pink-500" />;
    case "match": return <Sparkles className="w-4 h-4 text-primary" />;
    case "message": return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "collab_tag": return <UserPlus className="w-4 h-4 text-emerald-500" />;
  }
};

const labelFor = (t: AppNotification["type"]) => {
  switch (t) {
    case "like": return "Te dio like";
    case "match": return "¡Nuevo match!";
    case "message": return "Nuevo mensaje";
    case "collab_tag": return "Te etiquetó en una colaboración";
  }
};

const linkFor = (n: AppNotification) => {
  switch (n.type) {
    case "match": return "/matches";
    case "message": return n.entity_id ? `/chat/${n.entity_id}` : "/matches";
    case "like": return "/discover";
    case "collab_tag": return "/feed";
  }
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (open && unread > 0 && user?.id) {
      markNotificationsRead(user.id).then(() => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
      });
    }
  }, [open, unread, user?.id, qc]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-accent transition-colors" aria-label="Notificaciones">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-y-auto p-0">
        <div className="px-4 py-3 border-b border-border/40">
          <h3 className="font-bold text-sm">Notificaciones</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sin notificaciones aún</div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  to={linkFor(n)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors",
                    !n.read_at && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5">{iconFor(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{labelFor(n.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
