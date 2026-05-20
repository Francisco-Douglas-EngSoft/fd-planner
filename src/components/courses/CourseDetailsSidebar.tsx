import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Calendar, Star, Play, X, Clock, Target, TrendingUp, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CourseModulesView } from './CourseModulesView';
import { FocusMode } from '@/components/focus/FocusMode';
import { motion, AnimatePresence } from 'framer-motion';

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
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

interface CourseDetailsSidebarProps {
  course: Course | null;
  onClose: () => void;
  onCourseUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; class: string; bgClass: string }> = {
  in_progress: { 
    label: 'Em Andamento', 
    class: 'text-primary border-primary/30',
    bgClass: 'bg-primary/10'
  },
  completed: { 
    label: 'Concluído', 
    class: 'text-success border-success/30',
    bgClass: 'bg-success/10'
  },
  pending: { 
    label: 'Pendente', 
    class: 'text-muted-foreground border-border',
    bgClass: 'bg-muted'
  },
};

const defaultImages = [
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop',
];

const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function CourseDetailsSidebar({ course, onClose, onCourseUpdate }: CourseDetailsSidebarProps) {
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [panelWidth, setPanelWidth] = useState(40); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = panelWidth;
    const windowWidth = window.innerWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      const deltaPercent = (deltaX / windowWidth) * 100;
      let newWidth = startWidth + deltaPercent;
      
      // Clamp between 25% and 70%
      newWidth = Math.max(25, Math.min(70, newWidth));
      setPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth, isMobile]);

  if (!course) return null;

  const imageUrl = course.cover_image_url || defaultImages[0];
  const progress = course.total_hours > 0 
    ? Math.round((course.completed_hours / course.total_hours) * 100) 
    : 0;
  const remainingHours = Math.max(0, course.total_hours - course.completed_hours);
  const statusInfo = statusConfig[course.status] || statusConfig.pending;

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Backdrop overlay */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        
        {/* Floating Panel - Resizable on desktop, full width on mobile */}
        <motion.div
          key="panel"
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ width: isMobile ? '100%' : `${panelWidth}%` }}
          className={cn(
            "fixed top-0 bottom-0 right-0 bg-background border-l shadow-2xl flex flex-col z-50 overflow-hidden",
            isResizing && "select-none"
          )}
        >
          {/* Resize Handle - Only on desktop */}
          {!isMobile && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group hover:bg-primary/30 transition-colors z-20"
              onMouseDown={handleMouseDown}
            >
              {/* Visual indicator */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary rounded-full p-1 shadow-lg">
                <GripVertical className="h-4 w-4 text-primary-foreground" />
              </div>
              {/* Hover line */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-primary transition-colors" />
            </div>
          )}

          {/* Hero Section with Cover Image */}
          <div className="relative h-36 md:h-44 shrink-0 overflow-hidden">
            <img
              src={imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Close button */}
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={onClose} 
              className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg h-9 w-9"
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Course Title & Badges */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {course.category && (
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-foreground text-xs">
                    {course.category}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={cn("backdrop-blur-sm text-xs", statusInfo.bgClass, statusInfo.class)}
                >
                  {statusInfo.label}
                </Badge>
                {course.is_favorite && (
                  <Star className="h-4 w-4 fill-warning text-warning" />
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold font-display leading-tight line-clamp-2">
                {course.name}
              </h1>
            </div>
          </div>

          {/* Stats Row */}
          <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-background border">
                <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-bold font-mono">{formatHoursHMS(course.total_hours)}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background border">
                <div className="flex items-center justify-center gap-1 text-success mb-0.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-bold font-mono">{formatHoursHMS(course.completed_hours)}</p>
                <p className="text-[10px] text-muted-foreground">Concluído</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background border">
                <div className="flex items-center justify-center gap-1 text-warning mb-0.5">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-bold font-mono">{formatHoursHMS(remainingHours)}</p>
                <p className="text-[10px] text-muted-foreground">Restante</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Description */}
              {course.description && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </h3>
                  <p className="text-sm leading-relaxed">{course.description}</p>
                </div>
              )}

              {/* Course Dates */}
              {(course.created_at || course.start_date || course.end_date) && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {course.created_at && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                      <Calendar className="h-3 w-3" />
                      <span>Criado: {format(new Date(course.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                  {(course.start_date || course.end_date) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        {course.start_date && format(new Date(course.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                        {course.start_date && course.end_date && ' → '}
                        {course.end_date && format(new Date(course.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Modules Section */}
              <div className="space-y-3 pt-3 border-t">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  Módulos do Curso
                </h3>
                <div className="min-h-[200px]">
                  <CourseModulesView course={course} onModuleUpdate={onCourseUpdate} />
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-3 border-t bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button 
                className="flex-1 gap-2" 
                size="default"
                onClick={() => setShowFocusMode(true)}
              >
                <Play className="h-4 w-4" />
                Iniciar Modo Foco
              </Button>
              <Button 
                variant="outline" 
                size="default"
                onClick={onClose}
              >
                Fechar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              {!isMobile && <span>Arraste a borda para redimensionar • </span>}
              Pressione <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">ESC</kbd> para fechar
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Focus Mode Overlay */}
      <FocusMode
        isOpen={showFocusMode}
        onClose={() => setShowFocusMode(false)}
        courseName={course.name}
        courseId={course.id}
      />
    </>
  );
}
