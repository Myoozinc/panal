import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Heart, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

const CollabInteractions = ({ collabId, ownerId }: { collabId: string; ownerId: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openComments, setOpenComments] = useState(false);
  const [text, setText] = useState("");

  const { data: likes = [] } = useQuery({
    queryKey: ["collab-likes", collabId],
    queryFn: async () => {
      const { data, error } = await supabase.from("collab_likes").select("user_id").eq("collab_id", collabId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["collab-comments", collabId],
    enabled: openComments,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from("collab_comments")
        .select("id, user_id, content, created_at")
        .eq("collab_id", collabId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: authors } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", Array.from(new Set(rows.map((r) => r.user_id))));
      return rows.map((r) => ({ ...r, author: authors?.find((a) => a.id === r.user_id) ?? null }));
    },
  });

  const liked = likes.some((l: any) => l.user_id === user?.id);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (liked) {
        const { error } = await supabase.from("collab_likes").delete().eq("collab_id", collabId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collab_likes").insert({ collab_id: collabId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collab-likes", collabId] }),
    onError: (e: any) => toast({ variant: "destructive", title: "No se pudo guardar", description: e.message }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content || !user) return;
      const { error } = await supabase.from("collab_comments").insert({ collab_id: collabId, user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["collab-comments", collabId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "No se pudo comentar", description: e.message }),
  });

  const removeComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collab_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collab-comments", collabId] }),
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn("rounded-full gap-1.5 px-3", liked && "text-primary")}
          onClick={() => toggleLike.mutate()}
          aria-pressed={liked}
          aria-label={liked ? "Quitar me gusta" : "Me gusta"}
        >
          <Heart className={cn("w-4 h-4", liked && "fill-current")} />
          <span className="text-xs font-semibold">{likes.length}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full gap-1.5 px-3"
          onClick={() => setOpenComments((v) => !v)}
          aria-expanded={openComments}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">Comentarios</span>
        </Button>
      </div>

      {openComments && (
        <div className="mt-2 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Sé el primero en comentar.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={c.author?.avatar_url ?? undefined} />
                    <AvatarFallback>{c.author?.display_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${c.author?.username}`} className="text-xs font-bold truncate hover:underline">
                        {c.author?.display_name ?? "Usuario"}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                      </span>
                      {(c.user_id === user?.id || ownerId === user?.id) && (
                        <button
                          onClick={() => removeComment.mutate(c.id)}
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          aria-label="Borrar comentario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm break-words whitespace-pre-wrap">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); addComment.mutate(); }}
            className="flex gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un comentario..."
              maxLength={500}
              className="rounded-full h-10"
            />
            <Button type="submit" size="sm" className="rounded-full" disabled={!text.trim() || addComment.isPending}>
              {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CollabInteractions;
