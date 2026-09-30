import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminReports = () => {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: async () => {
      const { data: reps, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((reps ?? []).flatMap((r) => [r.reporter_id, r.reported_user_id])));
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (reps ?? []).map((r) => ({
        ...r,
        reporter: byId.get(r.reporter_id),
        reported: byId.get(r.reported_user_id),
      }));
    },
  });

  const resolve = async (id: string) => {
    setActingId(id);
    try {
      const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
      if (error) throw error;
      toast({ title: "Reporte marcado como resuelto" });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-count"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
        <TabsList>
          <TabsTrigger value="open">Abiertos</TabsTrigger>
          <TabsTrigger value="resolved">Resueltos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Sin reportes en este estado.</p>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <div key={r.id} className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="destructive">{r.reason}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <UserCell label="Reportado" profile={r.reported} highlight />
                <UserCell label="Reporta" profile={r.reporter} />
              </div>

              {r.details && <p className="text-sm bg-muted/30 rounded-lg p-3">{r.details}</p>}

              {status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => resolve(r.id)} disabled={actingId === r.id}>
                    <Check className="w-4 h-4 mr-1" /> Marcar resuelto
                  </Button>
                  {r.reported?.username && (
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/profile/${r.reported.username}`}>
                        <ExternalLink className="w-4 h-4 mr-1" /> Ver perfil
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UserCell = ({
  label,
  profile,
  highlight,
}: {
  label: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
  highlight?: boolean;
}) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg ${highlight ? "bg-destructive/10" : "bg-muted/30"}`}>
    <Avatar className="w-9 h-9">
      <AvatarImage src={profile?.avatar_url ?? undefined} />
      <AvatarFallback>{profile?.display_name?.[0] ?? "?"}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{profile?.display_name ?? "—"}</div>
      <div className="text-xs text-muted-foreground truncate">@{profile?.username ?? "—"}</div>
    </div>
  </div>
);

export default AdminReports;
