import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { libraryService, type BookRow } from "@/services/libraryService";
import { isBookOffline, removeOfflineBook, saveOfflineBook } from "@/lib/offlineBooks";

/** Botão "Disponível offline": guarda o arquivo e a capa do livro no aparelho. */
export function OfflineBookToggle({ book }: { readonly book: BookRow }) {
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void isBookOffline(book.id).then((v) => alive && setOffline(v));
    return () => {
      alive = false;
    };
  }, [book.id]);

  async function toggle() {
    setBusy(true);
    try {
      if (offline) {
        await removeOfflineBook(book.id);
        setOffline(false);
        toast.success("Livro removido do aparelho");
      } else {
        const fileUrl = await libraryService.getSignedUrl(book.file_path, 600);
        const coverUrl = book.cover_path ? await libraryService.getSignedUrl(book.cover_path, 600).catch(() => null) : null;
        await saveOfflineBook({ id: book.id, title: book.title, fileUrl, coverUrl });
        setOffline(true);
        toast.success("Livro disponível offline");
      }
    } catch {
      toast.error(offline ? "Não foi possível remover" : "Não foi possível baixar o livro. Verifique a internet e o espaço do aparelho.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={offline ? "secondary" : "outline"}
      className="flex-1 sm:flex-none gap-2"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={offline}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : offline ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <CloudDownload className="h-4 w-4" />
      )}
      {offline ? "Disponível offline" : "Baixar para ler offline"}
    </Button>
  );
}
