import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeletons";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { DISCIPLINES } from "@/lib/constants";
import type { Profile } from "@/types/panal";

const label = (d: Profile["discipline"]) => DISCIPLINES.find((x) => x.value === d)?.label ?? "Artista";

const SearchPage = () => {
  const { user } = useAuth();
  const [term, setTerm] = useState("");
  const q = term.trim();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search-profiles", q],
    enabled: q.length >= 2,
    queryFn: async (): Promise<Profile[]> => {
      const like = `%${q}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("onboarding_completed", true)
        .neq("id", user?.id ?? "")
        .or(`display_name.ilike.${like},username.ilike.${like},city.ilike.${like}`)
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  return (
    <div className="px-4 pt-6 pb-4">
      <PageHeader title="Buscar" subtitle="Encuentra artistas por nombre, usuario o ciudad" />

      <div className="relative mb-5">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nombre, usuario o ciudad"
          aria-label="Buscar artistas"
          className="pl-9 rounded-full"
        />
      </div>

      {q.length < 2 ? (
        <EmptyState icon={UserSearch} title="Escribe para buscar" description="Al menos 2 letras para ver resultados." />
      ) : isFetching ? (
        <ListSkeleton rows={4} />
      ) : results.length === 0 ? (
        <EmptyState icon={UserSearch} title="Sin resultados" description={`No encontramos a nadie con "${q}".`} />
      ) : (
        <ul className="space-y-2">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                to={`/profile/${p.username}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/40 transition-colors"
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback>{p.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate flex items-center gap-1">
                    {p.display_name}
                    {p.is_verified && <VerifiedBadge size={14} />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {label(p.discipline)}
                    {p.city ? ` · ${p.city}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchPage;
