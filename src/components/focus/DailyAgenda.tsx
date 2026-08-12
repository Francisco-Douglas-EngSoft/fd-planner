import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parse, isAfter, isBefore, isEqual, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Coffee,
  PlayCircle,
  BookOpen,
  AlertCircle,
  RefreshCcw,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimeBlock {
  id: string;
  study_plan_id: string;
  course_id: string | null;
  day_of_week: string;
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  block_type: "study" | "break";
  title: string | null;
}

interface Course {
  id: string;
  name: string;
  category?: string | null;
}

interface StudyPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface DailyAgendaProps {
  onStartSession: (courseId: string, durationMinutes: number) => void;
  className?: string;
  refreshKey?: number;
}

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function parseTime(timeStr: string): Date {
  // Handle HH:mm or HH:mm:ss
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return parse(normalized, "HH:mm:ss", new Date());
}

function formatTimeHM(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function getBlockDurationMinutes(start: string, end: string): number {
  const startDate = parseTime(start);
  const endDate = parseTime(end);
  return differenceInMinutes(endDate, startDate);
}

export function DailyAgenda({ onStartSession, className, refreshKey }: DailyAgendaProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  // Minutos estudados hoje por curso (todas as sessões focus do dia)
  const [studiedByCourse, setStudiedByCourse] = useState<Record<string, number>>({});

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  const todayDayOfWeek = DAY_MAP[new Date().getDay()];

  // Mapa: study_plan_id -> course_id ativo (próximo da sequência)
  const [planActiveCourse, setPlanActiveCourse] = useState<Record<string, string | null>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch active plans (today falls within start-end range)
      const { data: plansData } = await supabase
        .from("study_plans")
        .select("id, name, start_date, end_date, daily_hours, min_daily_hours, max_daily_hours")
        .eq("user_id", user.id)
        .lte("start_date", today)
        .gte("end_date", today);

      const activePlans = (plansData || []) as StudyPlan[];
      setPlans(activePlans);

      if (activePlans.length === 0) {
        setTimeBlocks([]);
        setCourses([]);
        setPlanActiveCourse({});
        return;
      }

      const planIds = activePlans.map((p) => p.id);

      // Fetch time blocks for today from all active plans
      const { data: blocksData } = await supabase
        .from("study_plan_time_blocks")
        .select("*")
        .in("study_plan_id", planIds)
        .eq("day_of_week", todayDayOfWeek);

      const blocks = (blocksData || []) as TimeBlock[];
      setTimeBlocks(blocks);

      // Para cada plano, descobrir o curso ativo (próximo na sequência)
      const { data: planCoursesData } = await supabase
        .from("study_plan_courses")
        .select("study_plan_id, course_id, sequence_order, is_completed, is_fixed")
        .in("study_plan_id", planIds);

      const activeMap: Record<string, string | null> = {};
      for (const planId of planIds) {
        const pcs = (planCoursesData || []).filter((pc: any) => pc.study_plan_id === planId);
        const sortedPc = [...pcs].sort(
          (a: any, b: any) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
        );
        const next = sortedPc.find((pc: any) => !pc.is_completed && !pc.is_fixed)
          || sortedPc.find((pc: any) => !pc.is_completed);
        activeMap[planId] = next?.course_id ?? null;
      }
      setPlanActiveCourse(activeMap);

      // Coleta IDs de cursos: explícitos nos blocos + ativos por plano
      const courseIdSet = new Set<string>();
      for (const b of blocks) if (b.course_id) courseIdSet.add(b.course_id);
      for (const id of Object.values(activeMap)) if (id) courseIdSet.add(id);

      if (courseIdSet.size > 0) {
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, name, category")
          .in("id", Array.from(courseIdSet));
        setCourses((coursesData || []) as Course[]);
      } else {
        setCourses([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, todayDayOfWeek]);

  // Busca minutos estudados hoje agrupados por curso
  const fetchStudiedToday = useCallback(async () => {
    if (!user) return;
    const dayStart = startOfDay(new Date()).toISOString();
    const dayEnd = endOfDay(new Date()).toISOString();
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("course_id, duration_minutes")
      .eq("user_id", user.id)
      .gte("completed_at", dayStart)
      .lte("completed_at", dayEnd);
    if (error || !data) return;
    const map: Record<string, number> = {};
    for (const row of data as Array<{ course_id: string | null; duration_minutes: number | null }>) {
      if (!row.course_id) continue;
      map[row.course_id] = (map[row.course_id] || 0) + (row.duration_minutes || 0);
    }
    setStudiedByCourse(map);
  }, [user]);

  useEffect(() => {
    fetchData();
    fetchStudiedToday();
  }, [fetchData, fetchStudiedToday, refreshKey]);

  // Sort blocks by start_time
  const sortedBlocks = useMemo(() => {
    return [...timeBlocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [timeBlocks]);

  // Find the next/current study block (skip breaks for suggestion)
  const suggestedBlock = useMemo(() => {
    const now = new Date();
    const nowTime = parse(format(now, "HH:mm:ss"), "HH:mm:ss", now);

    // Find the first study block that hasn't ended yet
    for (const block of sortedBlocks) {
      if (block.block_type !== "study") continue;
      const endTime = parseTime(block.end_time);
      if (isAfter(endTime, nowTime) || isEqual(endTime, nowTime)) {
        return block;
      }
    }
    return null;
  }, [sortedBlocks]);

  // Resolve course id de um bloco: usa course_id explícito ou o curso ativo do plano
  const resolveCourseId = useCallback(
    (block: Pick<TimeBlock, "course_id" | "study_plan_id">): string | null => {
      return block.course_id || planActiveCourse[block.study_plan_id] || null;
    },
    [planActiveCourse]
  );

  const getCourseName = (courseId: string | null): string => {
    if (!courseId) return "";
    return courses.find((c) => c.id === courseId)?.name || "Curso";
  };

  const getCourseCategory = (courseId: string | null): string | null | undefined => {
    if (!courseId) return null;
    return courses.find((c) => c.id === courseId)?.category;
  };

  const getPlanName = (planId: string): string => {
    return plans.find((p) => p.id === planId)?.name || "Plano";
  };

  const handleBlockClick = (block: TimeBlock) => {
    if (block.block_type !== "study") return;
    const cid = resolveCourseId(block);
    if (!cid) return;
    setSelectedBlock(block);
    setConfirmDialogOpen(true);
  };

  const handleConfirmStart = () => {
    if (!selectedBlock) return;
    const cid = resolveCourseId(selectedBlock);
    if (!cid) return;
    const duration = getBlockDurationMinutes(selectedBlock.start_time, selectedBlock.end_time);
    onStartSession(cid, duration);
    setConfirmDialogOpen(false);
    setSelectedBlock(null);
    toast({
      title: "Sessão iniciada!",
      description: `Iniciando ${duration} minutos de ${getCourseName(resolveCourseId(selectedBlock))}.`,
    });
  };

  const getBlockStatus = (block: TimeBlock): "past" | "current" | "upcoming" => {
    const now = new Date();
    const nowTime = parse(format(now, "HH:mm:ss"), "HH:mm:ss", now);
    const startTime = parseTime(block.start_time);
    const endTime = parseTime(block.end_time);

    if (isBefore(endTime, nowTime)) return "past";
    if ((isAfter(nowTime, startTime) || isEqual(nowTime, startTime)) && isBefore(nowTime, endTime)) {
      return "current";
    }
    return "upcoming";
  };

  const selectedBlockDuration = selectedBlock
    ? getBlockDurationMinutes(selectedBlock.start_time, selectedBlock.end_time)
    : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Agenda do Dia
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {format(new Date(), "EEEE", { locale: ptBR })}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchData}
              disabled={loading}
              title="Atualizar agenda"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggested next block */}
        {suggestedBlock && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <PlayCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Próximo bloco sugerido</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {suggestedBlock.title || getCourseName(resolveCourseId(suggestedBlock))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeHM(suggestedBlock.start_time)} – {formatTimeHM(suggestedBlock.end_time)}{" "}
                  ({getBlockDurationMinutes(suggestedBlock.start_time, suggestedBlock.end_time)}min)
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleBlockClick(suggestedBlock)}
                disabled={!resolveCourseId(suggestedBlock)}
              >
                Começar
              </Button>
            </div>
          </div>
        )}

        {/* All blocks list */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Blocos de hoje ({sortedBlocks.length})
          </p>

          {sortedBlocks.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-4 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum bloco agendado para hoje.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione horários no Planejamento.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-2">
                {sortedBlocks.map((block) => {
                  const status = getBlockStatus(block);
                  const isBreak = block.block_type === "break";
                  const duration = getBlockDurationMinutes(block.start_time, block.end_time);
                  const isSuggested = suggestedBlock?.id === block.id;
                  const effectiveCourseId = resolveCourseId(block);
                  const isFaculdade = getCourseCategory(effectiveCourseId) === 'Faculdades';

                  // Total planejado hoje para este curso (soma de todos os blocos study desse curso)
                  const courseDailyPlannedMin = effectiveCourseId
                    ? sortedBlocks
                        .filter((b) => b.block_type === "study" && resolveCourseId(b) === effectiveCourseId)
                        .reduce(
                          (s, b) => s + getBlockDurationMinutes(b.start_time, b.end_time),
                          0
                        )
                    : 0;
                  
                  // Se o curso faz parte de um plano com daily_hours, a meta mínima pode ser maior
                  const plan = plans.find(p => p.id === block.study_plan_id);
                  const planDailyGoalMin = plan && (plan as any).daily_hours ? (plan as any).daily_hours * 60 : 0;
                  const effectiveDailyGoalMin = Math.max(courseDailyPlannedMin, planDailyGoalMin);

                  const studiedMin = effectiveCourseId ? studiedByCourse[effectiveCourseId] || 0 : 0;
                  const isCourseDoneToday =
                    !isBreak &&
                    !!effectiveCourseId &&
                    effectiveDailyGoalMin > 0 &&
                    studiedMin >= effectiveDailyGoalMin;
                  const progressPct =
                    effectiveDailyGoalMin > 0
                      ? Math.min(100, Math.round((studiedMin / effectiveDailyGoalMin) * 100))
                      : 0;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => handleBlockClick(block)}
                      disabled={isBreak || !effectiveCourseId}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        status === "past" && !isCourseDoneToday && "opacity-50",
                        status === "current" && !isCourseDoneToday && "ring-2 ring-primary/50 bg-primary/5",
                        isSuggested && status !== "current" && !isCourseDoneToday && "border-primary/40",
                        isCourseDoneToday && "bg-success/5 border-success/40 ring-1 ring-success/30",
                        isBreak
                          ? "bg-muted/40 border-border/40 cursor-default"
                          : "hover:bg-accent/5 hover:border-accent/30 cursor-pointer",
                        !isBreak && !effectiveCourseId && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={cn(
                              "p-2 rounded-lg shrink-0",
                              isCourseDoneToday
                                ? "bg-success/15"
                                : isBreak
                                ? "bg-muted"
                                : isFaculdade
                                ? "bg-amber-50"
                                : "bg-primary/10"
                            )}
                          >
                            {isCourseDoneToday ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : isBreak ? (
                              <Coffee className="h-4 w-4 text-muted-foreground" />
                            ) : isFaculdade ? (
                              <GraduationCap className="h-4 w-4 text-amber-600" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={cn(
                                  "font-medium truncate text-sm",
                                  isBreak && "text-muted-foreground",
                                  isCourseDoneToday && "line-through decoration-success/60"
                                )}
                              >
                                {block.title || (isBreak ? "Descanso" : getCourseName(effectiveCourseId))}
                              </p>
                              {isFaculdade && !isBreak && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-300 shrink-0">
                                  🎓
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatTimeHM(block.start_time)} – {formatTimeHM(block.end_time)}
                              </span>
                              <span className="opacity-60">({duration}min)</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {getPlanName(block.study_plan_id)}
                            </p>

                            {/* Barra de progresso do curso no dia */}
                            {!isBreak && effectiveCourseId && (typeof effectiveDailyGoalMin !== 'undefined' ? effectiveDailyGoalMin : courseDailyPlannedMin) > 0 && (
                              <div className="mt-2 space-y-1">
                                <Progress
                                  value={progressPct}
                                  className={cn(
                                    "h-1.5",
                                    isCourseDoneToday && "[&>div]:bg-success"
                                  )}
                                />
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>
                                    {studiedMin}/{(typeof effectiveDailyGoalMin !== 'undefined' ? effectiveDailyGoalMin : courseDailyPlannedMin)} min hoje
                                  </span>
                                  <span>{progressPct}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {isCourseDoneToday ? (
                            <Badge className="text-[10px] bg-success text-success-foreground hover:bg-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Concluído
                            </Badge>
                          ) : status === "current" ? (
                            <Badge variant="default" className="text-[10px]">
                              Agora
                            </Badge>
                          ) : status === "past" ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Passou
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Iniciar Sessão
            </DialogTitle>
            <DialogDescription>
              Confirme os dados da sessão antes de iniciar o timer.
            </DialogDescription>
          </DialogHeader>

          {selectedBlock && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Curso</span>
                  <span className="font-medium">{getCourseName(resolveCourseId(selectedBlock))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Horário</span>
                  <span className="font-mono">
                    {formatTimeHM(selectedBlock.start_time)} – {formatTimeHM(selectedBlock.end_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duração</span>
                  <Badge variant="secondary">{selectedBlockDuration} minutos</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <span className="text-sm">{getPlanName(selectedBlock.study_plan_id)}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                O timer será configurado para <strong>{selectedBlockDuration} minutos</strong> e o
                curso será selecionado automaticamente.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmStart}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
