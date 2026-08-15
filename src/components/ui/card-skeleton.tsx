import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Skeleton de card padrão — substitui overlays de spinner bloqueantes. */
export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn('elevation-flat', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" style={{ maxWidth: `${100 - i * 12}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Grade de skeletons para listas de cards. */
export function CardSkeletonGrid({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} rows={4} />
      ))}
    </div>
  );
}
