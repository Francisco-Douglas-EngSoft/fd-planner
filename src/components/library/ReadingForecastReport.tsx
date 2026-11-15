import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Download, Hourglass, ListOrdered, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { BookRow } from "@/services/libraryService";
import {
  buildReadingSchedule,
  firstReadDates,
  forecastPeriods,
  formatMinutes,
  type ScheduledBook,
} from "@/lib/readingForecast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  books: BookRow[];
  sessions: { book_id: string; date: string }[];
  dailyPages: number;
  dailyMinutes: number;
  planStart: string;
  planEnd: string;
}

const PAGE_SIZE = 25;
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");
const fmtShort = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const STATUS_LABEL: Record<ScheduledBook["status"], string> = {
  reading: "Em leitura",
  queued: "Na fila",
  completed: "Concluído",
  no_pages: "Sem páginas",
};

function StatusBadge({ status }: { status: ScheduledBook["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap font-medium",
        status === "reading" && "border-primary/40 text-primary",
        status === "completed" && "border-success/40 text-success",
        status === "no_pages" && "border-warning/40 text-warning",
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function DeadlineMark({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-muted-foreground">—</span>;
  return ok ? (
    <span className="text-success font-medium">No prazo</span>
  ) : (
    <span className="text-destructive font-medium">Após o prazo</span>
  );
}

function DateCell({ date, projected }: { date: Date | null; projected: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-foreground tabular-nums">{fmt(date)}</div>
      {date && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {projected ? "previsto" : "real"}
        </div>
      )}
    </div>
  );
}

export function ReadingForecastReport({ books, sessions, dailyPages, dailyMinutes, planStart, planEnd }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<"queue" | "completed">("queue");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  const firstRead = useMemo(() => firstReadDates(sessions), [sessions]);

  const schedule = useMemo(
    () =>
      buildReadingSchedule({
        books,
        dailyPages,
        dailyMinutes,
        startISO: planStart,
        deadlineISO: planEnd,
        firstReadByBook: firstRead,
      }),
    [books, dailyPages, dailyMinutes, planStart, planEnd, firstRead],
  );

  const periods = useMemo(
    () => forecastPeriods({ schedule, dailyPages, dailyMinutes, startISO: planStart }),
    [schedule, dailyPages, dailyMinutes, planStart],
  );

  const queue = schedule.filter((b) => b.status === "reading" || b.status === "queued");
  const completed = schedule.filter((b) => b.status === "completed");
  const noPages = schedule.filter((b) => b.status === "no_pages");
  const rows = view === "queue" ? queue : completed;
  const visible = rows.slice(0, limit);

  const onTime = queue.filter((b) => b.withinDeadline).length;
  const queueEnd = queue.length ? queue[queue.length - 1].end : null;
  const queueMinutes = queue.reduce((a, b) => a + b.estimatedMinutes, 0);
  const sized = schedule.filter((b) => b.totalPages > 0);
  const avgPages = sized.length ? Math.round(sized.reduce((a, b) => a + b.totalPages, 0) / sized.length) : 0;
  const startLabel = periods[0] ? periods[0].from.toLocaleDateString("pt-BR") : "";

  async function handleExport() {
    setExporting(true);
    try {
      const { exportReadingReportPdf } = await import("@/lib/readingReportPdf");
      await exportReadingReportPdf({
        userName: (user?.user_metadata?.full_name as string | undefined) || user?.email || "",
        dailyPages,
        dailyMinutes,
        planStart,
        planEnd,
        periods,
        schedule,
      });
    } catch {
      toast.error("Não foi possível gerar o PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Previsão de leitura
          </CardTitle>
          <CardDescription>
            Com <span className="text-foreground font-medium">{dailyPages} pág./dia</span> e{" "}
            <span className="text-foreground font-medium">{dailyMinutes} min/dia</span>, a partir de{" "}
            {startLabel}. Atualiza na hora quando você muda as metas.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? "Gerando..." : "Exportar PDF"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Previsão por período */}
        <div className="grid gap-px bg-border border border-border grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {periods.map((p) => (
            <div key={p.key} className="bg-card p-3 sm:p-4 space-y-2 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{p.days} dias</span>
              </div>
              <div>
                <p className="text-3xl font-bold font-display tabular-nums leading-none">{p.booksFinished}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  livro{p.booksFinished === 1 ? "" : "s"} da sua fila
                </p>
              </div>
              <div className="text-[11px] space-y-0.5 text-muted-foreground">
                <p>
                  <span className="text-foreground tabular-nums">{p.pages.toLocaleString("pt-BR")}</span> páginas ·{" "}
                  <span className="text-foreground">{formatMinutes(p.minutes)}</span>
                </p>
                {avgPages > 0 && (
                  <p title={`Média de ${avgPages} páginas por livro na sua biblioteca`}>
                    Capacidade ≈{" "}
                    <span className="text-foreground tabular-nums">{p.capacityBooks.toLocaleString("pt-BR")}</span> livros
                  </p>
                )}
                <p className="tabular-nums">
                  {fmtShort(p.from)} – {fmtShort(p.to)}
                </p>
              </div>
              {p.titles.length > 0 && (
                <ul className="pt-2 border-t border-border/60 space-y-0.5 text-[11px]">
                  {p.titles.slice(0, 3).map((t, i) => (
                    <li key={i} className="truncate text-foreground" title={t}>
                      {t}
                    </li>
                  ))}
                  {p.titles.length > 3 && <li className="text-muted-foreground">+{p.titles.length - 3} outros</li>}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Resumo da fila */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Summary icon={ListOrdered} label="Livros na fila" value={String(queue.length)} />
          <Summary
            icon={CheckCircle2}
            label="Terminam no prazo"
            value={queue.length ? `${onTime} de ${queue.length}` : "—"}
            tone={queue.length && onTime < queue.length ? "warning" : "default"}
          />
          <Summary icon={CalendarClock} label="Fila concluída em" value={fmt(queueEnd)} />
          <Summary icon={Hourglass} label="Tempo estimado" value={formatMinutes(queueMinutes)} />
        </div>

        {/* Cronograma */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Cronograma de leitura</h3>
            <Tabs
              value={view}
              onValueChange={(v) => {
                setView(v as "queue" | "completed");
                setLimit(PAGE_SIZE);
              }}
            >
              <TabsList className="h-8">
                <TabsTrigger value="queue" className="text-xs">Fila ({queue.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Concluídos ({completed.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {rows.length === 0 ? (
            <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {view === "queue"
                ? "Nenhum livro na fila. Adicione livros com o total de páginas para ver a previsão."
                : "Nenhum livro concluído ainda."}
            </p>
          ) : (
            <>
              {/* Tabela (telas médias e grandes) */}
              <div className="hidden md:block border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium w-10">#</th>
                      <th className="px-3 py-2 font-medium">Livro</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 font-medium w-40">Progresso</th>
                      <th className="px-3 py-2 font-medium">{view === "queue" ? "Início" : "Começou"}</th>
                      <th className="px-3 py-2 font-medium">{view === "queue" ? "Prazo p/ concluir" : "Concluído em"}</th>
                      <th className="px-3 py-2 font-medium text-right">Dias</th>
                      {view === "queue" && <th className="px-3 py-2 font-medium text-right">Tempo est.</th>}
                      {view === "queue" && <th className="px-3 py-2 font-medium">Prazo final</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{b.order ?? "—"}</td>
                        <td className="px-3 py-2.5 max-w-[260px]">
                          <p className="font-medium text-foreground truncate" title={b.title}>{b.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{b.author || "Autor desconhecido"}</p>
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={b.status} /></td>
                        <td className="px-3 py-2.5">
                          <Progress value={b.progressPct} className="h-1.5" />
                          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                            {b.readPages}/{b.totalPages} pág. · {b.progressPct}%
                          </p>
                        </td>
                        <td className="px-3 py-2.5"><DateCell date={b.start} projected={b.startIsProjected} /></td>
                        <td className="px-3 py-2.5"><DateCell date={b.end} projected={b.endIsProjected} /></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{b.days ?? "—"}</td>
                        {view === "queue" && (
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatMinutes(b.estimatedMinutes)}</td>
                        )}
                        {view === "queue" && (
                          <td className="px-3 py-2.5"><DeadlineMark ok={b.withinDeadline} /></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartões (celular) */}
              <ul className="md:hidden space-y-2">
                {visible.map((b) => (
                  <li key={b.id} className="border border-border p-3 space-y-2 bg-card/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {b.order ? <span className="text-muted-foreground tabular-nums">{b.order}. </span> : null}
                          {b.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{b.author || "Autor desconhecido"}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <Progress value={b.progressPct} className="h-1.5" />
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-muted-foreground">{view === "queue" ? "Início" : "Começou"}</p>
                        <DateCell date={b.start} projected={b.startIsProjected} />
                      </div>
                      <div>
                        <p className="text-muted-foreground">{view === "queue" ? "Prazo p/ concluir" : "Concluído em"}</p>
                        <DateCell date={b.end} projected={b.endIsProjected} />
                      </div>
                      <p className="text-muted-foreground tabular-nums">
                        {b.readPages}/{b.totalPages} pág. · {b.days ?? "—"} dias
                      </p>
                      {view === "queue" && (
                        <p className="text-right">
                          {formatMinutes(b.estimatedMinutes)} · <DeadlineMark ok={b.withinDeadline} />
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {rows.length > limit && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Mostrar mais ({rows.length - limit} restantes)
                </Button>
              )}
            </>
          )}

          {noPages.length > 0 && (
            <p className="text-[11px] text-warning">
              {noPages.length} livro{noPages.length === 1 ? "" : "s"} sem total de páginas não entra
              {noPages.length === 1 ? "" : "m"} na previsão — edite os dados do livro para incluí-lo
              {noPages.length === 1 ? "" : "s"}.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Ordem da fila: livros em leitura primeiro, depois os demais na ordem em que foram adicionados.
            O tempo estimado usa a sua velocidade das metas ({dailyPages} páginas em {dailyMinutes} min).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="border border-border bg-card/40 p-3 flex items-center gap-3 min-w-0">
      <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className={cn("text-sm sm:text-base font-bold font-display truncate", tone === "warning" && "text-warning")}>
          {value}
        </p>
      </div>
    </div>
  );
}
