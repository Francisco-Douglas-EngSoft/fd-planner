import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { libraryService } from "@/services/libraryService";
import { getOfflineCoverUrl } from "@/lib/offlineBooks";

interface BookCoverProps {
  path?: string | null;
  title: string;
  /** Quando informado, usa a capa guardada no aparelho (livro offline). */
  bookId?: string;
  className?: string;
}

// Cache simples em memória para URLs assinadas de capas.
const cache = new Map<string, { url: string; expires: number }>();

export function BookCover({ path, title, bookId, className }: BookCoverProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!path) return;
    const now = Date.now();
    const cached = cache.get(path);
    if (cached && cached.expires > now + 60_000) {
      setUrl(cached.url);
      return;
    }
    setLoading(true);
    (async () => {
      const local = bookId ? await getOfflineCoverUrl(bookId) : null;
      if (local) return local;
      const signed = await libraryService.getSignedUrl(path, 3600);
      cache.set(path, { url: signed, expires: now + 3600 * 1000 });
      return signed;
    })()
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {
        if (alive) setUrl(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path, bookId]);

  return (
    <div
      className={
        "relative w-full aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-muted flex items-center justify-center " +
        (className ?? "")
      }
    >
      {url ? (
        <img
          src={url}
          alt={`Capa de ${title}`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setUrl(null)}
        />
      ) : loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col items-center gap-2 px-3 text-center">
          <FileText className="h-8 w-8 text-primary/60" />
          <span className="text-[11px] font-medium text-muted-foreground line-clamp-3">{title}</span>
        </div>
      )}
    </div>
  );
}
