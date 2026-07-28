import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Flame,
  Lock,
  RotateCcw,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BookRow } from "@/services/libraryService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionRow {
  date: string;
  pages_read: number | null;
  duration_minutes: number | null;
  book_id: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--success))",
];

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const BOOKS_GOAL_KEY = "fd:library:monthly-books-goal";

const iso = (d: Date) => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.toISOString().slice(0, 10);
};
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

/* ── Candlestick (semanal, páginas/dia: abertura, máxima, mínima, fechamento) ── */
function Candle(props: any) {
  const { x, width, payload, yAxis } = props;
  if (!payload || !yAxis?.scale) return null;
  const scale = yAxis.scale;
  const { open, close, high, low } = payload;
  const up = close >= open;
  const color = up ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const bodyTop = scale(Math.max(open, close));
  const bodyBottom = scale(Math.min(open, close));
  const bodyH = Math.max(2, bodyBottom - bodyTop);
  const cx = x + width / 2;
  const bodyW = Math.max(6, width * 0.5);
  return (
    <g>
      <line x1={cx} x2={cx} y1={scale(high)} y2={scale(low)} stroke={color} strokeWidth={1.5} />
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={up ? color : "transparent"} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

interface Props {
  books: BookRow[];
}

export function LibraryReports({ books }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPages, setDailyPages] = useState(20);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [monthlyBooks, setMonthlyBooks] = useState(2);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = iso(addDays(new Date(), -365));
      const [sRes, gRes] = await Promise.all([
        supabase
          .from("reading_sessions")
          .select("date, pages_read, duration_minutes, book_id")
          .eq("user_id", user.id)
          .gte("date", since)
          .order("date", { ascending: true }),
        supabase
          .from("reading_goals")
          .select("daily_pages_goal, daily_minutes_goal")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setSessions((sRes.data as SessionRow[]) ?? []);
      if (gRes.data) {
        setDailyPages(gRes.data.daily_pages_goal ?? 20);
        setDailyMinutes(gRes.data.daily_minutes_goal ?? 30);
      }
      const stored = Number(localStorage.getItem(BOOKS_GOAL_KEY));
      if (stored > 0) setMonthlyBooks(stored);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveGoals() {
    if (!user) return;
    setSaving(true);
    try {
      localStorage.setItem(BOOKS_GOAL_KEY, String(monthlyBooks));
      const { data: existing } = await supabase
        .from("reading_goals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const payload = {
        daily_pages_goal: dailyPages,
        daily_minutes_goal: dailyMinutes,
      };
      const { error } = existing
        ? await supabase.from("reading_goals").update(payload).eq("id", existing.id)
        : await supabase.from("reading_goals").insert({ user_id: user.id, ...payload });
      if (error) throw error;
      toast.success("Metas de leitura salvas");
    } catch {
      toast.error("Não foi possível salvar as metas");
    } finally {
      setSaving(false);
    }
  }

  /* ── agregações por dia ── */
  const byDay = useMemo(() => {
    const m = new Map<string, { pages: number; minutes: number }>();
    for (const s of sessions) {
      const k = s.date;
      const cur = m.get(k) ?? { pages: 0, minutes: 0 };
      cur.pages += s.pages_read ?? 0;
      cur.minutes += s.duration_minutes ?? 0;
      m.set(k, cur);
    }
    return m;
  }, [sessions]);

  async function handleReset() {
    if (!user?.email) return;
    if (!password) {
      toast.error("Digite sua senha para confirmar");
      return;
    }
    setResetting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        toast.error("Senha incorreta");
        return;
      }

      const [sess, bks, streak] = await Promise.all([
        supabase.from("reading_sessions").delete().eq("user_id", user.id),
        supabase
          .from("books")
          .update({ last_read_page: 0, status: "to_read" })
          .eq("user_id", user.id),
        supabase
          .from("user_streaks")
          .update({ current_streak: 0, longest_streak: 0, last_read_date: null })
          .eq("user_id", user.id),
      ]);
      if (sess.error || bks.error || streak.error) throw sess.error ?? bks.error ?? streak.error;

      setSessions([]);
      await queryClient.invalidateQueries({ queryKey: ["books", user.id] });
      toast.success("Progresso de leitura zerado");
      setResetOpen(false);
      setPassword("");
    } catch {
      toast.error("Não foi possível zerar o progresso");
    } finally {
      setResetting(false);
    }
  }

  const sumRange = (from: Date, to: Date) => {
    let pages = 0;
    let minutes = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const v = byDay.get(iso(d));
      if (v) {
        pages += v.pages;
        minutes += v.minutes;
      }
    }
    return { pages, minutes };
  };

  const today = new Date();

  /* ── metas por período ── */
  const periods = useMemo(() => {
    const startOfWeek = addDays(today, -((today.getDay() + 6) % 7));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const bimStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 2) * 2, 1);
    const semStart = new Date(today.getFullYear(), today.getMonth() < 6 ? 0 : 6, 1);
    const daysBetween = (a: Date, b: Date) =>
      Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;

    const defs = [
      { key: "daily", label: "Diária", from: today, to: today, months: 1 / 30 },
      { key: "weekly", label: "Semanal", from: startOfWeek, to: addDays(startOfWeek, 6), months: 7 / 30 },
      {
        key: "monthly",
        label: "Mensal",
        from: startOfMonth,
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
        months: 1,
      },
      {
        key: "bimonthly",
        label: "Bimestral",
        from: bimStart,
        to: new Date(bimStart.getFullYear(), bimStart.getMonth() + 2, 0),
        months: 2,
      },
      {
        key: "semiannual",
        label: "Semestral",
        from: semStart,
        to: new Date(semStart.getFullYear(), semStart.getMonth() + 6, 0),
        months: 6,
      },
      {
        key: "annual",
        label: "Anual",
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31),
        months: 12,
      },
    ];

    return defs.map((d) => {
      const totalDays = Math.max(1, daysBetween(d.from, d.to));
      const elapsedDays = Math.max(1, Math.min(totalDays, daysBetween(d.from, today)));
      const { pages, minutes } = sumRange(d.from, today);
      const pagesGoal = dailyPages * totalDays;
      const minutesGoal = dailyMinutes * totalDays;
      return {
        ...d,
        totalDays,
        elapsedDays,
        pages,
        minutes,
        pagesGoal,
        minutesGoal,
        expectedPages: dailyPages * elapsedDays,
        booksGoal: Math.max(1, Math.round(monthlyBooks * d.months)),
      };
    });
  }, [byDay, dailyPages, dailyMinutes, monthlyBooks]);

  /* ── barras: páginas por dia (últimos 30 dias) ── */
  const last30 = useMemo(() => {
    const out: { label: string; paginas: number; minutos: number; meta: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const v = byDay.get(iso(d));
      out.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        paginas: v?.pages ?? 0,
        minutos: v?.minutes ?? 0,
        meta: dailyPages,
      });
    }
    return out;
  }, [byDay, dailyPages]);

  /* ── linha: evolução mensal (12 meses) ── */
  const monthly = useMemo(() => {
    const out: { label: string; paginas: number; minutos: number; livros: number; metaLivros: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      const { pages, minutes } = sumRange(ref, end > today ? today : end);
      const livros = books.filter((b) => {
        if (b.status !== "completed") return false;
        const u = b.updated_at ? new Date(b.updated_at) : null;
        return !!u && u.getFullYear() === ref.getFullYear() && u.getMonth() === ref.getMonth();
      }).length;
      out.push({
        label: `${MONTHS_PT[ref.getMonth()]}/${String(ref.getFullYear()).slice(2)}`,
        paginas: pages,
        minutos: minutes,
        livros,
        metaLivros: monthlyBooks,
      });
    }
    return out;
  }, [byDay, books, monthlyBooks]);

  /* ── pizza: distribuição por categoria (páginas lidas) ── */
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of books) {
      const cat = (b.category ?? "").trim() || "Sem categoria";
      const read = Math.min(b.last_read_page ?? 0, b.total_pages ?? b.last_read_page ?? 0);
      if (read > 0) m.set(cat, (m.get(cat) ?? 0) + read);
    }
    return Array.from(m.entries())
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [books]);

  /* ── candlestick semanal (páginas/dia) ── */
  const candles = useMemo(() => {
    const out: { label: string; open: number; close: number; high: number; low: number; range: [number, number] }[] = [];
    const startOfWeek = addDays(today, -((today.getDay() + 6) % 7));
    for (let w = 11; w >= 0; w--) {
      const s = addDays(startOfWeek, -7 * w);
      const vals: number[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(s, i);
        if (d > today) break;
        vals.push(byDay.get(iso(d))?.pages ?? 0);
      }
      if (!vals.length) continue;
      const open = vals[0];
      const close = vals[vals.length - 1];
      out.push({
        label: `${s.getDate()}/${s.getMonth() + 1}`,
        open,
        close,
        high: Math.max(...vals),
        low: Math.min(...vals),
        range: [0, Math.max(...vals, 1)],
      });
    }
    return out;
  }, [byDay]);

  /* ── sequência de dias com leitura ── */
  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const v = byDay.get(iso(addDays(today, -i)));
      if (v && v.pages + v.minutes > 0) n++;
      else if (i > 0) break;
    }
    return n;
  }, [byDay]);

  const monthBooksDone = monthly[monthly.length - 1]?.livros ?? 0;
  const totalMinutes = sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const totalPages = sessions.reduce((a, s) => a + (s.pages_read ?? 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={BookOpen} label="Páginas (12 meses)" value={totalPages.toLocaleString("pt-BR")} />
        <Kpi icon={Clock} label="Horas de leitura" value={(totalMinutes / 60).toFixed(1)} />
        <Kpi icon={Flame} label="Sequência" value={`${streak} dia${streak === 1 ? "" : "s"}`} />
        <Kpi
          icon={Target}
          label="Livros no mês"
          value={`${monthBooksDone}/${monthlyBooks}`}
        />
      </div>

      {/* Metas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Metas de leitura
          </CardTitle>
          <CardDescription>
            Ao digitar páginas/minutos por dia e livros por mês, todos os prazos (semanal, mensal,
            bimestral, semestral e anual) são recalculados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-pages">Páginas por dia</Label>
              <Input
                id="g-pages"
                type="number"
                min={1}
                value={dailyPages}
                onChange={(e) => setDailyPages(Math.max(1, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-min">Minutos por dia</Label>
              <Input
                id="g-min"
                type="number"
                min={1}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Math.max(1, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-books">Livros por mês</Label>
              <Input
                id="g-books"
                type="number"
                min={1}
                value={monthlyBooks}
                onChange={(e) => setMonthlyBooks(Math.max(1, Number(e.target.value) || 0))}
              />
            </div>
            <div className="flex items-end gap-2 col-span-2 lg:col-span-1">
              <Button className="flex-1 gap-2 min-w-0" onClick={saveGoals} disabled={saving}>
                <Save className="h-4 w-4 shrink-0" /> <span className="truncate">Salvar metas</span>
              </Button>
              <Button
                variant="destructive"
                className="gap-2 shrink-0"
                onClick={() => setResetOpen(true)}
                title="Zerar progresso de leitura"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Zerar</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {periods.map((p) => {
              const pct = p.pagesGoal ? Math.min(100, Math.round((p.pages / p.pagesGoal) * 100)) : 0;
              const pctMin = p.minutesGoal ? Math.min(100, Math.round((p.minutes / p.minutesGoal) * 100)) : 0;
              const onPace = p.pages >= p.expectedPages;
              return (
                <div key={p.key} className="border border-border p-3 sm:p-4 space-y-3 bg-card/40 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold">{p.label}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {p.totalDays} dia{p.totalDays === 1 ? "" : "s"} · {p.elapsedDays} decorrido
                        {p.elapsedDays === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge variant={pct >= 100 ? "default" : "secondary"}>{pct}%</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Páginas</span>
                      <span>
                        {p.pages} / {p.pagesGoal}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Minutos</span>
                      <span>
                        {p.minutes} / {p.minutesGoal}
                      </span>
                    </div>
                    <Progress value={pctMin} className="h-2" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">
                      Meta de livros: <span className="text-foreground font-medium">{p.booksGoal}</span>
                    </span>
                    <span className={onPace ? "text-success" : "text-warning"}>
                      {onPace ? "No ritmo" : `Faltam ${Math.max(0, p.expectedPages - p.pages)} pág.`}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="border border-border p-3 sm:p-4 space-y-3 bg-card/40 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Livros no mês</span>
                <Badge variant={monthBooksDone >= monthlyBooks ? "default" : "secondary"}>
                  {monthlyBooks ? Math.min(100, Math.round((monthBooksDone / monthlyBooks) * 100)) : 0}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Concluídos</span>
                  <span>
                    {monthBooksDone} / {monthlyBooks}
                  </span>
                </div>
                <Progress
                  value={monthlyBooks ? Math.min(100, (monthBooksDone / monthlyBooks) * 100) : 0}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <ChartCard
          title="Páginas por dia (30 dias)"
          description="Barras diárias comparadas com a meta"
          icon={BookOpen}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="paginas" name="Páginas" fill="hsl(var(--primary))" />
              <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Evolução mensal"
          description="Páginas e minutos lidos nos últimos 12 meses"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="paginas" name="Páginas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="minutos" name="Minutos" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Distribuição por categoria"
          description="Páginas lidas por categoria de livro"
          icon={BookOpen}
        >
          {byCategory.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {byCategory.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n, p: any) => [`${v} páginas`, p.payload.name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard
          title="Candlestick semanal"
          description="Abertura, máxima, mínima e fechamento de páginas/dia por semana"
          icon={TrendingUp}
        >
          {candles.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(_v: any, _n: any, p: any) => {
                    const d = p.payload;
                    return [`A ${d.open} · Máx ${d.high} · Mín ${d.low} · F ${d.close}`, "Páginas/dia"];
                  }}
                />
                <Bar dataKey="high" shape={<Candle />} isAnimationActive={false} fill="transparent" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard
          title="Livros concluídos por mês"
          description="Comparado com a meta mensal de livros"
          icon={Target}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="livros" name="Concluídos" fill="hsl(var(--success))" />
              <Line type="monotone" dataKey="metaLivros" name="Meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Carregando relatórios...</p>}

      <Dialog
        open={resetOpen}
        onOpenChange={(o) => {
          setResetOpen(o);
          if (!o) setPassword("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" /> Zerar progresso de leitura
            </DialogTitle>
            <DialogDescription>
              Isso apaga todas as sessões de leitura, zera as páginas lidas de todos os livros e a
              sequência. Os livros continuam na biblioteca. Confirme com a senha da sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-pass">Senha da conta</Label>
            <Input
              id="reset-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReset();
              }}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting || !password}>
              {resetting ? "Zerando..." : "Confirmar e zerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">{children}</div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Sem dados de leitura ainda.
    </div>
  );
}

export default LibraryReports;