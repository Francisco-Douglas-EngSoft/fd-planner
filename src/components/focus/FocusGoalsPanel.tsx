import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { BarChart3, CalendarDays, RefreshCcw, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WeeklyGoalType = "hours" | "tasks" | "sessions" | "focus_sessions";
type MonthlyGoalType = "hours" | "courses" | "tasks" | "focus_sessions";

interface WeeklyGoalRow {
  id: string;
  title: string;
  goal_type: WeeklyGoalType;
  target_value: number;
  current_value: number;
  is_completed: boolean | null;
  week_start: string;
  week_end: string;
}

interface MonthlyGoalRow {
  id: string;
  title: string;
  goal_type: MonthlyGoalType;
  target_value: number;
  current_value: number;
  is_completed: boolean | null;
  month_start: string;
  month_end: string;
}

type GoalView = {
  id: string;
  period: "weekly" | "monthly";
  title: string;
  unit: string;
  current: number;
  target: number;
  percent: number;
  isCompleted: boolean;
};

const ALERT_SETTINGS_KEY = "fdplanner_focus_goal_alert_settings";
const ALERT_KEY_PREFIX = "fdplanner_goal_alert";

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function FocusGoalsPanel({ className }: { className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoalRow[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoalRow[]>([]);

  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(ALERT_SETTINGS_KEY);
    if (!saved) return true;
    try {
      const parsed = JSON.parse(saved) as { enabled?: boolean };
      return parsed.enabled !== false;
    } catch {
      return true;
    }
  });

  const [nearThreshold, setNearThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(ALERT_SETTINGS_KEY);
    if (!saved) return 80;
    try {
      const parsed = JSON.parse(saved) as { threshold?: number };
      const t = safeNumber(parsed.threshold);
      return t >= 50 && t <= 95 ? Math.round(t) : 80;
    } catch {
      return 80;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      ALERT_SETTINGS_KEY,
      JSON.stringify({ enabled: alertsEnabled, threshold: nearThreshold })
    );
  }, [alertsEnabled, nearThreshold]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const [weeklyRes, monthlyRes] = await Promise.all([
        supabase
          .from("weekly_goals")
          .select("id,title,goal_type,target_value,current_value,is_completed,week_start,week_end")
          .eq("user_id", user.id)
          .gte("week_start", format(weekStart, "yyyy-MM-dd"))
          .lte("week_end", format(weekEnd, "yyyy-MM-dd"))
          .order("created_at", { ascending: false }),
        supabase
          .from("monthly_goals")
          .select("id,title,goal_type,target_value,current_value,is_completed,month_start,month_end")
          .eq("user_id", user.id)
          .gte("month_start", format(monthStart, "yyyy-MM-dd"))
          .lte("month_end", format(monthEnd, "yyyy-MM-dd"))
          .order("created_at", { ascending: false }),
      ]);

      setWeeklyGoals((weeklyRes.data as WeeklyGoalRow[]) ?? []);
      setMonthlyGoals((monthlyRes.data as MonthlyGoalRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const computeProgress = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd") + "T23:59:59";
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd") + "T23:59:59";

    const [weekFocus, weekTasks, monthFocusCount, monthTasksCount, monthCoursesDone, monthCourseHours] =
      await Promise.all([
        supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .eq("session_type", "work")
          .gte("completed_at", weekStart)
          .lte("completed_at", weekEnd),
        supabase
          .from("tasks")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("completed_at", weekStart)
          .lte("completed_at", weekEnd),
        supabase
          .from("focus_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("session_type", "work")
          .gte("completed_at", monthStart)
          .lte("completed_at", monthEnd),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("completed_at", monthStart)
          .lte("completed_at", monthEnd),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed"),
        supabase.from("courses").select("completed_hours").eq("user_id", user.id),
      ]);

    const weekTotalMinutes = (weekFocus.data ?? []).reduce(
      (sum, r) => sum + safeNumber((r as { duration_minutes?: number }).duration_minutes),
      0
    );
    const weekHours = weekTotalMinutes / 60;
    const weekSessions = (weekFocus.data ?? []).length;
    const weekCompletedTasks = (weekTasks.data ?? []).length;

    const monthFocusSessions = monthFocusCount.count ?? 0;
    const monthCompletedTasks = monthTasksCount.count ?? 0;
    const monthCompletedCourses = monthCoursesDone.count ?? 0;
    const monthHours = (monthCourseHours.data ?? []).reduce(
      (sum, r) => sum + safeNumber((r as { completed_hours?: number }).completed_hours),
      0
    );

    setWeeklyGoals((prev) =>
      prev.map((g) => {
        let current = safeNumber(g.current_value);
        if (g.goal_type === "hours") current = weekHours;
        else if (g.goal_type === "tasks") current = weekCompletedTasks;
        else if (g.goal_type === "sessions" || g.goal_type === "focus_sessions") current = weekSessions;

        const target = safeNumber(g.target_value);
        const isCompleted = target > 0 ? current >= target : false;
        return { ...g, current_value: current, is_completed: isCompleted };
      })
    );

    setMonthlyGoals((prev) =>
      prev.map((g) => {
        let current = safeNumber(g.current_value);
        if (g.goal_type === "hours") current = monthHours;
        else if (g.goal_type === "tasks") current = monthCompletedTasks;
        else if (g.goal_type === "courses") current = monthCompletedCourses;
        else if (g.goal_type === "focus_sessions") current = monthFocusSessions;

        const target = safeNumber(g.target_value);
        const isCompleted = target > 0 ? current >= target : false;
        return { ...g, current_value: current, is_completed: isCompleted };
      })
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchGoals();
  }, [user, fetchGoals]);

  useEffect(() => {
    if (!user) return;
    // Após carregar as metas, calcula o progresso real.
    // (mantemos isso separado para evitar travar o primeiro paint)
    computeProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weeklyGoals.length, monthlyGoals.length]);

  // Realtime refresh: quando uma sessão de foco é salva, atualizamos progresso.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("focus-goals-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "focus_sessions", filter: `user_id=eq.${user.id}` },
        () => {
          computeProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, computeProgress]);

  const goals: GoalView[] = useMemo(() => {
    const mapWeekly = weeklyGoals.map((g): GoalView => {
      const target = safeNumber(g.target_value);
      const current = safeNumber(g.current_value);
      const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const isCompleted = Boolean(g.is_completed) || (target > 0 && current >= target);

      return {
        id: g.id,
        period: "weekly",
        title: g.title,
        unit: g.goal_type === "hours" ? "h" : "",
        current,
        target,
        percent,
        isCompleted,
      };
    });

    const mapMonthly = monthlyGoals.map((g): GoalView => {
      const target = safeNumber(g.target_value);
      const current = safeNumber(g.current_value);
      const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const isCompleted = Boolean(g.is_completed) || (target > 0 && current >= target);

      return {
        id: g.id,
        period: "monthly",
        title: g.title,
        unit: g.goal_type === "hours" ? "h" : "",
        current,
        target,
        percent,
        isCompleted,
      };
    });

    return [...mapWeekly, ...mapMonthly];
  }, [weeklyGoals, monthlyGoals]);

  // Alerts (near completion + completed) - only once per goal per day.
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!goals.length) return;

    const todayKey = getTodayKey();

    for (const g of goals) {
      const target = g.target;
      if (target <= 0) continue;

      const nearKey = `${ALERT_KEY_PREFIX}:${g.period}:${g.id}:${todayKey}:near`;
      const doneKey = `${ALERT_KEY_PREFIX}:${g.period}:${g.id}:${todayKey}:done`;

      if (g.isCompleted) {
        if (!localStorage.getItem(doneKey)) {
          localStorage.setItem(doneKey, "1");
          toast({
            title: "🎉 Meta atingida!",
            description: `${g.period === "weekly" ? "Meta semanal" : "Meta mensal"}: ${g.title}`,
          });
        }
        continue;
      }

      if (g.percent >= nearThreshold && g.percent < 100) {
        if (!localStorage.getItem(nearKey)) {
          localStorage.setItem(nearKey, "1");
          toast({
            title: "Quase lá…",
            description: `${g.period === "weekly" ? "Meta semanal" : "Meta mensal"}: ${g.title} (${Math.round(
              g.percent
            )}%)`,
          });
        }
      }
    }
  }, [alertsEnabled, nearThreshold, goals, toast]);

  const weekly = goals.filter((g) => g.period === "weekly");
  const monthly = goals.filter((g) => g.period === "monthly");

  const renderGoal = (g: GoalView) => {
    const unitLabel = g.unit === "h" ? "h" : "";
    const valueLabel =
      unitLabel === "h"
        ? `${g.current.toFixed(1)} / ${g.target.toFixed(1)}h`
        : `${Math.round(g.current)} / ${Math.round(g.target)}`;

    return (
      <div key={g.id} className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{g.title}</p>
            <p className="text-xs text-muted-foreground">{valueLabel}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs shrink-0",
              g.isCompleted && "border-success/30 text-success bg-success/10"
            )}
          >
            {g.isCompleted ? "Concluída" : `${Math.round(g.percent)}%`}
          </Badge>
        </div>
        <Progress value={g.percent} className="h-2" />
      </div>
    );
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Metas (Semana/Mês)
          </CardTitle>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={async () => {
              await fetchGoals();
              await computeProgress();
              toast({ title: "Atualizado", description: "Progresso das metas recalculado." });
            }}
            disabled={loading}
            title="Recalcular metas"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium">Alertas</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Avisar quando estiver perto de bater a meta
              </p>
            </div>
            <Switch checked={alertsEnabled} onCheckedChange={(v) => setAlertsEnabled(Boolean(v))} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium">Limite</p>
              <p className="text-[11px] text-muted-foreground truncate">Disparar a partir de</p>
            </div>
            <Select
              value={String(nearThreshold)}
              onValueChange={(v) => setNearThreshold(Math.min(95, Math.max(50, Number(v))))}
            >
              <SelectTrigger className="h-8 w-[92px]">
                <SelectValue placeholder="80%" />
              </SelectTrigger>
              <SelectContent>
                {[70, 80, 90].map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {v}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Semana
            <Badge variant="secondary" className="ml-auto">
              {weekly.length}
            </Badge>
          </div>
          {weekly.length ? (
            <div className="space-y-3">{weekly.map(renderGoal)}</div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              Nenhuma meta semanal cadastrada.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-primary" />
            Mês
            <Badge variant="secondary" className="ml-auto">
              {monthly.length}
            </Badge>
          </div>
          {monthly.length ? (
            <div className="space-y-3">{monthly.map(renderGoal)}</div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              Nenhuma meta mensal cadastrada.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
