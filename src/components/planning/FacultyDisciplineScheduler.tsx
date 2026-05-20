import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GraduationCap, Clock, ChevronDown, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DisciplineSchedule, FacultyWithDisciplines } from '@/types/planning';

const daysOfWeek = [
  { id: 'monday', label: 'Segunda-feira', abbrev: 'Seg' },
  { id: 'tuesday', label: 'Terça-feira', abbrev: 'Ter' },
  { id: 'wednesday', label: 'Quarta-feira', abbrev: 'Qua' },
  { id: 'thursday', label: 'Quinta-feira', abbrev: 'Qui' },
  { id: 'friday', label: 'Sexta-feira', abbrev: 'Sex' },
  { id: 'saturday', label: 'Sábado', abbrev: 'Sáb' },
  { id: 'sunday', label: 'Domingo', abbrev: 'Dom' },
];

interface FacultyDisciplineSchedulerProps {
  readonly selectedFaculties: string[];
  readonly onScheduleChange: (schedule: DisciplineSchedule[]) => void;
  readonly initialSchedule?: DisciplineSchedule[];
}

export function FacultyDisciplineScheduler({
  selectedFaculties,
  onScheduleChange,
  initialSchedule = [],
}: FacultyDisciplineSchedulerProps) {
  const [faculties, setFaculties] = useState<FacultyWithDisciplines[]>([]);
  const [schedule, setSchedule] = useState<DisciplineSchedule[]>(initialSchedule);
  const [expandedFaculties, setExpandedFaculties] = useState<Set<string>>(new Set());
  const [currentDay, setCurrentDay] = useState('monday');
  const { toast } = useToast();

  // Buscar faculdades e suas disciplinas
  const fetchFacultiesWithDisciplines = useCallback(async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        total_hours,
        course_modules (
          id,
          name,
          hours,
          is_completed
        )
      `)
      .in('id', selectedFaculties);

    if (error) {
      toast({
        title: 'Erro ao carregar disciplinas',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const formattedFaculties: FacultyWithDisciplines[] = (data || []).map(faculty => ({
      id: faculty.id,
      name: faculty.name,
      totalHours: faculty.total_hours || 0,
      disciplines: (faculty.course_modules || []).map(module => ({
        id: module.id,
        name: module.name,
        hours: module.hours || 0,
        isCompleted: module.is_completed || false,
        selectedDays: [],
        dailyHours: 2,
        sequenceOrder: 1,
      })),
    }));

    setFaculties(formattedFaculties);
    
    // Expandir todas as faculdades por padrão
    setExpandedFaculties(new Set(formattedFaculties.map(f => f.id)));
  }, [selectedFaculties, toast]);

  useEffect(() => {
    if (selectedFaculties.length > 0) {
      fetchFacultiesWithDisciplines();
    }
  }, [selectedFaculties, fetchFacultiesWithDisciplines]);

  // Notificar mudanças no schedule
  useEffect(() => {
    onScheduleChange(schedule);
  }, [schedule, onScheduleChange]);

  const toggleFacultyExpanded = (facultyId: string) => {
    setExpandedFaculties(prev => {
      const next = new Set(prev);
      if (next.has(facultyId)) {
        next.delete(facultyId);
      } else {
        next.add(facultyId);
      }
      return next;
    });
  };

  // ✅ CORRIGIDO: Verifica disciplina em um dia específico
  const isDisciplineSelectedForDay = (moduleId: string, dayId: string): boolean => {
    return schedule.some(s => s.moduleId === moduleId && s.dayId === dayId);
  };

  // ✅ CORRIGIDO: Obtém horas de uma disciplina em um dia específico
  const getDisciplineHoursForDay = (moduleId: string, dayId: string): number => {
    const item = schedule.find(s => s.moduleId === moduleId && s.dayId === dayId);
    return item?.dailyHours || 2;
  };

  // ✅ CORRIGIDO: Toggle disciplina para um dia específico
  const toggleDisciplineForDay = (
    moduleId: string,
    moduleName: string,
    moduleHours: number,
    facultyId: string,
    facultyName: string,
    dayId: string
  ) => {
    setSchedule(prev => {
      const existing = prev.find(s => s.moduleId === moduleId && s.dayId === dayId);
      
      if (existing) {
        // Remover este dia específico
        return prev.filter(s => !(s.moduleId === moduleId && s.dayId === dayId));
      } else {
        // Adicionar novo registro para este dia
        const newItem: DisciplineSchedule = {
          moduleId,
          moduleName,
          moduleHours,
          facultyId,
          facultyName,
          dayId,
          dailyHours: 2,
          sequenceOrder: prev.length + 1,
        };
        return [...prev, newItem];
      }
    });
  };

  // ✅ CORRIGIDO: Atualiza horas de um dia específico
  const updateDisciplineHours = (moduleId: string, dayId: string, hours: number) => {
    // Validação: não permitir valores negativos ou maiores que 24
    if (hours < 0 || hours > 24) {
      toast({
        title: "Valor inválido",
        description: "As horas devem estar entre 0 e 24.",
        variant: "destructive",
      });
      return;
    }
    
    // Calcular total de horas do dia após a mudança
    const currentDaySchedule = getDaySchedule(dayId);
    const otherHours = currentDaySchedule
      .filter(s => s.moduleId !== moduleId)
      .reduce((sum, s) => sum + s.dailyHours, 0);
    
    const newTotalHours = otherHours + hours;
    
    // Validação: não permitir mais de 24 horas por dia
    if (newTotalHours > 24) {
      toast({
        title: "Limite de horas excedido",
        description: `Este dia já tem ${otherHours}h programadas. Máximo permitido: ${24 - otherHours}h.`,
        variant: "destructive",
      });
      return;
    }
    
    setSchedule(prev =>
      prev.map(s =>
        s.moduleId === moduleId && s.dayId === dayId
          ? { ...s, dailyHours: hours }
          : s
      )
    );
  };

  // ✅ CORRIGIDO: Obtém agendamento de um dia
  const getDaySchedule = (dayId: string) => {
    return schedule.filter(s => s.dayId === dayId);
  };

  // ✅ CORRIGIDO: Calcula total de horas de um dia
  const getDayTotalHours = (dayId: string) => {
    return getDaySchedule(dayId).reduce((sum, s) => sum + s.dailyHours, 0);
  };

  // ✅ CORRIGIDO: Calcula total de horas semanais
  const totalWeeklyHours = useMemo(() => {
    return schedule.reduce((sum, s) => sum + s.dailyHours, 0);
  }, [schedule]);

  // ✅ NOVO: Calcula horas por faculdade
  const getFacultyWeeklyHours = (facultyId: string) => {
    return schedule
      .filter(s => s.facultyId === facultyId)
      .reduce((sum, s) => sum + s.dailyHours, 0);
  };

  // ✅ NOVO: Calcula quantas disciplinas únicas estão selecionadas
  const uniqueSelectedDisciplines = useMemo(() => {
    const uniqueModules = new Set(schedule.map(s => s.moduleId));
    return uniqueModules.size;
  }, [schedule]);

  if (selectedFaculties.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Selecione pelo menos uma faculdade para configurar as disciplinas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com resumo */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-amber-600" />
            Configure as Disciplinas por Dia da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Faculdades</p>
              <p className="text-2xl font-bold text-amber-600">{faculties.length}</p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Disciplinas</p>
              <p className="text-2xl font-bold text-blue-600">
                {faculties.reduce((sum, f) => sum + f.disciplines.length, 0)}
              </p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Selecionadas</p>
              <p className="text-2xl font-bold text-green-600">{uniqueSelectedDisciplines}</p>
              <p className="text-[10px] text-muted-foreground">{schedule.length} agendamentos</p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Horas/Semana</p>
              <p className="text-2xl font-bold text-purple-600">{totalWeeklyHours.toFixed(1)}h</p>
            </div>
          </div>

          {/* Resumo por faculdade */}
          {faculties.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Horas por Faculdade:</p>
              <div className="flex flex-wrap gap-2">
                {faculties.map(faculty => {
                  const hours = getFacultyWeeklyHours(faculty.id);
                  if (hours === 0) return null;
                  return (
                    <Badge key={faculty.id} variant="outline" className="gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {faculty.name}: {hours.toFixed(1)}h
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs por dia da semana */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={currentDay} onValueChange={setCurrentDay}>
            <TabsList className="w-full grid grid-cols-7 h-auto p-1 bg-muted/50">
              {daysOfWeek.map(day => {
                const dayHours = getDayTotalHours(day.id);
                const dayCount = getDaySchedule(day.id).length;
                
                return (
                  <TabsTrigger
                    key={day.id}
                    value={day.id}
                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span className="text-xs font-semibold">{day.abbrev}</span>
                    {dayCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {dayCount} • {dayHours.toFixed(1)}h
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {daysOfWeek.map(day => (
              <TabsContent key={day.id} value={day.id} className="mt-4 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{day.label}</h3>
                  {getDaySchedule(day.id).length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Total: {getDayTotalHours(day.id).toFixed(1)}h
                    </Badge>
                  )}
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {faculties.map(faculty => {
                      const isExpanded = expandedFaculties.has(faculty.id);
                      const selectedCount = faculty.disciplines.filter(d =>
                        isDisciplineSelectedForDay(d.id, day.id)
                      ).length;

                      return (
                        <Collapsible
                          key={faculty.id}
                          open={isExpanded}
                          onOpenChange={() => toggleFacultyExpanded(faculty.id)}
                        >
                          <Card className={cn(
                            "border-2 transition-all",
                            selectedCount > 0
                              ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                              : "border-border"
                          )}>
                            <CollapsibleTrigger className="w-full">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <GraduationCap className="h-5 w-5 text-amber-600" />
                                    <div className="text-left">
                                      <p className="font-bold">{faculty.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {faculty.disciplines.length} disciplinas
                                      </p>
                                    </div>
                                  </div>
                                  {selectedCount > 0 && (
                                    <Badge className="bg-amber-500">
                                      {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="pt-0 space-y-2">
                                {faculty.disciplines.map(discipline => {
                                  const isSelected = isDisciplineSelectedForDay(discipline.id, day.id);
                                  const hours = getDisciplineHoursForDay(discipline.id, day.id);

                                  return (
                                    <div
                                      key={discipline.id}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/30"
                                      )}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Checkbox
                                          id={`${discipline.id}-${day.id}`}
                                          checked={isSelected}
                                          onCheckedChange={() =>
                                            toggleDisciplineForDay(
                                              discipline.id,
                                              discipline.name,
                                              discipline.hours,
                                              faculty.id,
                                              faculty.name,
                                              day.id
                                            )
                                          }
                                        />
                                        <label
                                          htmlFor={`${discipline.id}-${day.id}`}
                                          className="flex-1 cursor-pointer"
                                        >
                                          <p className="font-medium text-sm">{discipline.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {discipline.hours}h total
                                          </p>
                                        </label>
                                      </div>

                                      {isSelected && (
                                        <div className="flex items-center gap-2">
                                          <Label htmlFor={`hours-${discipline.id}-${day.id}`} className="text-xs text-muted-foreground">
                                            Horas:
                                          </Label>
                                          <Input
                                            id={`hours-${discipline.id}-${day.id}`}
                                            type="number"
                                            min="0.5"
                                            max="12"
                                            step="0.5"
                                            value={hours}
                                            onChange={(e) =>
                                              updateDisciplineHours(
                                                discipline.id,
                                                day.id,
                                                Number.parseFloat(e.target.value) || 2
                                              )
                                            }
                                            className="w-20 h-8 text-center"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>

                {getDaySchedule(day.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Nenhuma disciplina selecionada para {day.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione as disciplinas que deseja estudar neste dia
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
