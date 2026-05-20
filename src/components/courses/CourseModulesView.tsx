import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Clock, BookOpen, ChevronDown, ChevronUp, ChevronRight, Plus, Edit2, Trash2, X, Save, RefreshCw, StickyNote, Calendar, AlertCircle, GripVertical, ChevronsUpDown, Filter } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Resolve um valor de weight_color para um HEX exibível.
 * Mantém retrocompatibilidade com os valores legados 'green' / 'yellow' / 'red'.
 */
const LEGACY_WEIGHT_HEX: Record<string, string> = {
  green: '#10b981',
  yellow: '#eab308',
  red: '#ef4444',
};
const resolveWeightHex = (value: string | null | undefined): string => {
  if (!value) return LEGACY_WEIGHT_HEX.green;
  if (LEGACY_WEIGHT_HEX[value]) return LEGACY_WEIGHT_HEX[value];
  if (/^#([0-9a-f]{6})$/i.test(value)) return value;
  return LEGACY_WEIGHT_HEX.green;
};
const weightLabel = (value: string | null | undefined): string => {
  if (value === 'red') return 'Difícil';
  if (value === 'yellow') return 'Médio';
  if (value === 'green' || !value) return 'Fácil';
  return 'Cor personalizada';
};

interface ModuleColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  size?: 'sm' | 'md';
}
function ModuleColorPicker({ value, onChange, size = 'sm' }: ModuleColorPickerProps) {
  const presets = [
    { hex: '#10b981', title: 'Verde / Fácil' },
    { hex: '#eab308', title: 'Amarelo / Médio' },
    { hex: '#ef4444', title: 'Vermelho / Difícil' },
    { hex: '#3b82f6', title: 'Azul' },
    { hex: '#a855f7', title: 'Roxo' },
  ];
  const isHex = /^#([0-9a-f]{6})$/i.test(value);
  const dot = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-1.5 border rounded-md px-1.5 h-8 sm:h-9 bg-background">
      {presets.map((p) => {
        const active = value.toLowerCase() === p.hex;
        return (
          <button
            key={p.hex}
            type="button"
            onClick={() => onChange(p.hex)}
            style={{ backgroundColor: p.hex }}
            className={`${dot} rounded-full transition-transform ${active ? 'scale-110 ring-2 ring-offset-1 ring-offset-background' : 'opacity-70 hover:opacity-100 hover:scale-110'}`}
            title={p.title}
          />
        );
      })}
      <label
        className={`relative ${dot} rounded-full border border-border overflow-hidden cursor-pointer`}
        style={{ backgroundColor: isHex && !presets.some((p) => p.hex === value.toLowerCase()) ? value : 'transparent' }}
        title="Cor personalizada (HEX)"
      >
        <input
          type="color"
          value={isHex ? value : '#10b981'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Selecionar cor personalizada"
        />
        {!(isHex && !presets.some((p) => p.hex === value.toLowerCase())) && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground">+</span>
        )}
      </label>
    </div>
  );
}


interface SubModule {
  id: string;
  module_id: string;
  name: string;
  hours: number;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface Module {
  id: string;
  name: string;
  hours: number;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
  needs_review: boolean;
  review_date: string | null;
  review_notes: string | null;
  last_reviewed_at: string | null;
  weight_color?: string | null;
  is_parent: boolean;
  subModules?: SubModule[];
  isExpanded?: boolean;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  total_hours: number;
  completed_hours: number;
  status: string;
  is_favorite: boolean;
}

interface CourseModulesViewProps {
  course: Course;
  onModuleUpdate?: () => void;
}

// Sortable SubModule Item Component
interface SortableSubModuleItemProps {
  subModule: SubModule;
  subIndex: number;
  isEditing: boolean;
  editName: string;
  editHours: string;
  onEditNameChange: (value: string) => void;
  onEditHoursChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleComplete: (e: React.MouseEvent) => void;
}

function SortableSubModuleItem({
  subModule,
  subIndex,
  isEditing,
  editName,
  editHours,
  onEditNameChange,
  onEditHoursChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  onToggleComplete,
}: SortableSubModuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subModule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2 py-1 group",
        isDragging && "opacity-50 bg-primary/5 rounded"
      )}
    >
      <div className="w-2 h-px bg-primary/20 shrink-0" />
      {isEditing ? (
        // Edit mode
        <>
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="flex-1 h-6 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
          />
          <Input
            type="number"
            step="0.5"
            min="0.1"
            value={editHours}
            onChange={(e) => onEditHoursChange(e.target.value)}
            className="w-14 h-6 text-xs font-mono"
          />
          <Button
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onSave}
            disabled={!editName.trim()}
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        // View mode
        <>
          <button
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            className="shrink-0"
            onClick={onToggleComplete}
          >
            {subModule.is_completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <span className={cn(
            "flex-1 text-xs break-words leading-tight",
            subModule.is_completed && "line-through text-muted-foreground"
          )}>
            {subIndex + 1}. {subModule.name}
          </span>
          <Badge variant="outline" className="shrink-0 text-[9px] font-mono px-1 whitespace-nowrap">
            {formatHoursHMS(subModule.hours)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onStartEdit}
            title="Editar submódulo"
          >
            <Edit2 className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Excluir submódulo"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </>
      )}
    </motion.div>
  );
}

// Sortable Module Item Component
interface SortableModuleItemProps {
  module: Module;
  index: number;
  children: React.ReactNode;
}

function SortableModuleItem({ module, index, children }: SortableModuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 cursor-grab active:cursor-grabbing touch-none opacity-0 hover:opacity-100 transition-opacity z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function CourseModulesView({ course, onModuleUpdate }: CourseModulesViewProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [subModulesMap, setSubModulesMap] = useState<Record<string, SubModule[]>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleHours, setNewModuleHours] = useState('1');
  const [newModuleWeightColor, setNewModuleWeightColor] = useState<string>('#10b981');
  const [editName, setEditName] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editWeightColor, setEditWeightColor] = useState<string>('#10b981');
  
  // Submodule add state
  const [addingSubModuleToId, setAddingSubModuleToId] = useState<string | null>(null);
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [newSubModuleHours, setNewSubModuleHours] = useState('0.5');
  
  // Submodule edit state
  const [editingSubModuleId, setEditingSubModuleId] = useState<string | null>(null);
  const [editSubModuleName, setEditSubModuleName] = useState('');
  const [editSubModuleHours, setEditSubModuleHours] = useState('');
  
  // Review dialog state
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewingModule, setReviewingModule] = useState<Module | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDate, setReviewDate] = useState<Date | undefined>();
  const [needsReview, setNeedsReview] = useState(false);
  
  // Filter state
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  
  const { toast } = useToast();

  // DnD sensors for submodule reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if any module has submodules for the expand/collapse all button
  const hasAnySubModules = useMemo(() => {
    return Object.values(subModulesMap).some(subs => subs.length > 0);
  }, [subModulesMap]);

  const modulesWithSubModules = useMemo(() => {
    return modules.filter(m => (subModulesMap[m.id]?.length || 0) > 0);
  }, [modules, subModulesMap]);

  const allExpanded = useMemo(() => {
    if (modulesWithSubModules.length === 0) return false;
    return modulesWithSubModules.every(m => expandedModules.has(m.id));
  }, [modulesWithSubModules, expandedModules]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedModules(new Set());
    } else {
      // Expand all that have submodules
      setExpandedModules(new Set(modulesWithSubModules.map(m => m.id)));
    }
  };

  useEffect(() => {
    fetchModules();
  }, [course.id]);

  const fetchModules = async () => {
    setIsLoading(true);
    
    // Fetch modules
    const { data: modulesData, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', course.id)
      .order('order_index', { ascending: true });

    if (modulesError) {
      toast({
        title: 'Erro ao carregar módulos',
        description: modulesError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Fetch all submodules for this course's modules
    const moduleIds = (modulesData || []).map(m => m.id);
    let subModulesData: SubModule[] = [];
    
    if (moduleIds.length > 0) {
      const { data, error: subModulesError } = await supabase
        .from('course_submodules')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });
      
      if (!subModulesError) {
        subModulesData = data || [];
      }
    }

    // Group submodules by module_id
    const subModulesByModule: Record<string, SubModule[]> = {};
    subModulesData.forEach(sub => {
      if (!subModulesByModule[sub.module_id]) {
        subModulesByModule[sub.module_id] = [];
      }
      subModulesByModule[sub.module_id].push(sub);
    });

    setModules(modulesData || []);
    setSubModulesMap(subModulesByModule);
    setIsLoading(false);
  };

  const addModule = async () => {
    if (!newModuleName.trim()) return;
    
    const hours = parseFloat(newModuleHours) || 1;
    const nextIndex = modules.length > 0 ? Math.max(...modules.map(m => m.order_index)) + 1 : 0;
    
    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: course.id,
        name: newModuleName.trim(),
        hours,
        order_index: nextIndex,
        weight_color: newModuleWeightColor,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao adicionar módulo',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setModules(prev => [...prev, data]);
      setNewModuleName('');
      setNewModuleHours('1');
      setNewModuleWeightColor('#10b981');
      setShowAddForm(false);
      
      // Update course total hours
      const newTotalHours = modules.reduce((sum, m) => sum + m.hours, 0) + hours;
      await supabase
        .from('courses')
        .update({ total_hours: newTotalHours })
        .eq('id', course.id);
      
      onModuleUpdate?.();
      toast({ title: 'Módulo adicionado!' });
    }
  };

  const updateModule = async (moduleId: string) => {
    if (!editName.trim()) return;
    
    const hours = parseFloat(editHours) || 1;
    
    const { error } = await supabase
      .from('course_modules')
      .update({ name: editName.trim(), hours, weight_color: editWeightColor })
      .eq('id', moduleId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setModules(prev =>
        prev.map(m =>
          m.id === moduleId ? { ...m, name: editName.trim(), hours, weight_color: editWeightColor } : m
        )
      );
      setEditingId(null);
      
      // Update course total hours
      const updatedModules = modules.map(m =>
        m.id === moduleId ? { ...m, hours } : m
      );
      const newTotalHours = updatedModules.reduce((sum, m) => sum + m.hours, 0);
      await supabase
        .from('courses')
        .update({ total_hours: newTotalHours })
        .eq('id', course.id);
      
      onModuleUpdate?.();
      toast({ title: 'Módulo atualizado!' });
    }
  };

  const deleteModule = async (moduleId: string) => {
    const moduleToDelete = modules.find(m => m.id === moduleId);
    
    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setModules(prev => prev.filter(m => m.id !== moduleId));
      
      // Update course total hours
      if (moduleToDelete) {
        const newTotalHours = modules.reduce((sum, m) => sum + m.hours, 0) - moduleToDelete.hours;
        await supabase
          .from('courses')
          .update({ total_hours: Math.max(0, newTotalHours) })
          .eq('id', course.id);
      }
      
      onModuleUpdate?.();
      toast({ title: 'Módulo excluído!' });
    }
  };

  // Helper function to calculate new end date based on remaining hours
  const calculateNewEndDate = (
    startDate: Date,
    remainingHours: number,
    dailyHours: number,
    studyDays: string[]
  ): Date => {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    
    // Calculate how many study days are needed
    const studyDaysNeeded = Math.ceil(remainingHours / dailyHours);
    
    if (studyDaysNeeded <= 0) return startDate;
    
    let count = 0;
    const d = new Date(startDate);
    
    // Find the start study day
    while (!selectedDayNumbers.includes(d.getDay())) {
      d.setDate(d.getDate() + 1);
    }
    
    // Count study days
    while (count < studyDaysNeeded) {
      if (selectedDayNumbers.includes(d.getDay())) {
        count++;
        if (count >= studyDaysNeeded) break;
      }
      d.setDate(d.getDate() + 1);
    }
    
    return d;
  };

  // Recalculate study plan end dates when module is completed
  const recalculatePlanEndDates = async (courseId: string, newCompletedHours: number, totalCourseHours: number) => {
    try {
      // Find all study plans that contain this course
      const { data: planCourses, error: planError } = await supabase
        .from('study_plan_courses')
        .select(`
          study_plan_id,
          sequence_order,
          study_days,
          study_plans (
            id,
            start_date,
            end_date,
            daily_hours,
            study_days,
            total_hours,
            effective_start_date
          )
        `)
        .eq('course_id', courseId);

      if (planError || !planCourses?.length) return;

      for (const planCourse of planCourses) {
        const rawPlan = (planCourse as any).study_plans;
        const plan = (Array.isArray(rawPlan) ? rawPlan[0] : rawPlan) as { id: string; daily_hours?: number; study_days?: string[]; start_date: string; end_date: string; effective_start_date?: string } | null;
        if (!plan) continue;

        // Get all courses in this plan with their current hours, ordered by sequence
        const { data: allPlanCourses, error: coursesError } = await supabase
          .from('study_plan_courses')
          .select(`
            id,
            course_id,
            sequence_order,
            study_days,
            is_fixed,
            courses (
              id,
              total_hours,
              completed_hours
            )
          `)
          .eq('study_plan_id', plan.id)
          .order('sequence_order', { ascending: true });

        if (coursesError || !allPlanCourses?.length) continue;

        const dailyHours = plan.daily_hours || 1.5;
        const planStudyDays = plan.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        // Use effective_start_date or today, whichever is later
        const effectiveStart = plan.effective_start_date 
          ? new Date(plan.effective_start_date) 
          : new Date(plan.start_date);
        const today = new Date();
        let currentStartDate = effectiveStart > today ? new Date(effectiveStart) : new Date(today);

        // Group courses by sequence_order
        type PlanCourseRow = { id: string; course_id: string; sequence_order?: number; courses?: { completed_hours?: number; total_hours?: number } | null };
        const coursesBySequence: Map<number, PlanCourseRow[]> = new Map();
        for (const pc of allPlanCourses) {
          const seq = pc.sequence_order || 1;
          if (!coursesBySequence.has(seq)) {
            coursesBySequence.set(seq, []);
          }
          const normalized = { ...pc, courses: Array.isArray((pc as any).courses) ? (pc as any).courses[0] || null : (pc as any).courses || null } as PlanCourseRow;
          coursesBySequence.get(seq)!.push(normalized);
        }

        const sequenceOrders = Array.from(coursesBySequence.keys()).sort((a, b) => a - b);
        
        // Calculate dates for each sequence group
        let planEndDate = currentStartDate;
        
        for (const seqOrder of sequenceOrders) {
          const coursesInSeq = coursesBySequence.get(seqOrder)!;
          
          // Get total remaining hours in this sequence group
          let totalRemainingHoursInSeq = 0;
          for (const pc of coursesInSeq) {
            const courseData = pc.courses as { completed_hours?: number; total_hours?: number } | null;
            if (!courseData) continue;
            
            const completedH = pc.course_id === courseId 
              ? newCompletedHours 
              : (courseData.completed_hours || 0);
            const totalH = courseData.total_hours || 0;
            totalRemainingHoursInSeq += Math.max(0, totalH - completedH);
          }

          // Calculate study days needed for this sequence
          const studyDaysNeeded = dailyHours > 0 ? Math.ceil(totalRemainingHoursInSeq / dailyHours) : 0;
          
          // Find the sequence end date
          const seqStartDate = findNextStudyDay(currentStartDate, planStudyDays);
          const seqEndDate = studyDaysNeeded > 0 
            ? calculateNewEndDate(seqStartDate, totalRemainingHoursInSeq, dailyHours, planStudyDays)
            : seqStartDate;

          // Update end date for each course in this sequence
          for (const pc of coursesInSeq) {
            const courseData = pc.courses as { completed_hours?: number; total_hours?: number } | null;
            if (!courseData) continue;
            
            const completedH = pc.course_id === courseId 
              ? newCompletedHours 
              : (courseData.completed_hours || 0);
            const totalH = courseData.total_hours || 0;
            const remainingH = Math.max(0, totalH - completedH);
            
            // Calculate proportional daily hours for this course
            const totalHoursInSeq = coursesInSeq.reduce((sum, c) => {
              const cd = c.courses as { total_hours?: number } | null;
              return sum + (cd?.total_hours || 0);
            }, 0);
            
            const courseDailyHours = totalHoursInSeq > 0 
              ? (dailyHours * (totalH / totalHoursInSeq))
              : dailyHours;
            
            // Calculate individual course end date
            const courseEndDate = remainingH > 0 && courseDailyHours > 0
              ? calculateNewEndDate(seqStartDate, remainingH, courseDailyHours, planStudyDays)
              : seqEndDate;

            // Update allocated_hours to reflect remaining hours calculation
            await supabase
              .from('study_plan_courses')
              .update({ 
                allocated_hours: remainingH
              })
              .eq('id', pc.id);
          }

          // Update for next sequence
          if (seqEndDate > planEndDate) {
            planEndDate = seqEndDate;
          }
          
          // Next sequence starts after this one
          currentStartDate = new Date(seqEndDate);
          currentStartDate.setDate(currentStartDate.getDate() + 1);
        }

        // Calculate total remaining hours across all courses
        let totalRemainingHours = 0;
        for (const pc of allPlanCourses) {
          const courseData = pc.courses as { completed_hours?: number; total_hours?: number } | null;
          if (!courseData) continue;
          
          const completedH = pc.course_id === courseId 
            ? newCompletedHours 
            : (courseData.completed_hours || 0);
          const totalH = courseData.total_hours || 0;
          totalRemainingHours += Math.max(0, totalH - completedH);
        }

        // Update plan end date
        const newEndDateStr = planEndDate.toISOString().split('T')[0];
        const currentEndDateStr = new Date(plan.end_date).toISOString().split('T')[0];
        
        if (newEndDateStr !== currentEndDateStr) {
          await supabase
            .from('study_plans')
            .update({ 
              end_date: newEndDateStr,
              total_hours: totalRemainingHours
            })
            .eq('id', plan.id);

          toast({
            title: 'Datas recalculadas',
            description: `As datas do plano e cursos foram atualizadas automaticamente.`,
          });
        }
      }
    } catch (error) {
      console.error('Error recalculating plan end dates:', error);
    }
  };

  // Helper to find next study day
  const findNextStudyDay = (fromDate: Date, studyDays: string[]): Date => {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    
    const d = new Date(fromDate);
    while (!selectedDayNumbers.includes(d.getDay())) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const addSubModule = async (moduleId: string) => {
    if (!newSubModuleName.trim()) return;
    
    const hours = parseFloat(newSubModuleHours) || 0.5;
    const existingSubs = subModulesMap[moduleId] || [];
    const nextIndex = existingSubs.length > 0 ? Math.max(...existingSubs.map(s => s.order_index)) + 1 : 0;
    
    const { data, error } = await supabase
      .from('course_submodules')
      .insert({
        module_id: moduleId,
        name: newSubModuleName.trim(),
        hours,
        order_index: nextIndex,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao adicionar submódulo',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Update local state
    setSubModulesMap(prev => ({
      ...prev,
      [moduleId]: [...(prev[moduleId] || []), data]
    }));

    // Update module hours (sum of submodules)
    const newTotalSubHours = [...existingSubs, data].reduce((sum, s) => sum + s.hours, 0);
    await supabase
      .from('course_modules')
      .update({ hours: newTotalSubHours, is_parent: true })
      .eq('id', moduleId);

    // Update local module state
    setModules(prev =>
      prev.map(m =>
        m.id === moduleId ? { ...m, hours: newTotalSubHours, is_parent: true } : m
      )
    );

    // Reset form
    setNewSubModuleName('');
    setNewSubModuleHours('0.5');
    setAddingSubModuleToId(null);
    
    // Expand to show the new submodule
    setExpandedModules(prev => new Set([...prev, moduleId]));
    
    // Recalculate course total hours
    const newCourseTotalHours = modules.reduce((sum, m) => {
      if (m.id === moduleId) return sum + newTotalSubHours;
      return sum + m.hours;
    }, 0);
    
    await supabase
      .from('courses')
      .update({ total_hours: newCourseTotalHours })
      .eq('id', course.id);

    onModuleUpdate?.();
    toast({ title: 'Submódulo adicionado!' });
  };

  const deleteSubModule = async (subModule: SubModule, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('course_submodules')
      .delete()
      .eq('id', subModule.id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Update local state
    const remainingSubs = (subModulesMap[subModule.module_id] || []).filter(s => s.id !== subModule.id);
    setSubModulesMap(prev => ({
      ...prev,
      [subModule.module_id]: remainingSubs
    }));

    // Update module hours
    const newTotalSubHours = remainingSubs.reduce((sum, s) => sum + s.hours, 0);
    if (remainingSubs.length > 0) {
      await supabase
        .from('course_modules')
        .update({ hours: newTotalSubHours })
        .eq('id', subModule.module_id);

      setModules(prev =>
        prev.map(m =>
          m.id === subModule.module_id ? { ...m, hours: newTotalSubHours } : m
        )
      );
    }

    onModuleUpdate?.();
    toast({ title: 'Submódulo excluído!' });
  };

  const startEditSubModule = (subModule: SubModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubModuleId(subModule.id);
    setEditSubModuleName(subModule.name);
    setEditSubModuleHours(subModule.hours.toString());
  };

  const cancelEditSubModule = () => {
    setEditingSubModuleId(null);
    setEditSubModuleName('');
    setEditSubModuleHours('');
  };

  const updateSubModule = async (subModule: SubModule) => {
    if (!editSubModuleName.trim()) return;
    
    const newHours = parseFloat(editSubModuleHours) || 0.5;
    const oldHours = subModule.hours;
    
    const { error } = await supabase
      .from('course_submodules')
      .update({
        name: editSubModuleName.trim(),
        hours: newHours,
      })
      .eq('id', subModule.id);

    if (error) {
      toast({
        title: 'Erro ao atualizar submódulo',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Update local submodule state
    setSubModulesMap(prev => ({
      ...prev,
      [subModule.module_id]: (prev[subModule.module_id] || []).map(sm =>
        sm.id === subModule.id
          ? { ...sm, name: editSubModuleName.trim(), hours: newHours }
          : sm
      )
    }));

    // Update module total hours if hours changed
    if (newHours !== oldHours) {
      const updatedSubs = (subModulesMap[subModule.module_id] || []).map(sm =>
        sm.id === subModule.id ? { ...sm, hours: newHours } : sm
      );
      const newTotalSubHours = updatedSubs.reduce((sum, s) => sum + s.hours, 0);
      
      await supabase
        .from('course_modules')
        .update({ hours: newTotalSubHours })
        .eq('id', subModule.module_id);

      setModules(prev =>
        prev.map(m =>
          m.id === subModule.module_id ? { ...m, hours: newTotalSubHours } : m
        )
      );

      // Update course total hours
      const newCourseTotalHours = modules.reduce((sum, m) => {
        if (m.id === subModule.module_id) return sum + newTotalSubHours;
        return sum + m.hours;
      }, 0);
      
      await supabase
        .from('courses')
        .update({ total_hours: newCourseTotalHours })
        .eq('id', course.id);
    }

    cancelEditSubModule();
    onModuleUpdate?.();
    toast({ title: 'Submódulo atualizado!' });
  };

  // Handle submodule drag end for reordering
  const handleSubModuleDragEnd = async (moduleId: string, event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const subModules = subModulesMap[moduleId] || [];
    const oldIndex = subModules.findIndex(s => s.id === active.id);
    const newIndex = subModules.findIndex(s => s.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Reorder locally first for instant feedback
    const reorderedSubModules = arrayMove(subModules, oldIndex, newIndex);
    setSubModulesMap(prev => ({
      ...prev,
      [moduleId]: reorderedSubModules
    }));
    
    // Update order_index in database
    const updates = reorderedSubModules.map((sub, index) => ({
      id: sub.id,
      order_index: index,
    }));
    
    for (const update of updates) {
      await supabase
        .from('course_submodules')
        .update({ order_index: update.order_index })
        .eq('id', update.id);
    }
    
    toast({ title: 'Ordem atualizada!' });
  };

  // Handle module drag end for reordering
  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = modules.findIndex(m => m.id === active.id);
    const newIndex = modules.findIndex(m => m.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Reorder locally first for instant feedback
    const reorderedModules = arrayMove(modules, oldIndex, newIndex);
    setModules(reorderedModules);
    
    // Update order_index in database
    const updates = reorderedModules.map((mod, index) => ({
      id: mod.id,
      order_index: index,
    }));
    
    for (const update of updates) {
      await supabase
        .from('course_modules')
        .update({ order_index: update.order_index })
        .eq('id', update.id);
    }
    
    onModuleUpdate?.();
    toast({ title: 'Ordem dos módulos atualizada!' });
  };

  const getSubModuleProgress = (moduleId: string) => {
    const subs = subModulesMap[moduleId] || [];
    if (subs.length === 0) return null;
    const completed = subs.filter(s => s.is_completed).length;
    const percentage = Math.round((completed / subs.length) * 100);
    return { completed, total: subs.length, percentage };
  };

  // Get module hours breakdown (completed/total) based on submodules
  const getModuleHoursBreakdown = (moduleId: string, moduleHours: number) => {
    const subs = subModulesMap[moduleId] || [];
    if (subs.length === 0) {
      return { totalHours: moduleHours, completedHours: 0, hasSubmodules: false };
    }
    const totalHours = subs.reduce((sum, s) => sum + s.hours, 0);
    const completedHours = subs.filter(s => s.is_completed).reduce((sum, s) => sum + s.hours, 0);
    return { totalHours, completedHours, hasSubmodules: true };
  };

  const toggleSubModuleComplete = async (subModule: SubModule, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newCompleted = !subModule.is_completed;
    
    // Create the updated submodules map immediately for calculations
    const updatedSubModulesForModule = (subModulesMap[subModule.module_id] || []).map(sm =>
      sm.id === subModule.id
        ? { ...sm, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : sm
    );
    
    // Update local state immediately
    const newSubModulesMap = {
      ...subModulesMap,
      [subModule.module_id]: updatedSubModulesForModule
    };
    setSubModulesMap(newSubModulesMap);
    
    // Update database
    const { error } = await supabase
      .from('course_submodules')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', subModule.id);

    if (error) {
      // Revert on error
      setSubModulesMap(subModulesMap);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Check if all submodules are completed to auto-complete parent module
    const allCompleted = updatedSubModulesForModule.every(sm => sm.is_completed);
    let updatedModules = [...modules];
    
    if (allCompleted && updatedSubModulesForModule.length > 0) {
      // Auto-complete the parent module
      const { error: moduleError } = await supabase
        .from('course_modules')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', subModule.module_id);

      if (!moduleError) {
        updatedModules = modules.map(m =>
          m.id === subModule.module_id
            ? { ...m, is_completed: true, completed_at: new Date().toISOString() }
            : m
        );
        setModules(updatedModules);
      }
    } else if (!allCompleted) {
      // If any submodule is uncompleted, uncomplete the parent module
      const { error: moduleError } = await supabase
        .from('course_modules')
        .update({
          is_completed: false,
          completed_at: null,
        })
        .eq('id', subModule.module_id);

      if (!moduleError) {
        updatedModules = modules.map(m =>
          m.id === subModule.module_id
            ? { ...m, is_completed: false, completed_at: null }
            : m
        );
        setModules(updatedModules);
      }
    }

    // Recalculate course completed hours with the updated state
    await recalculateCompletedHoursWithState(updatedModules, newSubModulesMap);
    onModuleUpdate?.();
  };

  const recalculateCompletedHours = async () => {
    await recalculateCompletedHoursWithState(modules, subModulesMap);
  };

  const recalculateCompletedHoursWithState = async (
    currentModules: Module[],
    currentSubModulesMap: Record<string, SubModule[]>
  ) => {
    // Calculate completed hours from all modules and their submodules
    let totalCompleted = 0;
    let totalHoursCalc = 0;
    
    for (const module of currentModules) {
      const subs = currentSubModulesMap[module.id] || [];
      if (subs.length > 0) {
        // For modules with submodules, the module hours is sum of submodule hours
        const moduleHours = subs.reduce((sum, s) => sum + s.hours, 0);
        totalHoursCalc += moduleHours;
        // Count only completed submodule hours
        totalCompleted += subs.filter(s => s.is_completed).reduce((sum, s) => sum + s.hours, 0);
      } else {
        // For modules without submodules
        totalHoursCalc += module.hours;
        if (module.is_completed) {
          totalCompleted += module.hours;
        }
      }
    }

    // Update both total_hours and completed_hours to ensure accuracy
    await supabase
      .from('courses')
      .update({ 
        completed_hours: totalCompleted,
        total_hours: totalHoursCalc
      })
      .eq('id', course.id);
  };

  const toggleModuleComplete = async (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const subs = subModulesMap[module.id] || [];
    let updatedSubModulesMap = { ...subModulesMap };
    
    // If module has submodules, toggle all submodules
    if (subs.length > 0) {
      const allCompleted = subs.every(s => s.is_completed);
      const newStatus = !allCompleted;
      
      // Update all submodules
      for (const sub of subs) {
        await supabase
          .from('course_submodules')
          .update({
            is_completed: newStatus,
            completed_at: newStatus ? new Date().toISOString() : null,
          })
          .eq('id', sub.id);
      }
      
      // Update local submodules state
      const updatedSubs = subs.map(s => ({
        ...s,
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
      }));
      updatedSubModulesMap = {
        ...subModulesMap,
        [module.id]: updatedSubs
      };
      setSubModulesMap(updatedSubModulesMap);
    }
    
    const newCompleted = !module.is_completed;
    
    // Update local state immediately for better UX
    const updatedModules = modules.map(m =>
      m.id === module.id
        ? { ...m, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : m
    );
    setModules(updatedModules);
    
    // Update module in database
    const { error: moduleError } = await supabase
      .from('course_modules')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', module.id);

    if (moduleError) {
      // Revert on error
      setModules(modules);
      setSubModulesMap(subModulesMap);
      toast({
        title: 'Erro ao atualizar',
        description: moduleError.message,
        variant: 'destructive',
      });
      return;
    }
    
    // Recalculate course completed hours with the updated state
    await recalculateCompletedHoursWithState(updatedModules, updatedSubModulesMap);

    // Recalculate study plan end dates automatically
    let calculatedCompletedHours = 0;
    let calculatedTotalHours = 0;
    
    for (const mod of updatedModules) {
      const modSubs = updatedSubModulesMap[mod.id] || [];
      if (modSubs.length > 0) {
        const modTotal = modSubs.reduce((sum, s) => sum + s.hours, 0);
        calculatedTotalHours += modTotal;
        calculatedCompletedHours += modSubs.filter(s => s.is_completed).reduce((sum, s) => sum + s.hours, 0);
      } else {
        calculatedTotalHours += mod.hours;
        if (mod.is_completed) {
          calculatedCompletedHours += mod.hours;
        }
      }
    }
    
    await recalculatePlanEndDates(course.id, calculatedCompletedHours, calculatedTotalHours);
    
    // Notify parent to update course data (for the stats display)
    onModuleUpdate?.();
  };

  const startEdit = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(module.id);
    setEditName(module.name);
    setEditHours(String(module.hours));
    setEditWeightColor(module.weight_color || '#10b981');
  };

  // Review functions
  const openReviewDialog = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewingModule(module);
    setNeedsReview(module.needs_review || false);
    setReviewNotes(module.review_notes || '');
    setReviewDate(module.review_date ? new Date(module.review_date) : undefined);
    setShowReviewDialog(true);
  };

  const saveReview = async () => {
    if (!reviewingModule) return;

    const { error } = await supabase
      .from('course_modules')
      .update({
        needs_review: needsReview,
        review_notes: reviewNotes.trim() || null,
        review_date: reviewDate ? format(reviewDate, 'yyyy-MM-dd') : null,
      })
      .eq('id', reviewingModule.id);

    if (error) {
      toast({
        title: 'Erro ao salvar revisão',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setModules(prev =>
        prev.map(m =>
          m.id === reviewingModule.id
            ? {
                ...m,
                needs_review: needsReview,
                review_notes: reviewNotes.trim() || null,
                review_date: reviewDate ? format(reviewDate, 'yyyy-MM-dd') : null,
              }
            : m
        )
      );
      setShowReviewDialog(false);
      setReviewingModule(null);
      toast({ title: needsReview ? 'Módulo marcado para revisão!' : 'Revisão removida!' });
    }
  };

  const markAsReviewed = async (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('course_modules')
      .update({
        needs_review: false,
        last_reviewed_at: new Date().toISOString(),
        review_date: null,
      })
      .eq('id', module.id);

    if (error) {
      toast({
        title: 'Erro ao marcar como revisado',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setModules(prev =>
        prev.map(m =>
          m.id === module.id
            ? { ...m, needs_review: false, last_reviewed_at: new Date().toISOString(), review_date: null }
            : m
        )
      );
      toast({ title: '✅ Módulo revisado com sucesso!' });
    }
  };

  const completedCount = modules.filter(m => m.is_completed).length;
  
  // Calculate total and completed hours correctly considering submodules
  const { totalHours, completedHours } = useMemo(() => {
    let total = 0;
    let completed = 0;
    
    for (const module of modules) {
      const subs = subModulesMap[module.id] || [];
      if (subs.length > 0) {
        // For modules with submodules, sum submodule hours
        const moduleTotal = subs.reduce((sum, s) => sum + s.hours, 0);
        total += moduleTotal;
        // Count only completed submodule hours
        completed += subs.filter(s => s.is_completed).reduce((sum, s) => sum + s.hours, 0);
      } else {
        // For modules without submodules
        total += module.hours;
        if (module.is_completed) {
          completed += module.hours;
        }
      }
    }
    
    return { totalHours: total, completedHours: completed };
  }, [modules, subModulesMap]);
  
  const progress = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
  const reviewCount = modules.filter(m => m.needs_review).length;
  const pendingCount = modules.filter(m => !m.is_completed).length;

  // Filtered modules based on filter state
  const filteredModules = useMemo(() => {
    switch (moduleFilter) {
      case 'pending':
        return modules.filter(m => !m.is_completed);
      case 'completed':
        return modules.filter(m => m.is_completed);
      case 'review':
        return modules.filter(m => m.needs_review);
      default:
        return modules;
    }
  }, [modules, moduleFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-base sm:text-xl font-bold text-primary">{completedCount}/{modules.length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Módulos</p>
        </div>
        <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm sm:text-xl font-bold font-mono">{formatHoursHMS(completedHours)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Concluído</p>
        </div>
        <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm sm:text-xl font-bold font-mono">{formatHoursHMS(totalHours - completedHours)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Restante</p>
        </div>
      </div>

      {/* Review Alert */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground">
          <AlertCircle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-xs sm:text-sm">
            {reviewCount} módulo{reviewCount > 1 ? 's' : ''} pendente{reviewCount > 1 ? 's' : ''} de revisão
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5 sm:h-2" />
      </div>

      {/* Modules List */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-1.5 sm:p-2 h-auto">
              <span className="font-medium text-xs sm:text-sm">Módulos do Curso</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
          </CollapsibleTrigger>
          <div className="flex gap-1">
            {/* Expand/Collapse All Button */}
            {hasAnySubModules && (
              <Button
                variant={allExpanded ? "secondary" : "outline"}
                size="sm"
                onClick={toggleExpandAll}
                className="gap-1.5 h-7 sm:h-8 text-xs px-2 sm:px-3"
                title={allExpanded ? "Colapsar todos os submódulos" : "Expandir todos os submódulos"}
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>{allExpanded ? "Colapsar" : "Expandir"}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden xs:inline">Adicionar</span>
            </Button>
          </div>
        </div>
        
        {/* Module Filter */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <ToggleGroup 
            type="single" 
            value={moduleFilter} 
            onValueChange={(value) => value && setModuleFilter(value)}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem 
              value="all" 
              size="sm" 
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Todos ({modules.length})
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="pending" 
              size="sm" 
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Pendentes ({pendingCount})
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="completed" 
              size="sm" 
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 data-[state=on]:bg-success data-[state=on]:text-success-foreground"
            >
              Concluídos ({completedCount})
            </ToggleGroupItem>
            {reviewCount > 0 && (
              <ToggleGroupItem 
                value="review" 
                size="sm" 
                className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 data-[state=on]:bg-warning data-[state=on]:text-warning-foreground"
              >
                Revisão ({reviewCount})
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
        
        <CollapsibleContent className="pt-2 space-y-2 sm:space-y-3">
          {/* Add Form */}
          {showAddForm && (
            <Card className="p-2 sm:p-3 border-primary/30 bg-primary/5">
              <div className="space-y-2 sm:space-y-3">
                <Input
                  placeholder="Nome do módulo"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />
                <div className="flex gap-2">
                  <ModuleColorPicker value={newModuleWeightColor} onChange={setNewModuleWeightColor} />
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="Horas"
                      value={newModuleHours}
                      onChange={(e) => setNewModuleHours(e.target.value)}
                      className="text-xs sm:text-sm h-8 sm:h-9"
                    />
                  </div>
                  <Button size="sm" onClick={addModule} className="h-8 sm:h-9 px-2 sm:px-3">
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Salvar</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="h-8 sm:h-9 px-2">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Modules with Scroll */}
          {modules.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhum módulo cadastrado.</p>
              <p className="text-[10px] sm:text-xs">Clique em "Adicionar" para criar módulos.</p>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <Filter className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhum módulo encontrado com este filtro.</p>
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs"
                onClick={() => setModuleFilter('all')}
              >
                Ver todos os módulos
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
              >
                <SortableContext
                  items={filteredModules.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    {filteredModules.map((module, index) => {
                      // Get original index from all modules for numbering
                      const originalIndex = modules.findIndex(m => m.id === module.id);
                      return (
                      <SortableModuleItem key={module.id} module={module} index={index}>
                        <Card
                          className={cn(
                            "transition-all duration-200 hover:shadow-sm ml-4",
                            module.is_completed && "bg-success/5 border-success/20",
                            module.needs_review && !module.is_completed && "bg-warning/5 border-warning/30"
                          )}
                        >
                          <CardContent className="p-2 sm:p-3">
                            {editingId === module.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="text-xs sm:text-sm h-8 sm:h-9"
                                />
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    value={editHours}
                                    onChange={(e) => setEditHours(e.target.value)}
                                    className="text-xs sm:text-sm w-16 sm:w-24 h-8 sm:h-9"
                                  />
                                  <ModuleColorPicker value={editWeightColor} onChange={setEditWeightColor} />
                                  <Button size="sm" onClick={() => updateModule(module.id)} className="h-8 sm:h-9 px-2">
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 sm:h-9 px-2">
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Module Header Row - Icons & Actions */}
                                <div className="flex items-start gap-2 sm:gap-3">
                                  {/* Expand/Collapse button for modules with submodules */}
                                  {(subModulesMap[module.id]?.length || 0) > 0 ? (
                                    <button
                                      className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-primary/10 hover:bg-primary/20 transition-colors mt-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleModuleExpand(module.id);
                                      }}
                                      title={expandedModules.has(module.id) ? "Ocultar submódulos" : `Ver ${subModulesMap[module.id]?.length || 0} submódulo(s)`}
                                    >
                                      {expandedModules.has(module.id) ? (
                                        <ChevronDown className="h-3 w-3 text-primary" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-primary" />
                                      )}
                                    </button>
                                  ) : null}
                                  
                                  <button
                                    className="shrink-0 mt-0.5"
                                    onClick={(e) => toggleModuleComplete(module, e)}
                                  >
                                    {module.is_completed ? (
                                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                                    ) : (
                                      <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                  
                                  {/* Module Name - Full text visible with word wrap */}
                                  <div className="flex-1 min-w-0 flex items-center gap-2">
                                    {(() => {
                                      const hex = resolveWeightHex(module.weight_color);
                                      return (
                                        <div
                                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                          style={{ backgroundColor: hex, boxShadow: `0 0 6px ${hex}66` }}
                                          title={weightLabel(module.weight_color)}
                                        />
                                      );
                                    })()}
                                    <p className={cn(
                                      "font-medium text-xs sm:text-sm break-words leading-tight",
                                      module.is_completed && "line-through text-muted-foreground"
                                    )}>
                                      {originalIndex + 1}. {module.name}
                                    </p>
                                  </div>
                                  
                                  {/* SubModule Progress Badge */}
                                  {(() => {
                                    const progress = getSubModuleProgress(module.id);
                                    if (progress) {
                                      const isComplete = progress.completed === progress.total;
                                      return (
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "shrink-0 text-[10px] sm:text-xs px-1.5",
                                            isComplete 
                                              ? "bg-success/10 text-success border-success/30" 
                                              : "bg-primary/10 text-primary border-primary/30"
                                          )}
                                        >
                                          {progress.completed}/{progress.total}
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {module.needs_review && (
                                    <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs bg-warning/10 text-warning-foreground border-warning/30 px-1.5">
                                      <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                                      Revisar
                                    </Badge>
                                  )}
                                  
                                  {(() => {
                                    const hoursBreakdown = getModuleHoursBreakdown(module.id, module.hours);
                                    if (hoursBreakdown.hasSubmodules) {
                                      const isComplete = hoursBreakdown.completedHours === hoursBreakdown.totalHours;
                                      return (
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "shrink-0 text-[10px] sm:text-xs font-mono px-1.5 sm:px-2",
                                            isComplete && "bg-success/10 text-success border-success/30"
                                          )}
                                        >
                                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                          {formatHoursHMS(hoursBreakdown.completedHours)}/{formatHoursHMS(hoursBreakdown.totalHours)}
                                        </Badge>
                                      );
                                    }
                                    return (
                                      <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs font-mono px-1.5 sm:px-2">
                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                        {formatHoursHMS(module.hours)}
                                      </Badge>
                                    );
                                  })()}
                                  
                                  <div className="flex gap-0.5 sm:gap-1 shrink-0">
                                    {/* Add SubModule Button */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-primary hover:text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingSubModuleToId(addingSubModuleToId === module.id ? null : module.id);
                                        setExpandedModules(prev => new Set([...prev, module.id]));
                                      }}
                                      title="Adicionar submódulo"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    
                                    {/* Review Button */}
                                    {module.needs_review ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-success hover:text-success"
                                        onClick={(e) => markAsReviewed(module, e)}
                                        title="Marcar como revisado"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                      </Button>
                                    ) : null}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-6 w-6 sm:h-7 sm:w-7 p-0",
                                        module.needs_review && "text-warning"
                                      )}
                                      onClick={(e) => openReviewDialog(module, e)}
                                      title="Configurar revisão"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                      onClick={(e) => startEdit(module, e)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteModule(module.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* SubModules - Hidden by default, shown when expanded */}
                                <AnimatePresence>
                                  {(expandedModules.has(module.id) || addingSubModuleToId === module.id) && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2, ease: "easeInOut" }}
                                      className="ml-4 sm:ml-8 border-l-2 border-primary/20 pl-2 sm:pl-3 overflow-hidden"
                                    >
                                      <div className="space-y-1 py-1">
                                        {/* SubModule Progress Bar */}
                                        {(() => {
                                          const progress = getSubModuleProgress(module.id);
                                          if (progress && progress.total > 0) {
                                            return (
                                              <div className="flex items-center gap-2 py-1.5 px-1">
                                                <Progress value={progress.percentage} className="h-1.5 flex-1" />
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                  {progress.percentage}%
                                                </span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                        
                                        {/* Add SubModule Form */}
                                        {addingSubModuleToId === module.id && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 py-1 bg-primary/5 rounded px-2"
                                          >
                                            <div className="w-2 h-px bg-primary/20 shrink-0" />
                                            <Input
                                              value={newSubModuleName}
                                              onChange={(e) => setNewSubModuleName(e.target.value)}
                                              placeholder="Nome do submódulo"
                                              className="flex-1 h-7 text-xs"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') addSubModule(module.id);
                                                if (e.key === 'Escape') setAddingSubModuleToId(null);
                                              }}
                                            />
                                            <Input
                                              type="number"
                                              step="0.5"
                                              min="0.1"
                                              value={newSubModuleHours}
                                              onChange={(e) => setNewSubModuleHours(e.target.value)}
                                              placeholder="Horas"
                                              className="w-16 h-7 text-xs font-mono"
                                            />
                                            <Button
                                              size="sm"
                                              className="h-7 px-2"
                                              onClick={() => addSubModule(module.id)}
                                              disabled={!newSubModuleName.trim()}
                                            >
                                              <Save className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 px-2"
                                              onClick={() => setAddingSubModuleToId(null)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </motion.div>
                                        )}
                                        
                                        {/* Existing SubModules with DnD */}
                                        <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={(event) => handleSubModuleDragEnd(module.id, event)}
                                        >
                                          <SortableContext
                                            items={(subModulesMap[module.id] || []).map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            <AnimatePresence>
                                              {(subModulesMap[module.id] || []).map((sub, subIndex) => (
                                                <SortableSubModuleItem
                                                  key={sub.id}
                                                  subModule={sub}
                                                  subIndex={subIndex}
                                                  isEditing={editingSubModuleId === sub.id}
                                                  editName={editSubModuleName}
                                                  editHours={editSubModuleHours}
                                                  onEditNameChange={setEditSubModuleName}
                                                  onEditHoursChange={setEditSubModuleHours}
                                                  onSave={() => updateSubModule(sub)}
                                                  onCancel={cancelEditSubModule}
                                                  onStartEdit={(e) => startEditSubModule(sub, e)}
                                                  onDelete={(e) => deleteSubModule(sub, e)}
                                                  onToggleComplete={(e) => toggleSubModuleComplete(sub, e)}
                                                />
                                              ))}
                                            </AnimatePresence>
                                          </SortableContext>
                                        </DndContext>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                
                                {/* Review Info */}
                                {module.needs_review && (module.review_notes || module.review_date) && (
                                  <div className="ml-6 sm:ml-8 p-2 rounded bg-muted/50 space-y-1">
                                    {module.review_date && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Revisar em: {format(new Date(module.review_date), "dd 'de' MMMM", { locale: ptBR })}
                                      </p>
                                    )}
                                    {module.review_notes && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground flex items-start gap-1">
                                        <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">{module.review_notes}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Last Reviewed Info */}
                                {module.last_reviewed_at && !module.needs_review && (
                                  <p className="ml-6 sm:ml-8 text-[10px] sm:text-xs text-muted-foreground">
                                    Última revisão: {format(new Date(module.last_reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </SortableModuleItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Configurar Revisão
            </DialogTitle>
            <DialogDescription>
              Marque este módulo para revisão e adicione anotações para lembrar o que precisa estudar novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewingModule && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{reviewingModule.name}</p>
                <p className="text-xs text-muted-foreground">{formatHoursHMS(reviewingModule.hours)}</p>
              </div>
            )}

            {/* Toggle Review */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Marcar para revisão</Label>
                <p className="text-xs text-muted-foreground">
                  Ative para lembrar de revisar este módulo
                </p>
              </div>
              <Switch checked={needsReview} onCheckedChange={setNeedsReview} />
            </div>

            {needsReview && (
              <>
                {/* Review Date */}
                <div className="space-y-2">
                  <Label className="font-medium">Data de revisão (opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reviewDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {reviewDate ? format(reviewDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={reviewDate}
                        onSelect={setReviewDate}
                        locale={ptBR}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {reviewDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      onClick={() => setReviewDate(undefined)}
                    >
                      Limpar data
                    </Button>
                  )}
                </div>

                {/* Review Notes */}
                <div className="space-y-2">
                  <Label className="font-medium">Anotações de revisão</Label>
                  <Textarea
                    placeholder="O que precisa revisar? Conceitos difíceis, exercícios, etc..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveReview}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
