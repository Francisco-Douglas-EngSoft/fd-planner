import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, FolderOpen, Layers, CheckCircle2, Hourglass, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { summarizeCategoryHours, type CourseHoursInput } from '@/lib/categoryHours';

export const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface Props {
  /** Courses from the current tab (Em Andamento / Concluídos). */
  tabCourses: CourseHoursInput[];
  /** Every course of the user, regardless of tab. */
  allCourses: CourseHoursInput[];
  tabLabel: string;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onClose: () => void;
}

export function CategoryHoursPanel({
  tabCourses,
  allCourses,
  tabLabel,
  selectedCategory,
  onSelectCategory,
  onClose,
}: Props) {
  const [scope, setScope] = useState<'tab' | 'all'>('tab');
  const summary = useMemo(
    () => summarizeCategoryHours(scope === 'tab' ? tabCourses : allCourses),
    [scope, tabCourses, allCourses],
  );
  const { overall, categories } = summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Horas por categoria</h3>
                <p className="text-xs text-muted-foreground">Soma da carga horária dos cursos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
                {(['tab', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={cn(
                      'rounded-md px-2.5 py-1 font-medium transition-colors',
                      scope === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s === 'tab' ? tabLabel : 'Todos os cursos'}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar horas por categoria">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Overall totals */}
          <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-4">
            {[
              { icon: Layers, label: 'Soma de todos os cursos', value: formatHoursHMS(overall.totalHours), accent: true },
              { icon: CheckCircle2, label: 'Horas concluídas', value: formatHoursHMS(overall.completedHours) },
              { icon: Hourglass, label: 'Horas restantes', value: formatHoursHMS(overall.remainingHours) },
              { icon: FolderOpen, label: 'Categorias · Cursos', value: `${categories.length} · ${overall.courses}` },
            ].map((s) => (
              <div key={s.label} className="bg-card px-4 py-3 sm:px-5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </p>
                <p className={cn('mt-1 font-mono text-lg font-semibold tabular-nums', s.accent ? 'text-primary' : 'text-foreground')}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Per category */}
          {categories.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhum curso para somar.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {categories.map((c) => (
                <li key={c.category}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(c.category)}
                    className={cn(
                      'grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:px-5',
                      selectedCategory === c.category && 'bg-primary/5',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                        <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{c.category}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.courses} curso(s) · {Math.round(c.share)}% do total
                      </p>
                    </div>
                    <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                      <Progress value={c.progress} className="h-1.5" />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatHoursHMS(c.completedHours)} concluídas · {Math.round(c.progress)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatHoursHMS(c.totalHours)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">total da categoria</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
