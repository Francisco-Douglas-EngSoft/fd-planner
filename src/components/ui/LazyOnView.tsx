import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Só monta o conteúdo quando ele chega perto da tela. Útil para gráficos
 * pesados abaixo da dobra: não atrasam a abertura da página.
 */
export function LazyOnView({
  children,
  minHeight = 280,
  rootMargin = '300px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (visivel || !ref.current) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visivel, rootMargin]);

  if (visivel) return <>{children}</>;
  return (
    <div ref={ref} style={{ minHeight }} aria-hidden>
      <Skeleton className="h-full w-full rounded-2xl" style={{ minHeight }} />
    </div>
  );
}
