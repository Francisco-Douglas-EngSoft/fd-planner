import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark as BookmarkIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BookmarkRow = {
  id: string;
  book_id: string;
  page: number | null;
  chapter: string | null;
  text: string | null;
  created_at: string;
  books?: { title: string | null; author: string | null } | null;
};

export default function Bookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookmarks")
      .select("id, book_id, page, chapter, text, created_at, books ( title, author )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Falha ao carregar marcadores");
    } else {
      setItems((data ?? []) as unknown as BookmarkRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function remove(id: string) {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
    } else {
      setItems((prev) => prev.filter((b) => b.id !== id));
      toast.success("Marcador removido");
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Marcadores</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas as páginas que você marcou durante a leitura.</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
            <BookmarkIcon className="h-10 w-10" />
            <p>Nenhum marcador ainda. Abra um livro e clique em "Marcar".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((b) => (
            <Card key={b.id} className="tint-card">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold line-clamp-1">
                    {b.books?.title ?? "Livro"} — pág. {b.page ?? "—"}
                  </p>
                  {b.books?.author && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.books.author}</p>
                  )}
                  {b.chapter && <p className="text-xs text-muted-foreground mt-1">{b.chapter}</p>}
                  {b.text && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{b.text}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/leitor/${b.book_id}`)}>
                    Abrir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
