import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DataExportDialogProps {
  children: React.ReactNode;
}

type ExportFormat = 'json' | 'csv';

export function DataExportDialog({ children }: DataExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAllUserData = async () => {
    if (!user) return null;

    const [
      profileRes,
      coursesRes,
      modulesRes,
      tasksRes,
      plansRes,
      planCoursesRes,
      focusRes,
      notesRes,
      achievementsRes,
      weeklyGoalsRes,
      addictionProfileRes,
      checkinsRes,
      impulsesRes,
      relapsesRes,
      streaksRes,
      recoveryGoalsRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('courses').select('*').eq('user_id', user.id),
      supabase.from('course_modules').select('*, courses!inner(user_id)').eq('courses.user_id', user.id),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('study_plans').select('*').eq('user_id', user.id),
      supabase.from('study_plan_courses').select('*, study_plans!inner(user_id)').eq('study_plans.user_id', user.id),
      supabase.from('focus_sessions').select('*').eq('user_id', user.id),
      supabase.from('study_notes').select('*').eq('user_id', user.id),
      supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id),
      supabase.from('weekly_goals').select('*').eq('user_id', user.id),
      supabase.from('addiction_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('addiction_checkins').select('*').eq('user_id', user.id),
      supabase.from('impulse_logs').select('*').eq('user_id', user.id),
      supabase.from('relapses').select('*').eq('user_id', user.id),
      supabase.from('clean_streaks').select('*').eq('user_id', user.id),
      supabase.from('recovery_goals').select('*').eq('user_id', user.id)
    ]);

    return {
      exportDate: new Date().toISOString(),
      userEmail: user.email,
      profile: profileRes.data,
      courses: coursesRes.data || [],
      courseModules: modulesRes.data || [],
      tasks: tasksRes.data || [],
      studyPlans: plansRes.data || [],
      studyPlanCourses: planCoursesRes.data || [],
      focusSessions: focusRes.data || [],
      studyNotes: notesRes.data || [],
      achievements: achievementsRes.data || [],
      weeklyGoals: weeklyGoalsRes.data || [],
      antiVicio: {
        profile: addictionProfileRes.data,
        checkins: checkinsRes.data || [],
        impulseLogs: impulsesRes.data || [],
        relapses: relapsesRes.data || [],
        cleanStreaks: streaksRes.data || [],
        recoveryGoals: recoveryGoalsRes.data || []
      }
    };
  };

  const convertToCSV = (data: Record<string, any>): string => {
    const lines: string[] = [];
    
    // Add header
    lines.push('FD-Planner - Exportação de Dados Pessoais');
    lines.push(`Data de exportação: ${data.exportDate}`);
    lines.push(`Email: ${data.userEmail}`);
    lines.push('');

    // Helper function to convert array to CSV section
    const arrayToCSV = (name: string, arr: Record<string, any>[] | null | undefined) => {
      if (!arr || arr.length === 0) return;
      
      lines.push(`=== ${name} ===`);
      
      // Get headers from first object
      const headers = Object.keys(arr[0]);
      lines.push(headers.join(','));
      
      // Add rows
      arr.forEach(item => {
        const values = headers.map(h => {
          let val = item[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') val = JSON.stringify(val);
          // Escape quotes and wrap in quotes if contains comma
          val = String(val).replace(/"/g, '""');
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val}"`;
          }
          return val;
        });
        lines.push(values.join(','));
      });
      
      lines.push('');
    };

    // Profile
    if (data.profile) {
      lines.push('=== Perfil ===');
      Object.entries(data.profile).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }

    // All other data
    arrayToCSV('Cursos', data.courses);
    arrayToCSV('Módulos de Cursos', data.courseModules);
    arrayToCSV('Tarefas', data.tasks);
    arrayToCSV('Planos de Estudo', data.studyPlans);
    arrayToCSV('Sessões de Foco', data.focusSessions);
    arrayToCSV('Anotações', data.studyNotes);
    arrayToCSV('Conquistas', data.achievements);
    arrayToCSV('Metas Semanais', data.weeklyGoals);
    
    // AntiVício data
    if (data.antiVicio?.profile) {
      lines.push('=== AntiVício - Perfil ===');
      Object.entries(data.antiVicio.profile).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }
    
    arrayToCSV('AntiVício - Check-ins', data.antiVicio?.checkins);
    arrayToCSV('AntiVício - Registros de Impulsos', data.antiVicio?.impulseLogs);
    arrayToCSV('AntiVício - Recaídas', data.antiVicio?.relapses);
    arrayToCSV('AntiVício - Sequências Limpas', data.antiVicio?.cleanStreaks);
    arrayToCSV('AntiVício - Metas de Recuperação', data.antiVicio?.recoveryGoals);

    return lines.join('\n');
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const data = await fetchAllUserData();
      
      if (!data) {
        throw new Error('Não foi possível obter seus dados');
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `fdplanner-dados-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        content = convertToCSV(data);
        filename = `fdplanner-dados-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create and download file
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Dados exportados com sucesso!',
        description: `Arquivo ${filename} baixado.`,
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao exportar dados',
        description: (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Meus Dados
          </DialogTitle>
          <DialogDescription>
            Baixe uma cópia de todos os seus dados pessoais armazenados no FD-Planner, 
            conforme seu direito à portabilidade (LGPD Art. 18).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Formato de exportação</Label>
            <RadioGroup 
              value={format} 
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem 
                  value="json" 
                  id="json" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="json"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileJson className="mb-3 h-6 w-6" />
                  <span className="font-semibold">JSON</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Formato técnico, preserva estrutura completa
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem 
                  value="csv" 
                  id="csv" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="csv"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="mb-3 h-6 w-6" />
                  <span className="font-semibold">CSV</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Abre em Excel, Google Sheets
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">O que será exportado:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Dados do perfil</li>
              <li>Cursos, módulos e progresso</li>
              <li>Tarefas e planejamentos</li>
              <li>Sessões de foco</li>
              <li>Anotações de estudo</li>
              <li>Conquistas desbloqueadas</li>
              <li>Dados do módulo AntiVício (se utilizado)</li>
            </ul>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={exporting}
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar Dados
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
