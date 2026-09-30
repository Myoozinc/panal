import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  ChevronRight,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Shield,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { AdminSendEmailModal } from "@/components/admin/AdminSendEmailModal";
import { AdminOfficialChatModal } from "@/components/admin/AdminOfficialChatModal";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from "@/types/panal";

const AdminUsers = () => {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [emailModalUser, setEmailModalUser] = useState<{
    name: string;
    email: string;
    username?: string;
  } | null>(null);

  const [officialChatUser, setOfficialChatUser] = useState<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  } | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async (): Promise<AdminUser[]> => {
      // 1. Try RPC get_admin_users (includes auth email)
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_admin_users");
        if (!rpcErr && rpcData && Array.isArray(rpcData)) {
          return rpcData as AdminUser[];
        }
      } catch {
        // Fallback below
      }

      // 2. Fallback: query profiles directly
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      return (profiles ?? []) as AdminUser[];
    },
  });

  // Client-side search filter by display_name, username, or email
  const filteredUsers = data.filter((u) => {
    if (!q.trim()) return true;
    const term = q.trim().toLowerCase();
    const name = (u.display_name || "").toLowerCase();
    const username = (u.username || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const disc = (u.discipline || "").toLowerCase();
    return name.includes(term) || username.includes(term) || email.includes(term) || disc.includes(term);
  });

  const handleCopyEmail = (e: React.MouseEvent, email?: string, id?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email) {
      toast({ variant: "destructive", title: "Sin correo disponible" });
      return;
    }
    navigator.clipboard.writeText(email);
    if (id) setCopiedId(id);
    toast({ title: "Correo copiado", description: email });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top search & quick broadcast link */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, usuario (@) o correo electrónico..."
            className="pl-9 rounded-full bg-card"
          />
        </div>
        <Link to="/admin/broadcast">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs w-full sm:w-auto h-9">
            <Megaphone className="w-3.5 h-3.5 text-primary" />
            Difusión Masiva
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin resultados.</p>
      ) : (
        <div className="bg-card border border-border/40 rounded-2xl divide-y divide-border/40">
          {filteredUsers.map((p) => {
            const hasEmail = !!p.email && p.email.includes("@");
            return (
              <Link
                key={p.id}
                to={`/admin/users/${p.id}`}
                className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback>{p.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                    <span>{p.display_name ?? "Sin nombre"}</span>
                    {p.is_verified && <VerifiedBadge size={13} />}
                  </div>

                  <div className="text-xs text-muted-foreground truncate">
                    @{p.username ?? "—"} · {p.discipline ?? "—"}
                  </div>

                  {/* Registered Email Line */}
                  <div className="text-xs font-mono text-primary/90 mt-0.5 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 shrink-0 text-muted-foreground" />
                    <span>{hasEmail ? p.email : "Sin correo cargado"}</span>
                    {hasEmail && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyEmail(e, p.email, p.id)}
                        className="p-1 hover:text-foreground text-muted-foreground rounded transition-colors"
                        title="Copiar correo"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Direct Email Modal button */}
                  {hasEmail && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEmailModalUser({
                          name: p.display_name || "Usuario",
                          email: p.email!,
                          username: p.username || undefined,
                        });
                      }}
                      title="Enviar correo a este usuario"
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Official App Support Chat button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOfficialChatUser({
                        id: p.id,
                        display_name: p.display_name,
                        username: p.username,
                        avatar_url: p.avatar_url,
                        is_verified: p.is_verified,
                      });
                    }}
                    title="Chat Oficial de la App (Equipo Panal)"
                    className="w-8 h-8 rounded-full text-primary hover:bg-primary/15 relative"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <Shield className="w-2.5 h-2.5 absolute top-1 right-1 fill-primary" />
                  </Button>

                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AdminSendEmailModal
        open={!!emailModalUser}
        onOpenChange={(open) => !open && setEmailModalUser(null)}
        recipient={emailModalUser}
      />

      <AdminOfficialChatModal
        open={!!officialChatUser}
        onOpenChange={(open) => !open && setOfficialChatUser(null)}
        targetUser={officialChatUser}
      />
    </div>
  );
};

export default AdminUsers;
