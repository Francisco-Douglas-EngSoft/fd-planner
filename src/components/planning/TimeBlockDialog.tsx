import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Clock, AlertCircle, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { StudyTimeBlock } from "@/components/planning/WeeklyCalendar";

type PlanOption = {
  id: string;
  name: string;
  courses: { id: string; name: string }[];
};

const days = [
  { id: "sunday", label: "Domingo" },
  { id: "monday", label: "Segunda" },
  { id: "tuesday", label: "Terça" },
  { id: "wednesday", label: "Quarta" },
  { id: "thursday", label: "Quinta" },
  { id: "friday", label: "Sexta" },
  { id: "saturday", label: "Sábado" },
] as const;

const TIME_PRESETS = [
  { label: "Madrugada (00:00-02:00)", start: "00:00", end: "02:00" },
  { label: "Madrugada (02:00-04:00)", start: "02:00", end: "04:00" },
  { label: "Madrugada (04:00-06:00)", start: "04:00", end: "06:00" },
  { label: "Manhã (06:00-08:00)", start: "06:00", end: "08:00" },
  { label: "Manhã (08:00-10:00)", start: "08:00", end: "10:00" },
  { label: "Manhã (10:00-12:00)", start: "10:00", end: "12:00" },
  { label: "Tarde (14:00-16:00)", start: "14:00", end: "16:00" },
  { label: "Tarde (16:00-18:00)", start: "16:00", end: "18:00" },
  { label: "Noite (19:00-21:00)", start: "19:00", end: "21:00" },
  { label: "Noite (21:00-23:00)", start: "21:00", end: "23:00" },
  { label: "Pomodoro (25 min)", start: "19:00", end: "19:25" },
  { label: "Sessão 1h", start: "19:00", end: "20:00" },
  { label: "Sessão 2h", start: "19:00", end: "21:00" },
];

function normalizeTime(value: string) {
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function timeValidation(start: string, end: string): string | null {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (e <= s) return "O horário de fim deve ser posterior ao de início.";
  if (e - s < 15) return "O bloco deve ter pelo menos 15 minutos.";
  if (e - s > 240) return "O bloco não deve exceder 4 horas.";
  return null;
}

export function TimeBlockDialog({
  open,
  onOpenChange,
  plans,
  timeBlocks,
  defaultDay,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanOption[];
  timeBlocks: StudyTimeBlock[];
  defaultDay?: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();

  const [studyPlanId, setStudyPlanId] = useState<string>(plans[0]?.id || "");
  const [selectedDays, setSelectedDays] = useState<string[]>([defaultDay || "monday"]);
  const [startTime, setStartTime] = useState<string>("19:00");
  const [endTime, setEndTime] = useState<string>("20:00");
  const [isSaving, setIsSaving] = useState(false);

  // Edição inline de bloco existente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (defaultDay) setSelectedDays([defaultDay]);
    if (plans[0]?.id && !studyPlanId) setStudyPlanId(plans[0].id);
  }, [open, defaultDay, plans, studyPlanId]);

  const filteredBlocks = useMemo(
    () => timeBlocks.filter((b) => b.study_plan_id === studyPlanId),
    [timeBlocks, studyPlanId]
  );

  const timeError = useMemo(
    () => timeValidation(startTime, endTime),
    [startTime, endTime]
  );

  const resetForm = () => {
    setStartTime("19:00");
    setEndTime("20:00");
  };

  const handleCreate = async () => {
    if (!studyPlanId) return;
    if (!selectedDays.length) {
      toast({
        title: "Selecione pelo menos um dia",
        description: "Escolha um ou mais dias da semana para criar o horário.",
        variant: "destructive",
      });
      return;
    }
    const err = timeValidation(startTime, endTime);
    if (err) {
      toast({ title: "Horário inválido", description: err, variant: "destructive" });
      return;
    }

    setIsSaving(true);
    // Sempre estudo, sem curso fixo: o curso é determinado pela sequência do planejamento
    const payload = selectedDays.map((dayId) => ({
      study_plan_id: studyPlanId,
      course_id: null,
      day_of_week: dayId,
      start_time: normalizeTime(startTime),
      end_time: normalizeTime(endTime),
      block_type: "study" as const,
      title: null,
    }));

    const { error } = await supabase.from("study_plan_time_blocks").insert(payload);
    setIsSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar horário", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Horário adicionado" });
    resetForm();
    onChanged();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("study_plan_time_blocks").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Horário removido" });
    onChanged();
  };

  const startEdit = (block: StudyTimeBlock) => {
    setEditingId(block.id);
    setEditStart(block.start_time.slice(0, 5));
    setEditEnd(block.end_time.slice(0, 5));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStart("");
    setEditEnd("");
  };

  const handleUpdate = async (id: string) => {
    const err = timeValidation(editStart, editEnd);
    if (err) {
      toast({ title: "Horário inválido", description: err, variant: "destructive" });
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase
      .from("study_plan_time_blocks")
      .update({
        start_time: normalizeTime(editStart),
        end_time: normalizeTime(editEnd),
      })
      .eq("id", id);
    setIsUpdating(false);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Horário atualizado" });
    cancelEdit();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horários de Estudo do Planejamento
          </DialogTitle>
          <DialogDescription>
            Defina em quais dias e horários você irá estudar este planejamento. O curso estudado em cada bloco é determinado automaticamente pela sequência do planejamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Planejamento</Label>
            <Select value={studyPlanId} onValueChange={setStudyPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o planejamento" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Dias da semana</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border rounded-lg p-3 bg-background">
              {days.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <div key={d.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${d.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        setSelectedDays((prev) =>
                          checked ? [...prev, d.id] : prev.filter((day) => day !== d.id)
                        )
                      }
                    />
                    <label
                      htmlFor={`day-${d.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {d.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Atalhos de horário</Label>
            <Select
              value=""
              onValueChange={(value) => {
                const preset = TIME_PRESETS.find((p) => p.label === value);
                if (preset) {
                  setStartTime(preset.start);
                  setEndTime(preset.end);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Horário de início</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Horário de término</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {timeError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {timeError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Limpar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving || !studyPlanId || !!timeError}>
              Adicionar horário
            </Button>
          </div>

          <Separator />

          <div className="grid gap-2">
            <p className="text-sm font-semibold">Horários deste planejamento</p>
            {filteredBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum horário cadastrado ainda.</p>
            ) : (
              <div className="max-h-[240px] overflow-auto rounded-lg border border-border/40">
                {filteredBlocks
                  .slice()
                  .sort((a, b) => (a.day_of_week + a.start_time).localeCompare(b.day_of_week + b.start_time))
                  .map((b) => {
                    const isEditing = editingId === b.id;
                    const editError = isEditing ? timeValidation(editStart, editEnd) : null;
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 p-3 border-b last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {days.find((d) => d.id === b.day_of_week)?.label}
                          </p>
                          {isEditing ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Input
                                type="time"
                                value={editStart}
                                onChange={(e) => setEditStart(e.target.value)}
                                className="h-8 w-[110px]"
                              />
                              <span className="text-xs text-muted-foreground">→</span>
                              <Input
                                type="time"
                                value={editEnd}
                                onChange={(e) => setEditEnd(e.target.value)}
                                className="h-8 w-[110px]"
                              />
                              {editError && (
                                <span className="text-xs text-destructive flex items-center gap-1 w-full">
                                  <AlertCircle className="h-3 w-3" />
                                  {editError}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdate(b.id)}
                                disabled={isUpdating || !!editError}
                                title="Salvar alterações"
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={cancelEdit} title="Cancelar">
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => startEdit(b)} title="Editar horário">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} title="Remover">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
