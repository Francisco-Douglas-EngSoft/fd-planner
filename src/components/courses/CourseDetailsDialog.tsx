import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Star, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CourseModulesView } from './CourseModulesView';
import { FocusMode } from '@/components/focus/FocusMode';

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

interface CourseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onCourseUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  in_progress: { label: 'Em Andamento', class: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Concluído', class: 'bg-success/10 text-success border-success/20' },
  pending: { label: 'Pendente', class: 'bg-muted text-muted-foreground border-border' },
};

const defaultImages = [
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=200&fit=crop',
];

export function CourseDetailsDialog({ open, onOpenChange, course, onCourseUpdate }: CourseDetailsDialogProps) {
  const [showFocusMode, setShowFocusMode] = useState(false);

  if (!course) return null;

  const imageUrl = course.cover_image_url || defaultImages[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-2xl max-h-[calc(100vh-64px)] overflow-y-auto p-3 sm:p-4 md:p-6 mx-auto">
          <DialogHeader className="pb-2 sm:pb-3">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg pr-8">
              <span className="truncate">{course.name}</span>
              {course.is_favorite && <Star className="h-4 w-4 fill-warning text-warning shrink-0" />}
            </DialogTitle>
            <DialogDescription>
              {course.description || 'Visualize e gerencie os detalhes do curso'}
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Cover Image */}
          <div className="relative h-28 sm:h-36 md:h-44 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 sm:gap-1.5">
              {course.category && (
                <Badge variant="secondary" className="bg-white/90 text-foreground text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 py-0.5">
                  {course.category}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={cn("bg-white/90 text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 py-0.5", statusConfig[course.status]?.class)}
              >
                {statusConfig[course.status]?.label || course.status}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div className="space-y-1 sm:space-y-1.5">
              <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Descrição</h4>
              <p className="text-xs sm:text-sm leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Course Info */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] sm:text-xs md:text-sm text-muted-foreground">
            {course.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Criado em {format(new Date(course.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {(course.start_date || course.end_date) && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>
                  {course.start_date && format(new Date(course.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  {course.start_date && course.end_date && ' - '}
                  {course.end_date && format(new Date(course.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {/* Modules Section */}
          <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t">
            <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              Módulos do Curso
            </h4>
            <CourseModulesView course={course} onModuleUpdate={onCourseUpdate} />
          </div>

          {/* Focus Mode Button */}
          <div className="pt-4 border-t">
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={() => setShowFocusMode(true)}
            >
              <Play className="h-5 w-5" />
              Iniciar Modo Foco
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Timer Pomodoro imersivo para estudar este curso
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

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