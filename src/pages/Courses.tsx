import { listStoragePaths, publicUrlToPath } from "@/lib/storageSync";
import { EmptyState } from '@/components/ui/empty-state';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, BookOpen, Clock, Star, MoreVertical, Trash2, Edit, FolderOpen, X, Download, Upload, CheckSquare, Square, CheckCircle, CalendarIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CourseFormDialog } from '@/components/courses/CourseFormDialog';
import { CourseDetailsSidebar } from '@/components/courses/CourseDetailsSidebar';
import { ImportExportDialog } from '@/components/courses/ImportExportDialog';
import { DeleteConfirmDialog } from '@/components/courses/DeleteConfirmDialog';
import { CourseImage } from '@/components/courses/CourseImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence } from 'framer-motion';

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
  updated_at: string;
  color?: string | null;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  in_progress: { label: 'Em Andamento', class: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Concluído', class: 'bg-success/10 text-success border-success/20' },
  pending: { label: 'Pendente', class: 'bg-muted text-muted-foreground border-border' },
};

// Format hours as HH:MM:SS
const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface CourseCardProps {
  course: Course;
  index: number;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onClick: (course: Course) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onMarkAsNotCompleted?: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}

function CourseCard({ 
  course, 
  index, 
  onEdit, 
  onDelete, 
  onClick, 
  onToggleFavorite,
  onMarkAsNotCompleted,
  isSelected,
  onToggleSelect,
  selectionMode,
}: CourseCardProps) {
  const progress = course.total_hours > 0 ? Math.round((course.completed_hours / course.total_hours) * 100) : 0;
  const remainingHours = Math.max(0, course.total_hours - course.completed_hours);

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect(course.id);
    } else {
      onClick(course);
    }
  };

  const customColor = course.color && /^#([0-9a-f]{6})$/i.test(course.color) ? course.color : null;
  const customStyle: React.CSSProperties | undefined = customColor
    ? {
        borderColor: `${customColor}66`,
        backgroundImage: `linear-gradient(180deg, ${customColor}1a 0%, transparent 55%, ${customColor}10 100%)`,
        boxShadow: `0 10px 30px -12px ${customColor}55`,
      }
    : undefined;

  return (
    <Card 
      className={cn(
        "group/card overflow-hidden transition-all duration-300 cursor-pointer relative",
        customColor ? "border-2" : "border-border/40 bg-gradient-to-b from-card to-card/80",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
        !customColor && "hover:border-primary/30",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/10"
      )}
      style={customStyle}
      onClick={handleCardClick}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div 
            className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center transition-colors backdrop-blur-sm",
              isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-background/80 text-muted-foreground border border-border/50"
            )}
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </div>
        </div>
      )}
      
      {/* Image with overlay */}
      <div className="relative">
        <CourseImage
          src={course.cover_image_url || ''}
          alt={course.name}
          className="h-36 sm:h-44"
        />
        {/* Category & Favorite overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-end justify-between">
          {course.category && (
            <Badge className="bg-background/85 backdrop-blur-md text-foreground text-[10px] font-semibold border border-border/30 shadow-sm px-2 py-0.5">
              {course.category}
            </Badge>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(course.id, course.is_favorite); }}
            className={cn(
              "rounded-full p-1.5 transition-all backdrop-blur-sm shadow-sm",
              course.is_favorite 
                ? "bg-warning/20 border border-warning/30" 
                : "bg-background/80 border border-border/30 hover:bg-background"
            )}
          >
            <Star className={cn("h-3.5 w-3.5 transition-colors", course.is_favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
          </button>
        </div>
      </div>

      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Title & Menu */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover/card:text-primary transition-colors">
            {course.name}
          </h3>
          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(course); }}>
                  <Edit className="h-4 w-4 mr-2" />Editar
                </DropdownMenuItem>
                {course.status === 'completed' && onMarkAsNotCompleted && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkAsNotCompleted(course.id); }}>
                    <RotateCcw className="h-4 w-4 mr-2" />Marcar como Não Concluído
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(course.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progresso</span>
            <span className={cn(
              "font-bold tabular-nums",
              progress >= 100 ? "text-success" : progress > 50 ? "text-primary" : "text-foreground"
            )}>{progress}%</span>
          </div>
          <Progress value={progress} className={cn(
            "h-2 rounded-full",
            progress >= 100 && "[&>div]:bg-success",
            progress > 50 && progress < 100 && "[&>div]:bg-primary"
          )} />
        </div>

        {/* Time stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-2">
          <span className="flex items-center gap-1.5 font-mono">
            <BookOpen className="h-3.5 w-3.5 text-primary/70" />
            {formatHoursHMS(course.total_hours)}
          </span>
          <div className="w-px h-3 bg-border" />
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
            {formatHoursHMS(remainingHours)}
          </span>
        </div>

        {/* Status badge */}
        <Badge variant="outline" className={cn(
          "w-full justify-center text-xs font-medium py-1",
          statusConfig[course.status]?.class
        )}>
          {statusConfig[course.status]?.label || course.status}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  
  // Selection state
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Date filter for completed courses
  const [dateFilterFrom, setDateFilterFrom] = useState<Date | undefined>(undefined);
  const [dateFilterTo, setDateFilterTo] = useState<Date | undefined>(undefined);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar cursos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      let list = data || [];
      // Sincroniza capas: se o arquivo foi apagado do Storage, limpa a referência no banco.
      const existing = await listStoragePaths('course-covers', user.id);
      if (existing) {
        const broken = list.filter((c: any) => {
          const p = publicUrlToPath(c.cover_image_url, 'course-covers');
          return p && p.startsWith(`${user.id}/`) && !existing.has(p);
        }).map((c) => c.id);
        if (broken.length) {
          await supabase.from('courses').update({ cover_image_url: null }).in('id', broken);
          list = list.map((c: any) => (broken.includes(c.id) ? { ...c, cover_image_url: null } : c));
        }
      }
      setCourses(list);
    }
    setIsLoading(false);
  };

  // Get unique categories
  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))] as string[];
  
  // Separate active and completed courses
  const activeCourses = courses.filter(c => c.status !== 'completed');
  const completedCourses = courses.filter(c => c.status === 'completed');
  
  // Get courses for current tab
  const currentTabCourses = activeTab === 'active' ? activeCourses : completedCourses;
  
  // Filter courses by search, category, and date (for completed tab)
  const filteredCourses = currentTabCourses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    
    // Date filter only applies to completed courses
    let matchesDate = true;
    if (activeTab === 'completed' && course.updated_at) {
      const courseDate = parseISO(course.updated_at);
      if (dateFilterFrom) {
        matchesDate = matchesDate && !isBefore(courseDate, startOfDay(dateFilterFrom));
      }
      if (dateFilterTo) {
        matchesDate = matchesDate && !isAfter(courseDate, endOfDay(dateFilterTo));
      }
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  // Group courses by category
  const coursesByCategory = filteredCourses.reduce((acc, course) => {
    const category = course.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  const toggleFavorite = async (courseId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_favorite: !currentValue })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setCourses(prev => 
        prev.map(c => c.id === courseId ? { ...c, is_favorite: !currentValue } : c)
      );
    }
  };

  const deleteSingleCourse = async (courseId: string) => {
    // Delete submodules first (they reference modules)
    const { data: courseModules } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId);
    
    if (courseModules && courseModules.length > 0) {
      const moduleIds = courseModules.map(m => m.id);
      await supabase.from('course_submodules').delete().in('module_id', moduleIds);
    }

    // Delete related records
    await supabase.from('course_modules').delete().eq('course_id', courseId);
    await supabase.from('focus_sessions').update({ course_id: null }).eq('course_id', courseId);
    await supabase.from('study_notes').update({ course_id: null }).eq('course_id', courseId);
    await supabase.from('tasks').update({ course_id: null }).eq('course_id', courseId);
    await supabase.from('study_plan_courses').delete().eq('course_id', courseId);
    
    const { data: courseRow } = await supabase.from('courses').select('cover_image_url').eq('id', courseId).maybeSingle();
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) throw error;
    const coverPath = publicUrlToPath((courseRow as any)?.cover_image_url, 'course-covers');
    if (coverPath) await supabase.storage.from('course-covers').remove([coverPath]);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = courseToDelete ? [courseToDelete] : Array.from(selectedCourseIds);
      
      for (const courseId of idsToDelete) {
        await deleteSingleCourse(courseId);
      }

      setCourses(prev => prev.filter(c => !idsToDelete.includes(c.id)));
      setSelectedCourseIds(new Set());
      setSelectionMode(false);
      
      toast({
        title: idsToDelete.length === 1 ? 'Curso excluído' : 'Cursos excluídos',
        description: idsToDelete.length === 1 
          ? 'O curso foi removido com sucesso.'
          : `${idsToDelete.length} cursos foram removidos com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: (error instanceof Error ? error.message : String(error)) || 'Não foi possível excluir os cursos.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setCourseToDelete(null);
    }
  };

  const handleDeleteClick = (courseId: string) => {
    setCourseToDelete(courseId);
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = () => {
    setCourseToDelete(null);
    setShowDeleteDialog(true);
  };

  const toggleSelectCourse = (courseId: string) => {
    setSelectedCourseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCourseIds.size === filteredCourses.length) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(filteredCourses.map(c => c.id)));
    }
  };

  const cancelSelection = () => {
    setSelectedCourseIds(new Set());
    setSelectionMode(false);
  };

  const handleMarkAsNotCompleted = async (courseId: string) => {
    const { error } = await supabase
      .from('courses')
      .update({ status: 'in_progress' })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setCourses(prev => 
        prev.map(c => c.id === courseId ? { ...c, status: 'in_progress' } : c)
      );
      toast({
        title: 'Curso atualizado',
        description: 'O curso foi marcado como em andamento.',
      });
    }
  };

  const handleEdit = (course: Course) => {
    setEditCourse(course);
    setShowFormDialog(true);
  };

  const handleNewCourse = () => {
    setEditCourse(null);
    setShowFormDialog(true);
  };

  const handleCourseClick = (course: Course) => {
    // Toggle selection - if same course, close the sidebar
    if (selectedCourse?.id === course.id) {
      setSelectedCourse(null);
    } else {
      setSelectedCourse(course);
    }
  };

  const handleCloseSidebar = () => {
    setSelectedCourse(null);
    fetchCourses();
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Cursos</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gerencie seus cursos e acompanhe o progresso
            </p>
          </div>
          <div className="flex gap-2">
            {selectionMode ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleSelectAll}
                >
                  {selectedCourseIds.size === filteredCourses.length ? 'Desmarcar' : 'Selecionar'} Todos
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={selectedCourseIds.size === 0}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir ({selectedCourseIds.size})
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={courses.length === 0}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Selecionar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => setShowImportExportDialog(true)}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Backup</span>
                </Button>
                <Button className="gap-2 flex-1 sm:flex-initial" onClick={handleNewCourse}>
                  <Plus className="h-4 w-4" />
                  Novo Curso
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs for Active/Completed */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Em Andamento ({activeCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídos ({completedCourses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Search and Category Filters */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cursos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Date Filter - Only for completed tab */}
                {activeTab === 'completed' && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[130px] justify-start text-left font-normal",
                            !dateFilterFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterFrom ? format(dateFilterFrom, "dd/MM/yy") : "De"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilterFrom}
                          onSelect={setDateFilterFrom}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[130px] justify-start text-left font-normal",
                            !dateFilterTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterTo ? format(dateFilterTo, "dd/MM/yy") : "Até"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilterTo}
                          onSelect={setDateFilterTo}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {(dateFilterFrom || dateFilterTo) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDateFilterFrom(undefined);
                          setDateFilterTo(undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Category Pills */}
              {categories.length > 0 && (
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    <Button
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="shrink-0"
                    >
                      Todos
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="shrink-0"
                      >
                        {category}
                        {selectedCategory === category && (
                          <X className="ml-1 h-3 w-3" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(null);
                          }} />
                        )}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>

            {/* Completed Courses Stats Summary (only on completed tab) */}
            {activeTab === 'completed' && completedCourses.length > 0 && (
              <div className="mt-6 mb-6">
                <Card className="border-border/50 bg-gradient-to-r from-success/10 to-success/5">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-success">{completedCourses.length}</p>
                        <p className="text-xs text-muted-foreground">Cursos Concluídos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono">{formatHoursHMS(completedCourses.reduce((sum, c) => sum + (c.completed_hours || 0), 0))}</p>
                        <p className="text-xs text-muted-foreground">Total de Horas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono">{formatHoursHMS(completedCourses.length > 0 ? completedCourses.reduce((sum, c) => sum + (c.completed_hours || 0), 0) / completedCourses.length : 0)}</p>
                        <p className="text-xs text-muted-foreground">Média por Curso</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{[...new Set(completedCourses.map(c => c.category).filter(Boolean))].length}</p>
                        <p className="text-xs text-muted-foreground">Categorias</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Courses by Category */}
            <div className={activeTab === 'completed' && completedCourses.length > 0 ? '' : 'mt-6'}>
              {filteredCourses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={activeTab === 'active' ? 'Nenhum curso em andamento' : 'Nenhum curso concluído'}
                  description={
                    activeTab === 'active'
                      ? courses.length === 0
                        ? 'Crie seu primeiro curso, adicione os módulos e acompanhe as horas concluídas por aqui.'
                        : 'Nenhum curso corresponde aos filtros atuais. Ajuste a busca ou limpe os filtros.'
                      : 'Assim que você concluir um curso, ele aparecerá nesta aba com o histórico completo.'
                  }
                  actionLabel={
                    activeTab === 'active' && courses.length === 0 ? 'Criar primeiro curso' : undefined
                  }
                  onAction={
                    activeTab === 'active' && courses.length === 0 ? handleNewCourse : undefined
                  }
                />
              ) : selectedCategory ? (

                // Show filtered courses in a grid
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderOpen className="h-4 w-4" />
                    <span>{filteredCourses.length} curso(s) em "{selectedCategory}"</span>
                  </div>
                  <div className={cn(
                    "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2",
                    selectedCourse ? "lg:grid-cols-2" : "lg:grid-cols-3"
                  )}>
                    {filteredCourses.map((course, index) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        index={index}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onClick={handleCourseClick}
                        onToggleFavorite={toggleFavorite}
                        onMarkAsNotCompleted={activeTab === 'completed' ? handleMarkAsNotCompleted : undefined}
                        isSelected={selectedCourseIds.has(course.id)}
                        onToggleSelect={toggleSelectCourse}
                        selectionMode={selectionMode}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Show courses grouped by category
                <div className="space-y-8">
                  {Object.entries(coursesByCategory).map(([category, categoryCourses]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          {category}
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {categoryCourses.length}
                          </Badge>
                        </h2>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCategory(category === 'Sem Categoria' ? null : category)}
                        >
                          Ver todos
                        </Button>
                      </div>
                      
                      <div className={cn(
                        "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2",
                        selectedCourse ? "lg:grid-cols-2" : "lg:grid-cols-3"
                      )}>
                        {categoryCourses.slice(0, 3).map((course, index) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            index={index}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onClick={handleCourseClick}
                            onToggleFavorite={toggleFavorite}
                            onMarkAsNotCompleted={activeTab === 'completed' ? handleMarkAsNotCompleted : undefined}
                            isSelected={selectedCourseIds.has(course.id)}
                            onToggleSelect={toggleSelectCourse}
                            selectionMode={selectionMode}
                          />
                        ))}
                      </div>
                      
                      {categoryCourses.length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setSelectedCategory(category === 'Sem Categoria' ? null : category)}
                        >
                          Ver mais {categoryCourses.length - 3} curso(s)
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Course Form Dialog */}
        <CourseFormDialog
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          onSuccess={fetchCourses}
          editCourse={editCourse}
        />

        {/* Import/Export Dialog */}
        <ImportExportDialog
          open={showImportExportDialog}
          onOpenChange={setShowImportExportDialog}
          onImportSuccess={fetchCourses}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteConfirm}
          coursesCount={courseToDelete ? 1 : selectedCourseIds.size}
          isDeleting={isDeleting}
        />

      {/* Course Details Floating Panel */}
      {selectedCourse && (
        <CourseDetailsSidebar
          course={selectedCourse}
          onClose={handleCloseSidebar}
          onCourseUpdate={() => {
            // Update selectedCourse with fresh data and also refresh course list
            if (selectedCourse) {
              supabase
                .from('courses')
                .select('*')
                .eq('id', selectedCourse.id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    setSelectedCourse(data);
                    // Also update the course in the main list
                    setCourses(prev => prev.map(c => c.id === data.id ? data : c));
                  }
                });
            }
          }}
        />
      )}
    </div>
  );
}
