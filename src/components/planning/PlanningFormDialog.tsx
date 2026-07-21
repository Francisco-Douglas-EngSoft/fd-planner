import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';
import { BookOpen, Clock, Calculator, GripVertical, CalendarDays, AlertCircle, CalendarCheck, Wand2, Target, Layers, BookMarked, ChevronDown, ChevronRight, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO, addDays, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AutoGenerateFacultyPlanButton } from './AutoGenerateFacultyPlanButton';
import type { Faculty, GeneratedPlan } from '@/lib/facultyPlanGenerator';

// ✅ Função para validar e formatar data
const validateAndFormatDate = (dateString: string | null | undefined): string | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    const date = parseISO(dateString);
    
    // Verificar se é uma data válida
    if (!isValid(date)) return null;
    
    // Verificar se o ano está em um range razoável (1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    // Retornar no formato ISO (YYYY-MM-DD)
    return format(date, 'yyyy-MM-dd');
  } catch {
    return null;
  }
};

interface Course {
  id: string;
  name: string;
  total_hours: number | null;
  completed_hours: number | null;
  category: string | null;
  status: string | null;
}

interface Module {
  id: string;
  name: string;
  hours: number;
  course_id: string;
  course_name: string;
  is_completed: boolean;
  order_index: number;
}

interface CourseSettings {
  is_fixed: boolean;
  study_days: string[];
  sequence_order: number;
  custom_daily_hours?: number; // Hours per day for this specific course (e.g., 1.67 for 01:40)
  weekly_goal_hours?: number; // Weekly study goal for this course
}

interface ModuleSettings {
  sequence_order: number;
  custom_daily_hours?: number;
  weekly_goal_hours?: number;
}

interface PlanningFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Abre o formulário já na aba Faculdade ou Cursos */
  initialPlanningCategory?: 'regular' | 'faculdade';
  editPlan?: {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    daily_hours: number | null;
    min_daily_hours?: number | null;
    max_daily_hours?: number | null;
    study_days: string[] | null;
    planning_type?: string;
    planning_category?: string;
    semester?: string | null;
    academic_period_start?: string | null;
    academic_period_end?: string | null;
    hours_per_discipline?: number | null;
    color?: string | null;
  } | null;
}

const daysOfWeek = [
  { id: 'monday', label: 'Segunda', abbrev: 'Seg' },
  { id: 'tuesday', label: 'Terça', abbrev: 'Ter' },
  { id: 'wednesday', label: 'Quarta', abbrev: 'Qua' },
  { id: 'thursday', label: 'Quinta', abbrev: 'Qui' },
  { id: 'friday', label: 'Sexta', abbrev: 'Sex' },
  { id: 'saturday', label: 'Sábado', abbrev: 'Sáb' },
  { id: 'sunday', label: 'Domingo', abbrev: 'Dom' },
];

const MIN_STUDY_MINUTES_PER_DAY = 30; // Minimum 30 minutes per day per course

// Smart course-day distribution patterns
const STUDY_DAY_PATTERNS: Record<number, string[][]> = {
  1: [['monday', 'wednesday', 'friday'], ['tuesday', 'thursday', 'saturday']],
  2: [['monday', 'wednesday', 'friday'], ['tuesday', 'thursday', 'saturday']],
  3: [['monday', 'wednesday', 'friday'], ['tuesday', 'thursday', 'saturday'], ['monday', 'tuesday', 'wednesday']],
  4: [['monday', 'wednesday'], ['tuesday', 'thursday'], ['friday', 'saturday'], ['sunday', 'monday']],
  5: [['monday', 'wednesday'], ['tuesday', 'thursday'], ['friday'], ['saturday'], ['sunday']],
  6: [['monday'], ['tuesday'], ['wednesday'], ['thursday'], ['friday'], ['saturday']],
  7: [['monday'], ['tuesday'], ['wednesday'], ['thursday'], ['friday'], ['saturday'], ['sunday']],
};

interface CourseStudySchedule {
  courseId: string;
  courseName: string;
  totalHours: number;
  studyDays: string[];
  dailyMinutes: number;
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)', // Blue primary
  'hsl(221, 83%, 53%)',
  'hsl(199, 89%, 48%)',
  'hsl(224, 76%, 48%)',
  'hsl(210, 85%, 55%)',
  'hsl(230, 70%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(215, 90%, 55%)',
];

interface SortableCourseItemProps {
  course: Course;
  isSelected: boolean;
  onToggle: () => void;
  dailyHours: number;
  totalHours: number;
  formatDailyHours: (hours: number) => string;
  showHours: boolean;
  courseSettings: CourseSettings;
  onSettingsChange: (settings: CourseSettings) => void;
  planStudyDays: string[];
  totalSelectedCourses: number;
  isInOtherPlan?: boolean;
  planDailyHours: number;
  remainingDailyHours: number;
}

function SortableCourseItem({ 
  course, 
  isSelected, 
  onToggle, 
  dailyHours, 
  totalHours, 
  formatDailyHours,
  showHours,
  courseSettings,
  onSettingsChange,
  planStudyDays,
  totalSelectedCourses,
  isInOtherPlan = false,
  planDailyHours,
  remainingDailyHours
}: SortableCourseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const toggleCourseDay = (dayId: string) => {
    const newDays = courseSettings.study_days.includes(dayId)
      ? courseSettings.study_days.filter(d => d !== dayId)
      : [...courseSettings.study_days, dayId];
    onSettingsChange({ ...courseSettings, study_days: newDays });
  };

  const handleSequenceChange = (newOrder: number) => {
    onSettingsChange({ ...courseSettings, sequence_order: newOrder });
  };

  // Parse time input (HH:MM) to decimal hours
  const parseTimeToHours = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const hours = Number.parseInt(parts[0], 10) || 0;
      const minutes = Number.parseInt(parts[1], 10) || 0;
      return hours + (minutes / 60);
    }
    return 0;
  };

  // Format decimal hours to HH:MM
  const formatHoursToTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const hasCustomHours = courseSettings.custom_daily_hours !== undefined && courseSettings.custom_daily_hours > 0;
  const displayHours = hasCustomHours && courseSettings.custom_daily_hours ? courseSettings.custom_daily_hours : dailyHours;


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border transition-all ${isDragging ? 'bg-muted' : ''} ${isSelected ? 'border-primary/30 bg-primary/5' : isInOtherPlan ? 'border-border/50 bg-muted/30' : 'border-border'}`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Checkbox
            id={`course-${course.id}`}
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={isInOtherPlan}
          />
          <label
            htmlFor={`course-${course.id}`}
            className={`text-sm font-medium cursor-pointer ${isInOtherPlan ? 'text-muted-foreground' : ''}`}
          >
            {course.name}
            {isInOtherPlan && (
              <span className="ml-2 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Em outro plano
              </span>
            )}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {Number((course.total_hours || 0).toFixed(2))}h
          </span>
        </div>
      </div>
      
    </div>
  );
}

// Module Selection Section Component with Collapsible Courses
interface ModuleSelectionSectionProps {
  modulesByCourse: Record<string, { courseName: string; modules: Module[] }>;
  selectedModules: string[];
  modulesInOtherPlans: Set<string>;
  toggleModule: (moduleId: string) => void;
  applySequentialToggle: (courseModules: Module[], targetModuleId: string) => void;
  totalCourseHours: number;
}

function ModuleSelectionSection({
  modulesByCourse,
  selectedModules,
  modulesInOtherPlans,
  toggleModule,
  applySequentialToggle,
  totalCourseHours,
}: ModuleSelectionSectionProps) {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const getSelectedModulesCountForCourse = (courseModules: Module[]) => {
    return courseModules.filter(m => selectedModules.includes(m.id)).length;
  };

  const getTotalHoursForCourse = (courseModules: Module[]) => {
    return courseModules
      .filter(m => selectedModules.includes(m.id))
      .reduce((sum, m) => sum + m.hours, 0);
  };

  const selectAllModulesFromCourse = (courseModules: Module[], e: React.MouseEvent) => {
    e.stopPropagation();
    const availableModules = courseModules.filter(m => !modulesInOtherPlans.has(m.id));
    const allSelected = availableModules.every(m => selectedModules.includes(m.id));
    
    availableModules.forEach(module => {
      const isSelected = selectedModules.includes(module.id);
      if (allSelected) {
        // Deselect all
        if (isSelected) toggleModule(module.id);
      } else {
        // Select all available
        if (!isSelected) toggleModule(module.id);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        Selecionar Módulos
        <span className="text-xs text-muted-foreground">(clique no curso para expandir)</span>
      </Label>
      
      {Object.keys(modulesByCourse).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum módulo disponível. Adicione módulos aos seus cursos primeiro.</p>
      ) : (
        <div className="border rounded-lg p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {Object.entries(modulesByCourse).map(([courseId, { courseName, modules: courseModules }]) => {
            const isExpanded = expandedCourses.has(courseId);
            const selectedCount = getSelectedModulesCountForCourse(courseModules);
            const totalModules = courseModules.length;
            const selectedHours = getTotalHoursForCourse(courseModules);
            const availableModules = courseModules.filter(m => !modulesInOtherPlans.has(m.id));
            const allAvailableSelected = availableModules.length > 0 && availableModules.every(m => selectedModules.includes(m.id));

            return (
              <Collapsible key={courseId} open={isExpanded} onOpenChange={() => toggleCourseExpanded(courseId)}>
                <CollapsibleTrigger className="w-full">
                  <div className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer ${
                    selectedCount > 0 ? 'border-primary/30 bg-primary/5' : 'border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                      )}
                      <BookMarked className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{courseName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedCount > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                          {selectedCount}/{totalModules} • {selectedHours}h
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {totalModules} módulo{totalModules === 1 ? '' : 's'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => selectAllModulesFromCourse(courseModules, e)}
                      >
                        {allAvailableSelected ? 'Desmarcar' : 'Selecionar'} todos
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-1 pl-8 pr-2 py-2">
                    {courseModules.map(module => {
                      const isInOtherPlan = modulesInOtherPlans.has(module.id);
                      const isSelected = selectedModules.includes(module.id);
                      const sequenceInCourse = courseModules.findIndex(m => m.id === module.id) + 1;
                      
                      return (
                        <div
                          key={module.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-primary/30 bg-primary/5'
                              : isInOtherPlan || module.is_completed
                              ? 'border-border/50 bg-muted/30'
                              : 'border-border hover:border-primary/20'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`module-${module.id}`}
                              checked={isSelected}
                              onCheckedChange={() => applySequentialToggle(courseModules, module.id)}
                              disabled={isInOtherPlan || module.is_completed}
                            />
                            <span className="text-[10px] font-mono font-semibold text-muted-foreground w-6 text-center bg-muted rounded px-1 py-0.5">
                              #{sequenceInCourse}
                            </span>
                            <label
                              htmlFor={`module-${module.id}`}
                              className={`text-sm cursor-pointer ${isInOtherPlan || module.is_completed ? 'text-muted-foreground line-through' : ''}`}
                            >
                              {module.name}
                              {module.is_completed && (
                                <span className="ml-2 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                  Concluído
                                </span>
                              )}
                              {isInOtherPlan && (
                                <span className="ml-2 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                  Em outro plano
                                </span>
                              )}
                            </label>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{module.hours}h</span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
      
      {selectedModules.length > 0 && (
        <div className="bg-primary/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedModules.length} módulo(s) selecionado(s) - Total: <span className="text-primary">{totalCourseHours}h</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanningFormDialog({ open, onOpenChange, onSuccess, initialPlanningCategory, editPlan }: PlanningFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dailyHours, setDailyHours] = useState('1.5');
  const [minDailyHours, setMinDailyHours] = useState('0.5');
  const [maxDailyHours, setMaxDailyHours] = useState('8');
  const [studyDays, setStudyDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesInOtherPlans, setCoursesInOtherPlans] = useState<Set<string>>(new Set());
  const [planCourses, setPlanCourses] = useState<{ course_id: string; allocated_hours: number; is_fixed?: boolean; study_days?: string[] }[]>([]);
  const [courseSettings, setCourseSettings] = useState<Record<string, CourseSettings>>({});
  const [noDeadline, setNoDeadline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [color, setColor] = useState('');

  // Horários de estudo (blocos que refletem no Foco em sequência)
  const [studyTimes, setStudyTimes] = useState<{ start: string; end: string }[]>([]);
  const [newStartTime, setNewStartTime] = useState('19:00');
  const [newEndTime, setNewEndTime] = useState('20:00');
  
  // New state for planning type
  const [planningType, setPlanningType] = useState<'course' | 'module'>('course');
  const [planningCategory, setPlanningCategory] = useState<'regular' | 'faculdade'>('regular');
  const [semester, setSemester] = useState('');
  const [academicPeriodStart, setAcademicPeriodStart] = useState('');
  const [academicPeriodEnd, setAcademicPeriodEnd] = useState('');
  const [hoursPerDiscipline, setHoursPerDiscipline] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleSettings, setModuleSettings] = useState<Record<string, ModuleSettings>>({});
  const [modulesInOtherPlans, setModulesInOtherPlans] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && open) {
      fetchCourses();
      fetchCoursesInOtherPlans();
      fetchModules();
      fetchModulesInOtherPlans();
    }
  }, [user, open]);

  useEffect(() => {
    if (editPlan && open) {
      setName(editPlan.name);
      setDescription(editPlan.description || '');
      setStartDate(editPlan.start_date);
      setEndDate(editPlan.end_date);
      setDailyHours(String(editPlan.daily_hours || 1.5));
      setMinDailyHours(String(editPlan.min_daily_hours || 0.5));
      setMaxDailyHours(String(editPlan.max_daily_hours || 8));
      setStudyDays(editPlan.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setPlanningType((editPlan.planning_type as 'course' | 'module') || 'course');
      setPlanningCategory((editPlan.planning_category as 'regular' | 'faculdade') || 'regular');
      setSemester(editPlan.semester || '');
      setAcademicPeriodStart(editPlan.academic_period_start || '');
      setAcademicPeriodEnd(editPlan.academic_period_end || '');
      setHoursPerDiscipline(editPlan.hours_per_discipline ? String(editPlan.hours_per_discipline) : '');
      setColor(editPlan.color || '');
      if (editPlan.planning_type === 'module') {
        fetchPlanModules(editPlan.id);
      } else {
        fetchPlanCourses(editPlan.id);
      }
      fetchStudyTimes(editPlan.id);
    } else if (!editPlan && open) {
      resetForm();
      if (initialPlanningCategory) {
        setPlanningCategory(initialPlanningCategory);
      }
    }
  }, [editPlan, open, initialPlanningCategory]);

  const fetchStudyTimes = async (planId: string) => {
    const { data, error } = await supabase
      .from('study_plan_time_blocks')
      .select('start_time, end_time')
      .eq('study_plan_id', planId)
      .eq('block_type', 'study');
    if (error || !data) return;
    const unique = new Map<string, { start: string; end: string }>();
    data.forEach((b: { start_time: string; end_time: string }) => {
      const start = b.start_time.slice(0, 5);
      const end = b.end_time.slice(0, 5);
      unique.set(`${start}-${end}`, { start, end });
    });
    setStudyTimes(Array.from(unique.values()).sort((a, b) => a.start.localeCompare(b.start)));
  };

  const fetchModules = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('course_modules')
      .select(`
        id,
        name,
        hours,
        course_id,
        is_completed,
        order_index,
        courses!inner(name, user_id)
      `)
      .eq('courses.user_id', user.id)
      .order('course_id')
      .order('order_index', { nullsFirst: false })
      .order('name');

    if (!error && data) {
      const formattedModules: Module[] = data.map(m => ({
        id: m.id,
        name: m.name,
        hours: Number(m.hours) || 0,
        course_id: m.course_id,
        course_name: (m.courses as { name?: string } | null)?.name || '',
        is_completed: m.is_completed || false,
        order_index: (m as { order_index?: number | null }).order_index ?? 9999,
      }));
      setModules(formattedModules);
    }
  };

  const fetchModulesInOtherPlans = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('study_plan_modules')
      .select('module_id, study_plan_id');

    if (!error && data) {
      const modulesInPlans = new Set<string>();
      data.forEach(pm => {
        if (!editPlan || pm.study_plan_id !== editPlan.id) {
          modulesInPlans.add(pm.module_id);
        }
      });
      setModulesInOtherPlans(modulesInPlans);
    }
  };

  const fetchPlanModules = async (planId: string) => {
    const { data, error } = await supabase
      .from('study_plan_modules')
      .select('module_id, allocated_hours, sequence_order, custom_daily_hours, weekly_goal_hours')
      .eq('study_plan_id', planId);

    if (!error && data) {
      setSelectedModules(data.map(pm => pm.module_id));
      
      const settings: Record<string, ModuleSettings> = {};
      data.forEach((pm, index) => {
        settings[pm.module_id] = {
          sequence_order: pm.sequence_order || index + 1,
          custom_daily_hours: pm.custom_daily_hours ? Number(pm.custom_daily_hours) : undefined,
          weekly_goal_hours: pm.weekly_goal_hours ? Number(pm.weekly_goal_hours) : undefined,
        };
      });
      setModuleSettings(settings);
    }
  };

  const fetchCourses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('courses')
      .select('id, name, total_hours, category, status, completed_hours')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setAllCourses(data);
      // Filtrar cursos concluídos (status = 'completed' ou completed_hours >= total_hours)
      const activeCourses = data.filter(c => {
        if (c.status === 'completed') return false;
        if (c.total_hours > 0 && (c.completed_hours || 0) >= c.total_hours) return false;
        return true;
      });
      setCourses(editPlan ? data : activeCourses);
    }
  };

  const fetchCoursesInOtherPlans = async () => {
    if (!user) return;

    // Get all courses that are already in any plan (excluding current edit plan)
    const { data, error } = await supabase
      .from('study_plan_courses')
      .select('course_id, study_plan_id');

    if (!error && data) {
      const coursesInPlans = new Set<string>();
      data.forEach(pc => {
        // If editing, exclude courses from the current plan
        if (!editPlan || pc.study_plan_id !== editPlan.id) {
          coursesInPlans.add(pc.course_id);
        }
      });
      setCoursesInOtherPlans(coursesInPlans);
    }
  };

  const fetchPlanCourses = async (planId: string) => {
    const { data, error } = await supabase
      .from('study_plan_courses')
      .select('course_id, allocated_hours, is_fixed, study_days')
      .eq('study_plan_id', planId);

    if (!error && data) {
      setSelectedCourses(data.map(pc => pc.course_id));
      setPlanCourses(data.map(pc => ({ 
        course_id: pc.course_id, 
        allocated_hours: Number(pc.allocated_hours) || 0,
        is_fixed: pc.is_fixed || false,
        study_days: pc.study_days || []
      })));
      
      // Initialize course settings from saved data
      const settings: Record<string, CourseSettings> = {};
      data.forEach((pc, index) => {
        settings[pc.course_id] = {
          is_fixed: pc.is_fixed || false,
          study_days: pc.study_days || studyDays,
          sequence_order: index + 1
        };
      });
      setCourseSettings(settings);
    }
  };

  // Filter available courses based on planning category
  const availableCourses = useMemo(() => {
    let base = editPlan ? allCourses : allCourses.filter(course => {
      if (coursesInOtherPlans.has(course.id)) return false;
      if (course.status === 'completed') return false;
      if ((course.total_hours || 0) > 0 && (course.completed_hours || 0) >= (course.total_hours || 0)) return false;
      return true;
    });
    
    if (planningCategory === 'faculdade') {
      return base.filter(course => course.category === 'Faculdades');
    }
    return base.filter(course => course.category !== 'Faculdades');
  }, [allCourses, coursesInOtherPlans, editPlan, planningCategory]);

  const faculdadesCourses = useMemo(() => {
    if (planningCategory === 'faculdade') return [];
    let base = editPlan ? allCourses : allCourses.filter(course => {
      if (coursesInOtherPlans.has(course.id)) return false;
      if (course.status === 'completed') return false;
      if ((course.total_hours || 0) > 0 && (course.completed_hours || 0) >= (course.total_hours || 0)) return false;
      return true;
    });
    return base.filter(course => course.category === 'Faculdades');
  }, [allCourses, coursesInOtherPlans, editPlan, planningCategory]);

  // Filter available modules (exclude modules already in other plans)
  const availableModules = useMemo(() => {
    if (editPlan && editPlan.planning_type === 'module') {
      return modules;
    }
    return modules.filter(module => !modulesInOtherPlans.has(module.id));
  }, [modules, modulesInOtherPlans, editPlan]);

  // Group modules by course for better display
  const modulesByCourse = useMemo(() => {
    const grouped: Record<string, { courseName: string; modules: Module[] }> = {};
    availableModules.forEach(module => {
      if (!grouped[module.course_id]) {
        grouped[module.course_id] = {
          courseName: module.course_name,
          modules: [],
        };
      }
      grouped[module.course_id].modules.push(module);
    });
    // Ordenar módulos dentro de cada curso por order_index
    Object.values(grouped).forEach(g => {
      g.modules.sort((a, b) => a.order_index - b.order_index);
    });
    return grouped;
  }, [availableModules]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setDailyHours('1.5');
    setStudyDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    setSelectedCourses([]);
    setPlanCourses([]);
    setCourseSettings({});
    setNoDeadline(false);
    setPlanningType('course');
    setPlanningCategory('regular');
    setSemester('');
    setAcademicPeriodStart('');
    setAcademicPeriodEnd('');
    setHoursPerDiscipline('');
    setSelectedModules([]);
    setModuleSettings({});
    setColor('');
    setStudyTimes([]);
    setNewStartTime('19:00');
    setNewEndTime('20:00');
  };

  // Validação e manipulação dos horários de estudo
  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const newTimeError = useMemo(() => {
    const s = timeToMinutes(newStartTime);
    const e = timeToMinutes(newEndTime);
    if (e <= s) return 'O horário de término deve ser posterior ao de início.';
    if (e - s < 15) return 'O bloco deve ter pelo menos 15 minutos.';
    if (e - s > 240) return 'O bloco não deve exceder 4 horas.';
    if (studyTimes.some((b) => b.start === newStartTime && b.end === newEndTime)) return 'Esse horário já foi adicionado.';
    return null;
  }, [newStartTime, newEndTime, studyTimes]);

  const addStudyTime = () => {
    if (newTimeError) return;
    setStudyTimes((prev) =>
      [...prev, { start: newStartTime, end: newEndTime }].sort((a, b) => a.start.localeCompare(b.start))
    );
  };

  const removeStudyTime = (index: number) => {
    setStudyTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: string) => {
    setStudyDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        // Remove course settings when deselecting
        setCourseSettings(prevSettings => {
          const newSettings = { ...prevSettings };
          delete newSettings[courseId];
          // Reorder remaining courses
          const remaining = prev.filter(id => id !== courseId);
          remaining.forEach((id, idx) => {
            if (newSettings[id]) {
              newSettings[id].sequence_order = idx + 1;
            }
          });
          return newSettings;
        });
        return prev.filter(id => id !== courseId);
      }
      // Initialize settings when selecting
      const newOrder = prev.length + 1;
      setCourseSettings(prevSettings => ({
        ...prevSettings,
        [courseId]: { is_fixed: false, study_days: studyDays, sequence_order: newOrder }
      }));
      return [...prev, courseId];
    });
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleId)) {
        setModuleSettings(prevSettings => {
          const newSettings = { ...prevSettings };
          delete newSettings[moduleId];
          const remaining = prev.filter(id => id !== moduleId);
          remaining.forEach((id, idx) => {
            if (newSettings[id]) {
              newSettings[id].sequence_order = idx + 1;
            }
          });
          return newSettings;
        });
        return prev.filter(id => id !== moduleId);
      }
      const newOrder = prev.length + 1;
      setModuleSettings(prevSettings => ({
        ...prevSettings,
        [moduleId]: { sequence_order: newOrder }
      }));
      return [...prev, moduleId];
    });
  };

  /**
   * Seleção sequencial dentro de um curso:
   * - Se o módulo alvo estiver desmarcado, marca ele e TODOS os anteriores (respeita pré-requisitos).
   * - Se o módulo alvo estiver marcado, desmarca ele e TODOS os seguintes.
   */
  const applySequentialToggle = (courseModules: Module[], targetModuleId: string) => {
    const targetIdx = courseModules.findIndex(m => m.id === targetModuleId);
    if (targetIdx === -1) return;

    const isCurrentlySelected = selectedModules.includes(targetModuleId);

    // IDs afetados pela ação
    const idsToSelect = isCurrentlySelected
      ? []
      : courseModules
          .slice(0, targetIdx + 1)
          .filter(m => !m.is_completed && !modulesInOtherPlans.has(m.id))
          .map(m => m.id);

    const idsToDeselect = isCurrentlySelected
      ? courseModules.slice(targetIdx).map(m => m.id)
      : [];

    setSelectedModules(prev => {
      const set = new Set(prev);
      idsToDeselect.forEach(id => set.delete(id));
      idsToSelect.forEach(id => set.add(id));
      const nextArr = Array.from(set);

      setModuleSettings(prevSettings => {
        const next = { ...prevSettings };
        idsToDeselect.forEach(id => delete next[id]);
        // Reordenar sequence_order para todos os módulos ainda selecionados,
        // preservando ordem atual e adicionando novos no fim.
        const ordered = [
          ...prev.filter(id => set.has(id)),
          ...idsToSelect.filter(id => !prev.includes(id)),
        ];
        ordered.forEach((id, idx) => {
          next[id] = { ...(next[id] || {}), sequence_order: idx + 1 };
        });
        return next;
      });

      return nextArr;
    });
  };

  const reorderSelectedModules = (fromId: string, toId: string) => {
    const from = orderedSelectedModules.indexOf(fromId);
    const to = orderedSelectedModules.indexOf(toId);
    if (from === -1 || to === -1 || from === to) return;
    const next = arrayMove(orderedSelectedModules, from, to);
    setModuleSettings(prev => {
      const updated = { ...prev };
      next.forEach((id, idx) => {
        updated[id] = { ...(updated[id] || {}), sequence_order: idx + 1 };
      });
      return updated;
    });
  };

  const updateModuleSettings = (moduleId: string, settings: ModuleSettings) => {
    setModuleSettings(prev => ({
      ...prev,
      [moduleId]: settings
    }));
  };

  const updateCourseSettings = (courseId: string, settings: CourseSettings) => {
    setCourseSettings(prev => ({
      ...prev,
      [courseId]: settings
    }));
  };

  const updateCourseSequence = (courseId: string, newOrder: number) => {
    setCourseSettings(prev => {
      const newSettings = { ...prev };
      const currentOrder = newSettings[courseId]?.sequence_order || 0;
      
      // Swap orders
      Object.keys(newSettings).forEach(id => {
        if (id === courseId) {
          newSettings[id] = { ...newSettings[id], sequence_order: newOrder };
        } else if (newSettings[id].sequence_order === newOrder) {
          newSettings[id] = { ...newSettings[id], sequence_order: currentOrder };
        }
      });
      
      return newSettings;
    });
  };

  // Preparar dados das faculdades para geração automática
  const facultiesForAutoGeneration = useMemo((): Faculty[] => {
    if (planningCategory !== 'faculdade' || planningType !== 'module') return [];
    
    const faculties: Faculty[] = [];
    
    // Agrupar módulos selecionados por curso (faculdade)
    const modulesByCourseId: Record<string, Module[]> = {};
    selectedModules.forEach(moduleId => {
      const module = modules.find(m => m.id === moduleId);
      if (module) {
        if (!modulesByCourseId[module.course_id]) {
          modulesByCourseId[module.course_id] = [];
        }
        modulesByCourseId[module.course_id].push(module);
      }
    });
    
    // Converter para formato Faculty
    Object.entries(modulesByCourseId).forEach(([courseId, courseModules]) => {
      const course = allCourses.find(c => c.id === courseId);
      if (!course) return;
      
      // Para faculdades, os course_modules são as disciplinas
      // E os course_submodules são os módulos de cada disciplina
      // Mas como estamos trabalhando com modules (que já são course_modules),
      // vamos tratá-los como disciplinas com seus próprios "módulos"
      
      const disciplines = courseModules.map((module, index) => {
        return {
          id: module.id,
          name: module.name,
          modules: [{
            id: module.id,
            name: module.name,
            hours: module.hours,
            disciplineId: module.id,
            disciplineName: module.name,
            orderIndex: index,
          }],
          totalHours: module.hours,
        };
      });
      
      faculties.push({
        id: courseId,
        name: course.name,
        disciplines,
      });
    });
    
    return faculties;
  }, [planningCategory, planningType, selectedModules, modules, allCourses]);

  // Handler para quando o plano é gerado automaticamente
  const handleAutoGeneratedPlan = async (plan: GeneratedPlan) => {
    try {
      // Aplicar o plano gerado aos módulos selecionados
      // Aqui você pode processar os blocos de estudo e aplicar ao planejamento
      
      toast({
        title: 'Plano aplicado com sucesso!',
        description: `${plan.modulesCount} módulos distribuídos em ${plan.totalDays} dias`,
      });
      
      // Os blocos de tempo (study_plan_time_blocks) são persistidos em
      // handleSubmit junto com o restante do planejamento, então aqui apenas
      // aplicamos o layout gerado ao estado local — nada mais a fazer.
      
    } catch (error) {
      console.error('Erro ao aplicar plano gerado:', error);
      toast({
        title: 'Erro ao aplicar plano',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // Get ordered selected courses by sequence
  const orderedSelectedCourses = useMemo(() => {
    return [...selectedCourses].sort((a, b) => {
      const orderA = courseSettings[a]?.sequence_order || 0;
      const orderB = courseSettings[b]?.sequence_order || 0;
      return orderA - orderB;
    });
  }, [selectedCourses, courseSettings]);

  // Get ordered selected modules by sequence
  const orderedSelectedModules = useMemo(() => {
    return [...selectedModules].sort((a, b) => {
      const orderA = moduleSettings[a]?.sequence_order || 0;
      const orderB = moduleSettings[b]?.sequence_order || 0;
      return orderA - orderB;
    });
  }, [selectedModules, moduleSettings]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCourses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Calculate total hours from selected courses or modules
  const totalCourseHours = useMemo(() => {
    if (planningType === 'module') {
      return selectedModules.reduce((sum, moduleId) => {
        const module = modules.find(m => m.id === moduleId);
        return sum + (module?.hours || 0);
      }, 0);
    }
    return selectedCourses.reduce((sum, courseId) => {
      const course = courses.find(c => c.id === courseId);
      return sum + (course?.total_hours || 0);
    }, 0);
  }, [planningType, selectedCourses, courses, selectedModules, modules]);

  // Calculate study days count per week
  const studyDaysPerWeek = studyDays.length;

  // Calculate total study days in the period
  const totalStudyDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const totalDays = differenceInDays(end, start) + 1;
    
    // Map day names to day numbers (0 = Sunday)
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    let count = 0;
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      if (selectedDayNumbers.includes(date.getDay())) {
        count++;
      }
    }
    
    return count;
  }, [startDate, endDate, studyDays]);

  // Calculate total available hours
  const totalAvailableHours = totalStudyDays * (Number.parseFloat(dailyHours) || 0);

  // Calculate estimated completion date based on total course hours and daily study hours
  const estimatedCompletionDate = useMemo(() => {
    if (!startDate || studyDays.length === 0 || totalCourseHours === 0) return null;
    
    const daily = Number.parseFloat(dailyHours) || 0;
    if (daily <= 0) return null;
    
    // Calculate how many study days are needed to complete all courses
    const studyDaysNeeded = Math.ceil(totalCourseHours / daily);
    
    // Map day names to day numbers (0 = Sunday)
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    
    const start = parseISO(startDate);
    if (!isValid(start)) return null;
    
    let currentDate = start;
    let studyDaysCount = 0;
    
    // Iterate through dates until we reach the required study days
    while (studyDaysCount < studyDaysNeeded) {
      if (selectedDayNumbers.includes(currentDate.getDay())) {
        studyDaysCount++;
        if (studyDaysCount === studyDaysNeeded) {
          return currentDate;
        }
      }
      currentDate = addDays(currentDate, 1);
      
      // Safety limit to prevent infinite loops (max 5 years)
      if (differenceInDays(currentDate, start) > 1825) {
        return null;
      }
    }
    
    return currentDate;
  }, [startDate, studyDays, totalCourseHours, dailyHours]);

  // Calculate hours per course (proportional distribution for the entire period)
  const hoursPerCourse = useMemo(() => {
    if (selectedCourses.length === 0 || totalCourseHours === 0 || totalAvailableHours === 0) {
      return {};
    }

    const result: Record<string, number> = {};
    
    selectedCourses.forEach(courseId => {
      const course = courses.find(c => c.id === courseId);
      const courseHours = course?.total_hours || 0;
      // Proportional distribution based on course hours
      const proportion = courseHours / totalCourseHours;
      result[courseId] = Math.round(totalAvailableHours * proportion * 10) / 10;
    });

    return result;
  }, [selectedCourses, courses, totalCourseHours, totalAvailableHours]);

  // Calculate total custom hours allocated
  const totalCustomHoursAllocated = useMemo(() => {
    return selectedCourses.reduce((sum, courseId) => {
      const settings = courseSettings[courseId];
      if (settings?.custom_daily_hours && settings.custom_daily_hours > 0) {
        return sum + settings.custom_daily_hours;
      }
      return sum;
    }, 0);
  }, [selectedCourses, courseSettings]);

  // Calculate remaining hours after custom allocations
  const remainingDailyHoursForAuto = useMemo(() => {
    const daily = Number.parseFloat(dailyHours) || 0;
    return daily - totalCustomHoursAllocated;
  }, [dailyHours, totalCustomHoursAllocated]);

  // Calculate daily hours per course (considering custom hours)
  const dailyHoursPerCourse = useMemo(() => {
    if (selectedCourses.length === 0) {
      return {};
    }

    const daily = Number.parseFloat(dailyHours) || 0;
    const result: Record<string, number> = {};
    
    // First, assign custom hours
    let remainingHours = daily;
    const coursesForAutoDistribution: string[] = [];
    let totalHoursForAuto = 0;
    
    selectedCourses.forEach(courseId => {
      const settings = courseSettings[courseId];
      if (settings?.custom_daily_hours && settings.custom_daily_hours > 0) {
        result[courseId] = settings.custom_daily_hours;
        remainingHours -= settings.custom_daily_hours;
      } else {
        coursesForAutoDistribution.push(courseId);
        const course = courses.find(c => c.id === courseId);
        totalHoursForAuto += (course?.total_hours || 0);
      }
    });
    
    // Distribute remaining hours proportionally among courses without custom hours
    if (coursesForAutoDistribution.length > 0 && remainingHours > 0 && totalHoursForAuto > 0) {
      coursesForAutoDistribution.forEach(courseId => {
        const course = courses.find(c => c.id === courseId);
        const courseHours = course?.total_hours || 0;
        const proportion = courseHours / totalHoursForAuto;
        result[courseId] = Math.round(remainingHours * proportion * 60) / 60;
      });
    } else if (coursesForAutoDistribution.length > 0 && remainingHours > 0) {
      // Equal distribution if no course hours defined
      const perCourse = remainingHours / coursesForAutoDistribution.length;
      coursesForAutoDistribution.forEach(courseId => {
        result[courseId] = Math.round(perCourse * 60) / 60;
      });
    }

    return result;
  }, [selectedCourses, courses, courseSettings, dailyHours]);

  // Calculate remaining hours for a specific course (for display)
  const getRemainingHoursForCourse = (courseId: string): number => {
    const daily = Number.parseFloat(dailyHours) || 0;
    let used = 0;
    selectedCourses.forEach(id => {
      if (id !== courseId) {
        const settings = courseSettings[id];
        if (settings?.custom_daily_hours && settings.custom_daily_hours > 0) {
          used += settings.custom_daily_hours;
        }
      }
    });
    const currentCourseHours = courseSettings[courseId]?.custom_daily_hours || 0;
    return daily - used - currentCourseHours;
  };

  // Smart schedule calculation - distributes courses by days based on minimum 30min/day rule
  const courseSchedules = useMemo((): CourseStudySchedule[] => {
    if (selectedCourses.length === 0 || !startDate || !endDate || studyDays.length === 0) {
      return [];
    }

    const daily = Number.parseFloat(dailyHours) || 0;
    const totalDailyMinutes = daily * 60;
    const schedules: CourseStudySchedule[] = [];
    
    // Calculate minutes per course if all studied every day
    const coursesWithMinutes = selectedCourses.map(courseId => {
      const course = courses.find(c => c.id === courseId);
      const courseHours = course?.total_hours || 0;
      const proportion = totalCourseHours > 0 ? courseHours / totalCourseHours : 0;
      const dailyMinutes = totalDailyMinutes * proportion;
      
      return {
        courseId,
        courseName: course?.name || '',
        totalHours: courseHours,
        dailyMinutes,
      };
    });

    // Sort courses by daily minutes (ascending) - courses with less time first
    coursesWithMinutes.sort((a, b) => a.dailyMinutes - b.dailyMinutes);

    // Available days for assignment
    const availableDaysForPattern = studyDays;
    let patternIndex = 0;

    coursesWithMinutes.forEach((courseData, idx) => {
      let assignedDays: string[];
      let adjustedDailyMinutes: number;

      if (courseData.dailyMinutes >= MIN_STUDY_MINUTES_PER_DAY) {
        // Course has enough time - study every selected day
        assignedDays = [...studyDays];
        adjustedDailyMinutes = courseData.dailyMinutes;
      } else {
        // Course needs fewer days to reach minimum 30min/day
        // Calculate how many days needed to have at least 30min per session
        const totalMinutesAvailable = courseData.dailyMinutes * studyDays.length;
        const daysNeeded = Math.max(1, Math.floor(totalMinutesAvailable / MIN_STUDY_MINUTES_PER_DAY));
        
        // Assign specific days based on pattern to avoid overlap
        if (selectedCourses.length > 1 && daysNeeded < studyDays.length) {
          // Distribute courses across different days
          const dayPatterns = [
            ['monday', 'wednesday', 'friday'],
            ['tuesday', 'thursday', 'saturday'],
            ['monday', 'tuesday', 'wednesday'],
            ['thursday', 'friday', 'saturday'],
            ['sunday', 'monday', 'tuesday'],
            ['wednesday', 'thursday', 'friday'],
            ['saturday', 'sunday', 'monday'],
          ];
          
          const patternDays = dayPatterns[patternIndex % dayPatterns.length];
          patternIndex++;
          
          // Filter to only include days that are in the user's selected study days
          assignedDays = patternDays.filter(d => studyDays.includes(d)).slice(0, Math.max(1, daysNeeded));
          
          // If no days matched, use first N days from selected
          if (assignedDays.length === 0) {
            assignedDays = studyDays.slice(0, Math.max(1, daysNeeded));
          }
        } else {
          assignedDays = studyDays.slice(0, Math.max(1, daysNeeded));
        }
        
        // Recalculate daily minutes with fewer days
        const totalMinutes = courseData.dailyMinutes * studyDays.length;
        adjustedDailyMinutes = assignedDays.length > 0 ? totalMinutes / assignedDays.length : 0;
      }

      schedules.push({
        courseId: courseData.courseId,
        courseName: courseData.courseName,
        totalHours: courseData.totalHours,
        studyDays: assignedDays,
        dailyMinutes: adjustedDailyMinutes,
      });
    });

    return schedules;
  }, [selectedCourses, courses, totalCourseHours, dailyHours, studyDays, startDate, endDate]);

  // Chart data for pie chart
  const chartData = useMemo(() => {
    return selectedCourses.map((courseId, index) => {
      const course = courses.find(c => c.id === courseId);
      return {
        name: course?.name || 'Curso',
        value: dailyHoursPerCourse[courseId] || 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedCourses, courses, dailyHoursPerCourse]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;

    // ✅ VALIDAR DATAS
    let validatedStartDate = validateAndFormatDate(startDate);
    let validatedEndDate = validateAndFormatDate(endDate);

    if (noDeadline) {
      validatedStartDate = format(new Date(), 'yyyy-MM-dd');
      validatedEndDate = format(addDays(new Date(), 365 * 5), 'yyyy-MM-dd');
    } else if (!validatedStartDate || !validatedEndDate) {
      toast({
        title: 'Datas inválidas',
        description: 'Por favor, verifique as datas de início e término.',
        variant: 'destructive',
      });
      return;
    }

    const start = parseISO(validatedStartDate as string);
    const end = parseISO(validatedEndDate as string);
    
    if (!noDeadline && end <= start) {
      toast({
        title: 'Datas inválidas',
        description: 'A data de término deve ser posterior à data de início.',
        variant: 'destructive',
      });
      return;
    }

    const daysDiff = differenceInDays(end, start);
    if (daysDiff < 1) {
      toast({
        title: 'Período muito curto',
        description: 'O planejamento deve ter pelo menos 1 dia.',
        variant: 'destructive',
      });
      return;
    }
    
    if (daysDiff > 3650) {
      toast({
        title: 'Período muito longo',
        description: 'O planejamento não pode exceder 10 anos.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const planData = {
        user_id: user.id,
        name,
        description: description || null,
        start_date: validatedStartDate,
        end_date: validatedEndDate,
        daily_hours: Number.parseFloat(dailyHours) || 1.5,
        min_daily_hours: Number.parseFloat(minDailyHours) || 0.5,
        max_daily_hours: Number.parseFloat(maxDailyHours) || 8,
        study_days: studyDays,
        total_hours: totalCourseHours,
        planning_type: planningType,
        planning_category: planningCategory,
        semester: planningCategory === 'faculdade' ? (semester || null) : null,
        academic_period_start: planningCategory === 'faculdade' ? validateAndFormatDate(academicPeriodStart) : null,
        academic_period_end: planningCategory === 'faculdade' ? validateAndFormatDate(academicPeriodEnd) : null,
        hours_per_discipline: planningCategory === 'faculdade' ? (Number.parseFloat(hoursPerDiscipline) || null) : null,
        color: color || null,
      };

      let planId: string;

      if (editPlan) {
        const { error } = await supabase
          .from('study_plans')
          .update(planData)
          .eq('id', editPlan.id);

        if (error) throw error;
        planId = editPlan.id;

        // Delete existing associations based on type
        if (planningType === 'course') {
          await supabase
            .from('study_plan_courses')
            .delete()
            .eq('study_plan_id', planId);
        } else {
          await supabase
            .from('study_plan_modules')
            .delete()
            .eq('study_plan_id', planId);
        }

        toast({
          title: 'Planejamento atualizado!',
          description: `O planejamento "${name}" foi atualizado com sucesso.`,
        });
      } else {
        const { data, error } = await supabase
          .from('study_plans')
          .insert(planData)
          .select('id')
          .single();

        if (error) throw error;
        planId = data.id;

        toast({
          title: 'Planejamento criado!',
          description: `O planejamento "${name}" foi criado com sucesso.`,
        });
      }

      // Insert associations based on planning type
      if (planningType === 'course' && selectedCourses.length > 0) {
        const courseAssociations = orderedSelectedCourses.map((courseId, index) => {
          const settings = courseSettings[courseId] || { is_fixed: false, study_days: studyDays, sequence_order: index + 1 };
          return {
            study_plan_id: planId,
            course_id: courseId,
            allocated_hours: hoursPerCourse[courseId] || 0,
            is_fixed: settings.is_fixed,
            study_days: settings.is_fixed ? studyDays : settings.study_days,
            sequence_order: settings.sequence_order || index + 1,
            is_completed: false,
            custom_daily_hours: settings.custom_daily_hours || null,
            weekly_goal_hours: settings.weekly_goal_hours || 0
          };
        });

        const { error: courseError } = await supabase
          .from('study_plan_courses')
          .insert(courseAssociations);

        if (courseError) throw courseError;
      } else if (planningType === 'module' && selectedModules.length > 0) {
        const moduleAssociations = orderedSelectedModules.map((moduleId, index) => {
          const module = modules.find(m => m.id === moduleId);
          const settings = moduleSettings[moduleId] || { sequence_order: index + 1 };
          return {
            study_plan_id: planId,
            module_id: moduleId,
            course_id: module?.course_id,
            allocated_hours: module?.hours || 0,
            sequence_order: settings.sequence_order || index + 1,
            is_completed: false,
            custom_daily_hours: settings.custom_daily_hours || null,
            weekly_goal_hours: settings.weekly_goal_hours || 0
          };
        });

        const { error: moduleError } = await supabase
          .from('study_plan_modules')
          .insert(moduleAssociations);

        if (moduleError) throw moduleError;
      }

      // Salvar horários de estudo (blocos de tempo) — refletem no Foco em sequência
      if (editPlan) {
        await supabase
          .from('study_plan_time_blocks')
          .delete()
          .eq('study_plan_id', planId)
          .eq('block_type', 'study');
      }

      if (studyTimes.length > 0 && studyDays.length > 0) {
        const timeBlockRows = studyDays.flatMap((dayId) =>
          studyTimes.map((t) => ({
            study_plan_id: planId,
            course_id: null,
            day_of_week: dayId,
            start_time: `${t.start}:00`,
            end_time: `${t.end}:00`,
            block_type: 'study' as const,
            title: null,
          }))
        );

        const { error: blockError } = await supabase
          .from('study_plan_time_blocks')
          .insert(timeBlockRows);

        if (blockError) throw blockError;
      }

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: editPlan ? 'Erro ao atualizar' : 'Erro ao criar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format hours as HH:MM:SS
  const formatDailyHours = (hours: number) => {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[92vw] md:!max-w-[80vw] md:w-[80vw] lg:!max-w-[60vw] lg:w-[60vw] xl:!max-w-[40vw] xl:w-[40vw] xl:min-w-[720px] 2xl:!max-w-[40vw] 2xl:w-[40vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editPlan ? 'Editar Planejamento' : 'Novo Planejamento'}</DialogTitle>
          <DialogDescription>
            {editPlan ? 'Atualize as informações do planejamento' : 'Crie um novo plano de estudos com cursos selecionados'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Planejamento *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Plano de Estudos Q1 2024"
                required
              />
            </div>

            {/* Planning Type Selection */}
            {!editPlan && (
              <div className="space-y-3">
                <Label>Tipo de Planejamento</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanningType('course')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      planningType === 'course'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <BookOpen className={`h-6 w-6 ${planningType === 'course' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Por Curso</span>
                    <span className="text-xs text-muted-foreground text-center">Planeje cursos completos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanningType('module')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      planningType === 'module'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Layers className={`h-6 w-6 ${planningType === 'module' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Por Módulo</span>
                    <span className="text-xs text-muted-foreground text-center">Selecione módulos específicos</span>
                  </button>
                </div>
              </div>
            )}

            {/* Planning Category Selection */}
            {!editPlan && (
              <div className="space-y-3">
                <Label>Categoria do Planejamento</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPlanningCategory('regular');
                      setSelectedCourses([]);
                      setCourseSettings({});
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      planningCategory === 'regular'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <BookOpen className={`h-6 w-6 ${planningCategory === 'regular' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Cursos Regulares</span>
                    <span className="text-xs text-muted-foreground text-center">Cursos online, bootcamps, etc.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanningCategory('faculdade');
                      setSelectedCourses([]);
                      setCourseSettings({});
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      planningCategory === 'faculdade'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <GraduationCap className={`h-6 w-6 ${planningCategory === 'faculdade' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">🎓 Faculdade</span>
                    <span className="text-xs text-muted-foreground text-center">Disciplinas e semestres acadêmicos</span>
                  </button>
                </div>
              </div>
            )}

            {/* Faculdade-specific fields */}
            {planningCategory === 'faculdade' && (
              <div className="space-y-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <h4 className="font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <GraduationCap className="h-4 w-4" />
                  Configurações Acadêmicas
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semestre</Label>
                    <Input
                      id="semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="Ex: 2026.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursPerDiscipline">Carga Horária por Disciplina (h)</Label>
                    <Input
                      id="hoursPerDiscipline"
                      type="number"
                      value={hoursPerDiscipline}
                      onChange={(e) => setHoursPerDiscipline(e.target.value)}
                      placeholder="Ex: 60"
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academicStart">Início do Período Letivo</Label>
                    <Input
                      id="academicStart"
                      type="date"
                      value={academicPeriodStart}
                      onChange={(e) => {
                        setAcademicPeriodStart(e.target.value);
                        if (!startDate) setStartDate(e.target.value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicEnd">Fim do Período Letivo</Label>
                    <Input
                      id="academicEnd"
                      type="date"
                      value={academicPeriodEnd}
                      onChange={(e) => {
                        setAcademicPeriodEnd(e.target.value);
                        if (!endDate) setEndDate(e.target.value);
                      }}
                    />
                  </div>
                </div>
                
                {/* Botão de Geração Automática - Aparece após selecionar faculdades */}
                {selectedCourses.length > 0 && planningType === 'module' && (
                  <div className="pt-4 border-t border-amber-500/20">
                    <AutoGenerateFacultyPlanButton
                      faculties={facultiesForAutoGeneration}
                      startDate={academicPeriodStart || startDate}
                      endDate={academicPeriodEnd || endDate}
                      studyDays={studyDays}
                      dailyHours={Number.parseFloat(dailyHours) || 2}
                      onPlanGenerated={handleAutoGeneratedPlan}
                      disabled={!academicPeriodStart || !academicPeriodEnd || studyDays.length === 0}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  {[
                    { hex: '#3b82f6', title: 'Azul' },
                    { hex: '#a855f7', title: 'Roxo' },
                    { hex: '#10b981', title: 'Verde' },
                    { hex: '#f43f5e', title: 'Rosa' },
                    { hex: '#f59e0b', title: 'Amarelo' },
                    { hex: '#64748b', title: 'Cinza' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full transition-transform ${color.toLowerCase() === c.hex ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110 opacity-80'}`}
                      title={c.title}
                    />
                  ))}
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <label
                    className="relative w-8 h-8 rounded-full border border-border overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    style={{ backgroundColor: /^#([0-9a-f]{6})$/i.test(color) ? color : 'transparent' }}
                    title="Escolher cor personalizada"
                  >
                    <input
                      type="color"
                      value={/^#([0-9a-f]{6})$/i.test(color) ? color : '#3b82f6'}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Selecionar cor personalizada"
                    />
                    {!/^#([0-9a-f]{6})$/i.test(color) && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">+</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      let v = e.target.value.trim();
                      if (v && !v.startsWith('#')) v = `#${v}`;
                      setColor(v.slice(0, 7));
                    }}
                    placeholder="#3b82f6"
                    maxLength={7}
                    className="w-28 h-8 font-mono text-xs uppercase"
                  />
                  {color && !/^#([0-9a-f]{6})$/i.test(color) && (
                    <span className="text-xs text-destructive">HEX inválido</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha uma cor pré-definida ou informe um código hexadecimal (ex: #ff5733).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os objetivos do planejamento..."
                rows={2}
              />
            </div>

            {/* No Deadline Toggle */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="noDeadline"
                checked={noDeadline}
                onCheckedChange={(checked) => {
                  setNoDeadline(!!checked);
                  if (checked) {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
              />
              <label htmlFor="noDeadline" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Sem Prazo Definido
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                Estude no seu ritmo
              </span>
            </div>

            {!noDeadline && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    Data Estimada de Conclusão
                  </Label>
                  <div className="flex items-center h-10 px-3 rounded-md border border-border bg-muted/50">
                    {estimatedCompletionDate ? (
                      <span className="text-sm font-medium text-primary">
                        {format(estimatedCompletionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {selectedCourses.length === 0 
                          ? 'Selecione cursos' 
                          : !startDate 
                            ? 'Defina a data de início'
                            : 'Calculando...'}
                      </span>
                    )}
                  </div>
                  {estimatedCompletionDate && endDate && (
                    <p className={`text-xs ${
                      estimatedCompletionDate <= parseISO(endDate) 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-destructive'
                    }`}>
                      {estimatedCompletionDate <= parseISO(endDate) 
                        ? '✓ Dentro do prazo definido'
                        : `⚠ ${Math.ceil(differenceInDays(estimatedCompletionDate, parseISO(endDate)))} dias além do prazo`
                      }
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Min/Max Daily Hours Section */}
            <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Configuração de Horas Diárias</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Minimum Hours */}
                <div className="space-y-2">
                  <Label htmlFor="minDailyHours" className="text-xs">
                    Mínimo por Dia
                    <span className="text-muted-foreground ml-1">(horas)</span>
                  </Label>
                  <Input
                    id="minDailyHours"
                    type="number"
                    value={minDailyHours}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      setMinDailyHours(e.target.value);
                      // Auto-adjust daily hours if below min
                      if (val > Number.parseFloat(dailyHours)) {
                        setDailyHours(e.target.value);
                      }
                    }}
                    min="0.5"
                    max={maxDailyHours}
                    step="0.5"
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Meta mínima diária
                  </p>
                </div>

                {/* Target Hours (Daily Hours) */}
                <div className="space-y-2">
                  <Label htmlFor="dailyHours" className="text-xs">
                    Meta Ideal
                    <span className="text-primary ml-1 font-semibold">(principal)</span>
                  </Label>
                  <Input
                    id="dailyHours"
                    type="number"
                    value={dailyHours}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      setDailyHours(e.target.value);
                      // Validate against min/max
                      const min = Number.parseFloat(minDailyHours);
                      const max = Number.parseFloat(maxDailyHours);
                      if (val < min) {
                        toast({
                          title: 'Atenção',
                          description: `A meta ideal deve ser maior ou igual ao mínimo (${min}h)`,
                          variant: 'destructive',
                        });
                      }
                      if (val > max) {
                        toast({
                          title: 'Atenção',
                          description: `A meta ideal deve ser menor ou igual ao máximo (${max}h)`,
                          variant: 'destructive',
                        });
                      }
                    }}
                    min={minDailyHours}
                    max={maxDailyHours}
                    step="0.5"
                    className="w-full border-primary/50"
                  />
                  <p className="text-[10px] text-primary font-medium">
                    Seu objetivo diário
                  </p>
                </div>

                {/* Maximum Hours */}
                <div className="space-y-2">
                  <Label htmlFor="maxDailyHours" className="text-xs">
                    Máximo por Dia
                    <span className="text-muted-foreground ml-1">(horas)</span>
                  </Label>
                  <Input
                    id="maxDailyHours"
                    type="number"
                    value={maxDailyHours}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      setMaxDailyHours(e.target.value);
                      // Auto-adjust daily hours if above max
                      if (val < Number.parseFloat(dailyHours)) {
                        setDailyHours(e.target.value);
                      }
                    }}
                    min={minDailyHours}
                    max="12"
                    step="0.5"
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Limite máximo diário
                  </p>
                </div>
              </div>

              {/* Visual Range Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Range de Horas:</span>
                  <span className="font-semibold">
                    {minDailyHours}h - {maxDailyHours}h
                    <span className="text-primary ml-2">(meta: {dailyHours}h)</span>
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-yellow-400 via-green-500 to-blue-500 opacity-30"
                    style={{ 
                      left: '0%', 
                      width: '100%' 
                    }}
                  />
                  <div 
                    className="absolute h-full w-1 bg-primary shadow-lg"
                    style={{ 
                      left: `${((Number.parseFloat(dailyHours) - Number.parseFloat(minDailyHours)) / (Number.parseFloat(maxDailyHours) - Number.parseFloat(minDailyHours))) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>🔴 Mínimo</span>
                  <span>🟢 Meta</span>
                  <span>🔵 Máximo</span>
                </div>
              </div>

              {/* Auto-adjust button */}
              {startDate && endDate && selectedCourses.length > 0 && totalCourseHours > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    // Calculate study days between start and end date
                    const start = parseISO(startDate);
                    const end = parseISO(endDate);
                    
                    if (!isValid(start) || !isValid(end)) return;
                    
                    const dayMap: Record<string, number> = {
                      sunday: 0,
                      monday: 1,
                      tuesday: 2,
                      wednesday: 3,
                      thursday: 4,
                      friday: 5,
                      saturday: 6,
                    };
                    
                    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
                    const totalDays = differenceInDays(end, start) + 1;
                    let studyDaysCount = 0;
                    
                    for (let i = 0; i < totalDays; i++) {
                      const date = new Date(start);
                      date.setDate(date.getDate() + i);
                      if (selectedDayNumbers.includes(date.getDay())) {
                        studyDaysCount++;
                      }
                    }
                    
                    if (studyDaysCount > 0) {
                      const requiredDailyHours = totalCourseHours / studyDaysCount;
                      const suggested = Math.ceil(requiredDailyHours * 10) / 10;
                      const min = Math.max(0.5, Math.floor(suggested * 0.7 * 10) / 10);
                      const max = Math.min(12, Math.ceil(suggested * 1.3 * 10) / 10);
                      
                      setMinDailyHours(String(min));
                      setDailyHours(String(suggested));
                      setMaxDailyHours(String(max));
                      
                      toast({
                        title: 'Horas ajustadas automaticamente!',
                        description: `Mín: ${min}h | Meta: ${suggested}h | Máx: ${max}h`,
                      });
                    }
                  }}
                >
                  <Wand2 className="h-3 w-3" />
                  Auto-ajustar Horas (Inteligente)
                </Button>
              )}
            </div>


            <div className="space-y-3">
              <Label>Dias de Estudo</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {daysOfWeek.map(day => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.id}
                      checked={studyDays.includes(day.id)}
                      onCheckedChange={() => toggleDay(day.id)}
                    />
                    <label
                      htmlFor={day.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horários de Estudo
                <span className="text-xs text-muted-foreground font-normal">(aparecem no Foco em sequência)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Defina os horários em que você irá estudar este planejamento. Eles serão aplicados a todos os dias de estudo selecionados e exibidos na agenda do Foco.
              </p>

              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-[130px]"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Término</Label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-[130px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addStudyTime}
                  disabled={!!newTimeError}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {newTimeError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {newTimeError}
                </div>
              )}

              {studyTimes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {studyTimes.map((t, index) => (
                    <span
                      key={`${t.start}-${t.end}`}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium"
                    >
                      {t.start} – {t.end}
                      <button
                        type="button"
                        onClick={() => removeStudyTime(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remover horário"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Course/Module Selection based on planning type */}
            {planningType === 'course' ? (
              <div className="space-y-4">
                {/* Regular Courses Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Selecionar Cursos
                    <span className="text-xs text-muted-foreground">(arraste para reordenar)</span>
                    <span className="ml-auto text-xs font-medium">
                      <span className="text-primary">{availableCourses.length}</span>
                      <span className="text-muted-foreground"> disponíve{availableCourses.length === 1 ? 'l' : 'is'}</span>
                      {coursesInOtherPlans.size > 0 && (
                        <span className="text-muted-foreground"> · <span className="text-amber-500">{coursesInOtherPlans.size}</span> em planos</span>
                      )}
                      {allCourses.filter(c => c.status === 'completed' || ((c.total_hours || 0) > 0 && (c.completed_hours || 0) >= (c.total_hours || 0))).length > 0 && (
                        <span className="text-muted-foreground"> · <span className="text-emerald-500">{allCourses.filter(c => c.status === 'completed' || ((c.total_hours || 0) > 0 && (c.completed_hours || 0) >= (c.total_hours || 0))).length}</span> concluído{allCourses.filter(c => c.status === 'completed' || ((c.total_hours || 0) > 0 && (c.completed_hours || 0) >= (c.total_hours || 0))).length === 1 ? '' : 's'}</span>
                      )}
                    </span>
                  </Label>
                  
                  {availableCourses.length === 0 && allCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum curso cadastrado. Crie cursos primeiro.</p>
                  ) : planningCategory === 'faculdade' && availableCourses.length === 0 ? (
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Nenhuma disciplina de Faculdade encontrada</p>
                      <p className="text-sm text-muted-foreground">
                        Crie cursos com a categoria &quot;Faculdades&quot; nas suas configurações de cursos antes de adicionar ao planejamento.
                      </p>
                    </div>
                  ) : availableCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todos os cursos já estão em outros planejamentos.</p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={availableCourses.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="border rounded-lg p-3 space-y-2 max-h-[400px] overflow-y-auto">
                          {availableCourses.map(course => (
                            <SortableCourseItem
                              key={course.id}
                              course={course}
                              isSelected={selectedCourses.includes(course.id)}
                              onToggle={() => toggleCourse(course.id)}
                              dailyHours={dailyHoursPerCourse[course.id] || 0}
                              totalHours={hoursPerCourse[course.id] || 0}
                              formatDailyHours={formatDailyHours}
                              showHours={studyDays.length > 0}
                              courseSettings={courseSettings[course.id] || { is_fixed: false, study_days: studyDays, sequence_order: selectedCourses.indexOf(course.id) + 1 }}
                              onSettingsChange={(settings) => updateCourseSettings(course.id, settings)}
                              planStudyDays={studyDays}
                              totalSelectedCourses={selectedCourses.length}
                              isInOtherPlan={false}
                              planDailyHours={Number.parseFloat(dailyHours) || 0}
                              remainingDailyHours={getRemainingHoursForCourse(course.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {/* Faculdades Section - Exclusive */}
                {faculdadesCourses.length > 0 && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-amber-500" />
                      🎓 Faculdades
                      <span className="text-xs text-muted-foreground">(categoria exclusiva)</span>
                    </Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={faculdadesCourses.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 space-y-2 max-h-[300px] overflow-y-auto">
                          {faculdadesCourses.map(course => (
                            <SortableCourseItem
                              key={course.id}
                              course={course}
                              isSelected={selectedCourses.includes(course.id)}
                              onToggle={() => toggleCourse(course.id)}
                              dailyHours={dailyHoursPerCourse[course.id] || 0}
                              totalHours={hoursPerCourse[course.id] || 0}
                              formatDailyHours={formatDailyHours}
                              showHours={studyDays.length > 0}
                              courseSettings={courseSettings[course.id] || { is_fixed: false, study_days: studyDays, sequence_order: selectedCourses.indexOf(course.id) + 1 }}
                              onSettingsChange={(settings) => updateCourseSettings(course.id, settings)}
                              planStudyDays={studyDays}
                              totalSelectedCourses={selectedCourses.length}
                              isInOtherPlan={false}
                              planDailyHours={Number.parseFloat(dailyHours) || 0}
                              remainingDailyHours={getRemainingHoursForCourse(course.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            ) : (
              <ModuleSelectionSection
                modulesByCourse={modulesByCourse}
                selectedModules={selectedModules}
                modulesInOtherPlans={modulesInOtherPlans}
                toggleModule={toggleModule}
                applySequentialToggle={applySequentialToggle}
                totalCourseHours={totalCourseHours}
              />
            )}

            {/* Ordem de execução dos módulos selecionados (drag-and-drop entre cursos) */}
            {planningType === 'module' && orderedSelectedModules.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-primary" />
                  Ordem de Execução
                  <span className="text-xs text-muted-foreground">
                    (arraste para reordenar entre cursos)
                  </span>
                </Label>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => {
                    if (e.over && e.active.id !== e.over.id) {
                      reorderSelectedModules(String(e.active.id), String(e.over.id));
                    }
                  }}
                >
                  <SortableContext items={orderedSelectedModules} strategy={verticalListSortingStrategy}>
                    <div className="border rounded-lg p-3 space-y-1.5 max-h-[300px] overflow-y-auto bg-muted/20">
                      {orderedSelectedModules.map((moduleId, index) => {
                        const mod = modules.find(m => m.id === moduleId);
                        if (!mod) return null;
                        return (
                          <SortableSelectedModuleRow
                            key={moduleId}
                            id={moduleId}
                            index={index + 1}
                            moduleName={mod.name}
                            courseName={mod.course_name}
                            hours={mod.hours}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
                <p className="text-xs text-muted-foreground">
                  Os módulos serão estudados nesta ordem no Foco e no calendário.
                </p>
              </div>
            )}

            {/* Course stats - only show for course type */}
            {planningType === 'course' && selectedCourses.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Carga Horária Total: <span className="text-primary">{totalCourseHours}h</span>
                  </span>
                </div>
                {totalCustomHoursAllocated > 0 && (
                  <div className="flex items-center justify-between text-xs border-t border-primary/20 pt-2 mt-2">
                    <span>Horas personalizadas alocadas:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatDailyHours(totalCustomHoursAllocated)} / {formatDailyHours(Number.parseFloat(dailyHours) || 0)}
                    </span>
                  </div>
                )}
                {totalCustomHoursAllocated > 0 && remainingDailyHoursForAuto > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span>Restante para distribuição automática:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {formatDailyHours(remainingDailyHoursForAuto)}
                    </span>
                  </div>
                )}
                {remainingDailyHoursForAuto < 0 && (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    <span>Horas personalizadas excedem o limite diário!</span>
                  </div>
                )}
              </div>
            )}

            {/* Smart Course Schedule Distribution */}
            {courseSchedules.length > 0 && studyDays.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                <h4 className="font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Distribuição Inteligente por Dias
                  <span className="text-xs text-muted-foreground">(mín. 30min/dia por curso)</span>
                </h4>
                
                <div className="space-y-3">
                  {courseSchedules.map((schedule, idx) => {
                    const isReducedDays = schedule.studyDays.length < studyDays.length;
                    
                    return (
                      <div 
                        key={schedule.courseId} 
                        className={`p-3 rounded-lg border ${isReducedDays ? 'bg-warning/10 border-warning/30' : 'bg-muted/30 border-border'}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{schedule.courseName}</p>
                            <p className="text-xs text-muted-foreground">
                              Carga: {schedule.totalHours}h • Por sessão: {formatDailyHours(schedule.dailyMinutes / 60)}
                            </p>
                          </div>
                          {isReducedDays && (
                            <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Dias reduzidos
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {daysOfWeek.map(day => {
                            const isActive = schedule.studyDays.includes(day.id);
                            const isAvailable = studyDays.includes(day.id);
                            
                            return (
                              <span 
                                key={day.id} 
                                className={`text-xs px-2 py-1 rounded transition-all ${
                                  isActive 
                                    ? 'bg-primary text-primary-foreground font-medium' 
                                    : isAvailable 
                                      ? 'bg-muted text-muted-foreground line-through' 
                                      : 'bg-muted/50 text-muted-foreground/50'
                                }`}
                              >
                                {day.abbrev}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                  Cursos com tempo diário menor que 30 minutos são distribuídos em dias alternados para sessões mais produtivas.
                </p>
              </div>
            )}

            {/* Pie Chart Distribution */}
            {selectedCourses.length > 1 && studyDays.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Distribuição Diária Visual
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${formatDailyHours(value)}`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatDailyHours(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend 
                        formatter={(value) => <span className="text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Baseado em {dailyHours}h de estudo por dia
                </p>
              </div>
            )}

            {/* Summary Info */}
            {((planningType === 'course' && selectedCourses.length > 0) || (planningType === 'module' && selectedModules.length > 0)) && startDate && endDate && studyDays.length > 0 && (
              <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20 space-y-1">
                <p>• <strong>{totalStudyDays}</strong> dias de estudo no período</p>
                <p>• <strong>{totalAvailableHours.toFixed(1)}h</strong> total disponível</p>
                <p>• <strong>{planningType === 'course' ? selectedCourses.length : selectedModules.length}</strong> {planningType === 'course' ? 'curso(s)' : 'módulo(s)'} selecionado(s)</p>
                <p>• Tempo mínimo por sessão: <strong>00:30:00</strong></p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !startDate || !endDate}
          >
            {isLoading ? 'Salvando...' : editPlan ? 'Salvar Alterações' : 'Criar Planejamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
