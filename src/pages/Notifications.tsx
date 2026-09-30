import { Link } from "react-router-dom";
import { Bell, Heart, Sparkles, MessageCircle, UserPlus, CheckCheck, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, markNotificationsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/panal";

import { OFFICIAL_APP_USER_ID } from "@/lib/constants";

const iconFor = (n: AppNotification) => {
  if (n.actor_id === OFFICIAL_APP_USER_ID) {
    return <Shield className="w-4 h-4 text-primary" />;
  }
  switch (n.type) {
    case "like": return <Heart className="w-4 h-4 text-pink-500" />;
    case "match": return <Sparkles className="w-4 h-4 text-primary" />;
    case "message": return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "collab_tag": return <UserPlus className="w-4 h-4 text-emerald-500" />;
  }
};

const labelFor = (n: AppNotification) => {
  if (n.actor_id === OFFICIAL_APP_USER_ID) {
    return "Mensaje oficial de Panal 🐝";
  }
  switch (n.type) {
    case "like": return "Alguien te dio like";
    case "match": return "¡Nuevo match!";
    case "message": return "Nuevo mensaje";
    case "collab_tag": return "Te etiquetaron en una colaboración";
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

const Notifications = () => {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const qc = useQueryClient();

  const unread = notifications.filter((n) => !n.read_at);

  const markAll = async () => {
    if (!user || unread.length === 0) return;
    await markNotificationsRead(user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <PageHeader
        title="Notificaciones"
        subtitle={unread.length > 0 ? `${unread.length} sin leer` : "Estás al día"}
        action={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={markAll}>
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="text-xs">Marcar todo</span>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin notificaciones"
          description="Aquí verás tus likes, matches, mensajes y etiquetas en colaboraciones."
          actionLabel="Ir a Descubrir"
          actionTo="/discover"
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                to={linkFor(n)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                  n.read_at ? "bg-card border-border/40" : "bg-primary/5 border-primary/20"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {iconFor(n)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{labelFor(n)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
