import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isValid,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BurndownChartProps {
  startDate: string;
  endDate: string;
  totalHours: number;
  completedHours: number;
  studyDays: string[];
  dailyHours: number;
  planName?: string;
}

const dayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const safeParseISO = (value: string) => {
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const isStudyDay = (date: Date, studyDays: string[]): boolean => {
  const dayOfWeek = date.getDay();
  const selectedDayNumbers = studyDays.map((d) => dayMap[d]);
  return selectedDayNumbers.includes(dayOfWeek);
};

export function BurndownChart({
  startDate,
  endDate,
  totalHours,
  completedHours,
  studyDays,
}: BurndownChartProps) {
  const chartData = useMemo(() => {
    const start = safeParseISO(startDate);
    const end = safeParseISO(endDate);

    if (!start || !end || totalHours <= 0) return [];

    const today = startOfDay(new Date());
    const totalDays = differenceInDays(end, start) + 1;
    const data: Array<{
      date: string;
      dateLabel: string;
      expected: number;
      actual: number | null;
      isToday: boolean;
      isPast: boolean;
    }> = [];

    let totalStudyDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(start, i);
      if (isStudyDay(currentDate, studyDays)) {
        totalStudyDays++;
      }
    }

    const hoursPerStudyDay =
      totalStudyDays > 0 ? totalHours / totalStudyDays : 0;

    const daysElapsed = Math.max(0, differenceInDays(today, start));
    let studyDaysElapsed = 0;
    for (let i = 0; i <= Math.min(daysElapsed, totalDays - 1); i++) {
      const currentDate = addDays(start, i);
      if (isStudyDay(currentDate, studyDays)) {
        studyDaysElapsed++;
      }
    }

    const interval = totalDays > 60 ? 7 : totalDays > 30 ? 3 : 1;

    let studyDayCount = 0;

    for (let i = 0; i < totalDays; i += interval) {
      const currentDate = addDays(start, i);
      const isPast = isBefore(currentDate, today);
      const isToday = differenceInDays(currentDate, today) === 0;

      for (let j = i === 0 ? 0 : i - interval + 1; j <= i; j++) {
        const checkDate = addDays(start, j);
        if (isStudyDay(checkDate, studyDays)) {
          studyDayCount++;
        }
      }

      const expectedRemaining = Math.max(
        0,
        totalHours - studyDayCount * hoursPerStudyDay
      );

      let actualRemaining: number | null = null;
      if (isPast || isToday) {
        actualRemaining = totalHours - completedHours;
      }

      data.push({
        date: format(currentDate, "yyyy-MM-dd"),
        dateLabel: format(currentDate, "d MMM", { locale: ptBR }),
        expected: Math.round(expectedRemaining * 10) / 10,
        actual:
          actualRemaining !== null
            ? Math.round(actualRemaining * 10) / 10
            : null,
        isToday,
        isPast: isPast || isToday,
      });
    }

    const lastDayIndex = totalDays - 1;
    if (lastDayIndex % interval !== 0) {
      const lastDate = addDays(start, lastDayIndex);
      data.push({
        date: format(lastDate, "yyyy-MM-dd"),
        dateLabel: format(lastDate, "d MMM", { locale: ptBR }),
        expected: 0,
        actual: null,
        isToday: false,
        isPast: false,
      });
    }

    return data;
  }, [startDate, endDate, totalHours, completedHours, studyDays]);

  const remainingHours = totalHours - completedHours;
  const start = safeParseISO(startDate);
  const end = safeParseISO(endDate);
  const today = new Date();

  let status: "ahead" | "on-track" | "behind" | "completed" | "not-started" =
    "not-started";
  let statusMessage = "";
  let behindPercent = 0;

  if (start && end) {
    if (isBefore(today, start)) {
      status = "not-started";
      statusMessage = "Plano ainda não iniciado";
    } else if (completedHours >= totalHours) {
      status = "completed";
      statusMessage = "Plano concluído!";
    } else {
      const totalDays = differenceInDays(end, start) + 1;
      const elapsedDays = differenceInDays(today, start) + 1;
      const expectedProgress = (elapsedDays / totalDays) * totalHours;
      const actualProgress = completedHours;

      if (actualProgress >= expectedProgress * 1.1) {
        status = "ahead";
        statusMessage = `${Math.round(
          (actualProgress / expectedProgress - 1) * 100
        )}% à frente do cronograma`;
      } else if (actualProgress >= expectedProgress * 0.9) {
        status = "on-track";
        statusMessage = "No ritmo planejado";
      } else {
        status = "behind";
        behindPercent = Math.round(
          (1 - actualProgress / expectedProgress) * 100
        );
        statusMessage = `${behindPercent}% atrás do cronograma`;
      }
    }
  }

  const statusConfig = {
    ahead: {
      icon: TrendingDown,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/50",
    },
    "on-track": {
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/50",
    },
    behind: {
      icon: AlertTriangle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/50",
    },
    completed: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/50",
    },
    "not-started": {
      icon: Target,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-border",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (chartData.length === 0) {
    return null;
  }

  const formatHoursDisplay = (hours: number): string => {
    if (hours >= 100) {
      return `${Math.round(hours)}h`;
    }
    return `${hours.toFixed(1)}h`;
  };

  return (
    <Card className={`${config.bg} ${config.border} border-2`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Gráfico de Burndown
          </CardTitle>
          <Badge
            variant="outline"
            className={`${config.color} ${config.border}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusMessage}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="expectedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="actualGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => formatHoursDisplay(value)}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: "bold",
                }}
                formatter={(value: number, name: string) => [
                  `${formatHoursDisplay(value)}`,
                  name === "expected" ? "Esperado" : "Real",
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === "expected" ? "Progresso Esperado" : "Progresso Real"
                }
                iconType="line"
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Area
                type="monotone"
                dataKey="expected"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#expectedGradient)"
                dot={false}
                name="expected"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#actualGradient)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isToday && payload.actual !== null) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <></>;
                }}
                name="actual"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total do Plano</p>
            <p className="text-lg font-bold font-mono">
              {formatHoursDisplay(totalHours)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Concluído</p>
            <p className="text-lg font-bold font-mono text-primary">
              {formatHoursDisplay(completedHours)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className="text-lg font-bold font-mono text-accent">
              {formatHoursDisplay(remainingHours)}
            </p>
          </div>
        </div>

        {status === "behind" && behindPercent > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-600 dark:text-orange-400">
                Atenção: Plano atrasado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Você está {behindPercent}% atrás do cronograma. Considere
                aumentar as horas diárias de estudo ou revisar o plano para
                alcançar suas metas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
