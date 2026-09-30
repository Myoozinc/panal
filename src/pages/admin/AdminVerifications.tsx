import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status = "pending" | "approved" | "rejected";

const AdminVerifications = () => {
  const [status, setStatus] = useState<Status>("pending");
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications", status],
    queryFn: async () => {
      const { data: reqs, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (reqs ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, is_verified")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (reqs ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) }));
    },
  });

  const decide = async (id: string, userId: string, approve: boolean) => {
    if (!user) return;
    setActingId(id);
    try {
      const { error } = await supabase
        .from("verification_requests")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      if (approve) {
        const { error: pe } = await supabase
          .from("profiles")
          .update({ is_verified: true, verified_at: new Date().toISOString() })
          .eq("id", userId);
        if (pe) throw pe;
      }
      toast({ title: approve ? "Verificación aprobada" : "Verificación rechazada" });
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-count"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Sin solicitudes en este estado.</p>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <div key={r.id} className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{r.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.profile?.display_name ?? "Sin nombre"}</div>
                  <div className="text-xs text-muted-foreground">@{r.profile?.username ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Solicitado {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}>
                  {r.status}
                </Badge>
              </div>

              {r.notes && <p className="text-sm bg-muted/30 rounded-lg p-3">{r.notes}</p>}

              {r.evidence_url && (
                <a
                  href={r.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver evidencia
                </a>
              )}

              {status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => decide(r.id, r.user_id, true)}
                    disabled={actingId === r.id}
                  >
                    <Check className="w-4 h-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => decide(r.id, r.user_id, false)}
                    disabled={actingId === r.id}
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;
