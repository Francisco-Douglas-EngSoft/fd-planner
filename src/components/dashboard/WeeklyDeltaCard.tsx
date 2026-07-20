import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUp, ArrowDown, Minus, Timer, CheckCircle2, Flame } from "lucide-react";
import { formatDurationHuman } from "@/lib/timeUtils";

interface DeltaRow {
  label: string;
  current: string;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function WeeklyDeltaCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DeltaRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const thisStart = startOfWeek(now);
      const prevStart = new Date(thisStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(thisStart);
      prevEnd.setSeconds(prevEnd.getSeconds() - 1);

      const [focus, tasks] = await Promise.all([
        supabase
          .from("focus_sessions")
          .select("duration_minutes, completed_at")
          .eq("user_id", user.id)
          .eq("session_type", "work")
          .gte("completed_at", prevStart.toISOString()),
        supabase
          .from("tasks")
          .select("id, completed_at, status")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("completed_at", prevStart.toISOString()),
      ]);

      const focusData = focus.data ?? [];
      const taskData = tasks.data ?? [];

      const sumMins = (arr: typeof focusData, from: Date, to?: Date) =>
        arr
          .filter((s) => {
            const t = new Date(s.completed_at).getTime();
            return t >= from.getTime() && (!to || t <= to.getTime());
          })
          .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

      const curFocus = sumMins(focusData, thisStart);
      const prevFocus = sumMins(focusData, prevStart, prevEnd);

      const countTasks = (arr: typeof taskData, from: Date, to?: Date) =>
        arr.filter((t) => {
          if (!t.completed_at) return false;
          const ts = new Date(t.completed_at).getTime();
          return ts >= from.getTime() && (!to || ts <= to.getTime());
        }).length;

      const curTasks = countTasks(taskData, thisStart);
      const prevTasks = countTasks(taskData, prevStart, prevEnd);

      const dayMs = 86_400_000;
      const curDays = new Set(
        focusData
          .filter((s) => new Date(s.completed_at).getTime() >= thisStart.getTime())
          .map((s) => s.completed_at.slice(0, 10)),
      ).size;
      const prevDays = new Set(
        focusData
          .filter((s) => {
            const t = new Date(s.completed_at).getTime();
            return t >= prevStart.getTime() && t <= prevEnd.getTime();
          })
          .map((s) => s.completed_at.slice(0, 10)),
      ).size;

      const pct = (cur: number, prev: number) =>
        prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

      setRows([
        {
          label: "Foco (semana)",
          current: formatDurationHuman(curFocus),
          delta: pct(curFocus, prevFocus),
          icon: Timer,
          tint: "violet",
        },
        {
          label: "Tarefas concluídas",
          current: String(curTasks),
          delta: pct(curTasks, prevTasks),
          icon: CheckCircle2,
          tint: "emerald",
        },
        {
          label: "Dias ativos",
          current: `${curDays}d`,
          delta: pct(curDays, prevDays),
          icon: Flame,
          tint: "orange",
        },
      ]);
      void dayMs;
    })();
  }, [user]);

  if (!rows.length) return null;

  return (
    <Card className="border bg-card shadow-card">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Semana atual vs. anterior</h3>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Δ %
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {rows.map((r) => {
            const up = r.delta > 0;
            const flat = r.delta === 0;
            const Icon = r.icon;
            const DeltaIcon = flat ? Minus : up ? ArrowUp : ArrowDown;
            const color = flat
              ? "text-muted-foreground"
              : up
                ? "text-emerald-500"
                : "text-red-500";
            return (
              <div
                key={r.label}
                className="tint-card flex items-center justify-between border p-3"
                style={{ ["--tint" as string]: `var(--tint-${r.tint})` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="tint-icon p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-base font-bold font-display">{r.current}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
                  <DeltaIcon className="h-3.5 w-3.5" />
                  {Math.abs(r.delta)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}