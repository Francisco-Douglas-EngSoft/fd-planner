import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Network, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DueCard { id: string; front: string; topic: string | null; next_review: string | null }
interface LastBook { id: string; title: string; author: string | null; last_read_page: number | null; total_pages: number | null }
interface RecentMap { id: string; title: string; updated_at: string }

export function StudyHubWidgets() {
  const { user } = useAuth();
  const [due, setDue] = useState<DueCard[]>([]);
  const [book, setBook] = useState<LastBook | null>(null);
  const [maps, setMaps] = useState<RecentMap[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date().toISOString();
      const [dueRes, bookRes, mapRes] = await Promise.all([
        supabase
          .from("flashcards")
          .select("id, front, topic, next_review")
          .eq("user_id", user.id)
          .lte("next_review", now)
          .order("next_review", { ascending: true })
          .limit(5),
        supabase
          .from("books")
          .select("id, title, author, last_read_page, total_pages")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("mind_maps")
          .select("id, title, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(4),
      ]);
      setDue((dueRes.data ?? []) as DueCard[]);
      setBook((bookRes.data ?? null) as LastBook | null);
      setMaps((mapRes.data ?? []) as RecentMap[]);
    })();
  }, [user]);

  const pct = book && book.total_pages
    ? Math.min(100, Math.round(((book.last_read_page ?? 0) / book.total_pages) * 100))
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-violet)" }}>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="tint-icon rounded-lg p-1.5"><Brain className="h-4 w-4" /></div>
            Próximos flashcards
          </CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/flashcards">Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {due.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum card devido. Bom trabalho! 🎉</p>
          ) : (
            due.map((c) => (
              <div key={c.id} className="p-2 rounded-md border bg-background/60">
                <p className="text-sm line-clamp-2">{c.front}</p>
                {c.topic && <Badge variant="secondary" className="mt-1 text-[10px]">{c.topic}</Badge>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-blue)" }}>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="tint-icon rounded-lg p-1.5"><BookOpen className="h-4 w-4" /></div>
            Continuar leitura
          </CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/biblioteca">Biblioteca <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent>
          {!book ? (
            <p className="text-sm text-muted-foreground">Nenhum livro na biblioteca.</p>
          ) : (
            <Link to={`/leitor/${book.id}`} className="block space-y-2 hover:opacity-80">
              <p className="font-semibold line-clamp-2">{book.title}</p>
              {book.author && <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{pct}% concluído</p>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-emerald)" }}>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="tint-icon rounded-lg p-1.5"><Network className="h-4 w-4" /></div>
            Mapas mentais recentes
          </CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/mapas">Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {maps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum mapa mental ainda.</p>
          ) : (
            maps.map((m) => (
              <Link
                key={m.id}
                to={`/mapas/${m.id}`}
                className="flex items-center justify-between p-2 rounded-md border bg-background/60 hover:bg-background transition-colors"
              >
                <p className="text-sm line-clamp-1">{m.title}</p>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.updated_at).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}