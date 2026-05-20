import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { addDays, addMonths, format } from 'date-fns';

interface Course {
  id: string;
  name: string;
  total_hours: number;
  category: string | null;
}

// Categorize courses for smart plan generation
const categorizeCourses = (courses: Course[]) => {
  const quickWins = courses.filter(c => c.total_hours <= 30).sort((a, b) => a.total_hours - b.total_hours);
  const iaAutomation = courses.filter(c => 
    c.name.toLowerCase().includes('ia') || 
    c.name.toLowerCase().includes('n8n') || 
    c.name.toLowerCase().includes('lovable') ||
    c.name.toLowerCase().includes('automação') ||
    c.name.toLowerCase().includes('automoç')
  );
  const javaTrack = courses.filter(c => 
    c.name.toLowerCase().includes('java') || 
    c.name.toLowerCase().includes('spring') ||
    c.name.toLowerCase().includes('kotlin')
  );
  const fullstack = courses.filter(c => 
    c.name.toLowerCase().includes('fullstack') || 
    c.name.toLowerCase().includes('full-stack') ||
    c.name.toLowerCase().includes('javascript') ||
    c.name.toLowerCase().includes('nodejs') ||
    c.name.toLowerCase().includes('node.js')
  );
  
  return { quickWins, iaAutomation, javaTrack, fullstack };
};

export function AutoGeneratePlansButton({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generatePlans = async () => {
    if (!user) return;
    
    setIsGenerating(true);

    try {
      // Fetch all courses (excluding completed ones)
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, total_hours, category')
        .eq('user_id', user.id)
        .not('status', 'eq', 'completed')
        .not('category', 'eq', 'Faculdades');

      if (coursesError) throw coursesError;
      if (!courses || courses.length === 0) {
        toast({
          title: 'Nenhum curso encontrado',
          description: 'Adicione cursos antes de gerar planos.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      const { quickWins, iaAutomation, javaTrack } = categorizeCourses(courses as Course[]);
      
      const today = new Date();
      const plansToCreate = [];

      // Plan 1: Quick Wins (2 weeks)
      const quickWinCourses = quickWins.slice(0, 5);
      if (quickWinCourses.length > 0) {
        plansToCreate.push({
          name: '🚀 Quick Wins - Cursos Rápidos',
          description: 'Cursos de até 30 horas para ganhar momentum e motivação inicial. Foco em resultados rápidos.',
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(addDays(today, 30), 'yyyy-MM-dd'),
          daily_hours: 2,
          study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          courses: quickWinCourses,
        });
      }

      // Plan 2: IA & Automation (2 months)
      const iaCourses = iaAutomation.slice(0, 6);
      if (iaCourses.length > 0) {
        plansToCreate.push({
          name: '🤖 Trilha IA & Automação',
          description: 'Formação completa em Inteligência Artificial, N8N e ferramentas No-Code. Aplicação prática imediata.',
          start_date: format(addDays(today, 7), 'yyyy-MM-dd'),
          end_date: format(addMonths(today, 3), 'yyyy-MM-dd'),
          daily_hours: 2.5,
          study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          courses: iaCourses,
        });
      }

      // Plan 3: Java Enterprise (4 months)
      const javaCourses = javaTrack.slice(0, 6);
      if (javaCourses.length > 0) {
        plansToCreate.push({
          name: '☕ Trilha Java Enterprise',
          description: 'Formação Java completa para mercado corporativo. Spring Boot, padrões de projeto e arquitetura.',
          start_date: format(addDays(today, 14), 'yyyy-MM-dd'),
          end_date: format(addMonths(today, 6), 'yyyy-MM-dd'),
          daily_hours: 2,
          study_days: ['monday', 'wednesday', 'friday', 'saturday'],
          courses: javaCourses,
        });
      }

      // If we don't have enough categorized courses, create a general plan
      if (plansToCreate.length < 3) {
        const remainingCourses = courses.filter(c => 
          !quickWinCourses.find(q => q.id === c.id) &&
          !iaCourses.find(i => i.id === c.id) &&
          !javaCourses.find(j => j.id === c.id)
        ).slice(0, 5);

        if (remainingCourses.length > 0) {
          plansToCreate.push({
            name: '📚 Plano de Estudos Geral',
            description: 'Cursos variados para ampliar conhecimentos. Ritmo moderado e consistente.',
            start_date: format(today, 'yyyy-MM-dd'),
            end_date: format(addMonths(today, 4), 'yyyy-MM-dd'),
            daily_hours: 1.5,
            study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            courses: remainingCourses as Course[],
          });
        }
      }

      // Create the plans in database
      for (const planData of plansToCreate) {
        const totalHours = planData.courses.reduce((sum, c) => sum + (c.total_hours || 0), 0);
        
        // Insert plan
        const { data: plan, error: planError } = await supabase
          .from('study_plans')
          .insert({
            user_id: user.id,
            name: planData.name,
            description: planData.description,
            start_date: planData.start_date,
            end_date: planData.end_date,
            daily_hours: planData.daily_hours,
            study_days: planData.study_days,
            total_hours: totalHours,
          })
          .select()
          .single();

        if (planError) throw planError;

        // Insert plan courses
        const planCourses = planData.courses.map((course, index) => ({
          study_plan_id: plan.id,
          course_id: course.id,
          allocated_hours: course.total_hours,
          is_fixed: index === 0, // First course is fixed (daily)
          study_days: planData.study_days,
          sequence_order: index + 1,
          is_completed: false,
        }));

        const { error: coursesInsertError } = await supabase
          .from('study_plan_courses')
          .insert(planCourses);

        if (coursesInsertError) throw coursesInsertError;
      }

      toast({
        title: '✨ Planos gerados com sucesso!',
        description: `${plansToCreate.length} planos de estudo foram criados automaticamente.`,
      });

      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error generating plans:', error);
      toast({
        title: 'Erro ao gerar planos',
        description: (error instanceof Error ? error.message : String(error)) || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Wand2 className="h-4 w-4" />
        <span className="hidden sm:inline">Gerar Planos IA</span>
        <span className="sm:hidden">IA</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Gerar Planos Automaticamente
            </DialogTitle>
            <DialogDescription>
              Vou analisar seus cursos e criar 3 planos de estudo otimizados:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-xl">🚀</span>
              <div>
                <p className="font-medium text-sm">Quick Wins</p>
                <p className="text-xs text-muted-foreground">Cursos rápidos (até 30h) para ganhar momentum</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-medium text-sm">Trilha IA & Automação</p>
                <p className="text-xs text-muted-foreground">N8N, Lovable, IA Generativa e No-Code</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <span className="text-xl">☕</span>
              <div>
                <p className="font-medium text-sm">Trilha Java Enterprise</p>
                <p className="text-xs text-muted-foreground">Java, Spring Boot e arquitetura corporativa</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generatePlans} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar 3 Planos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
