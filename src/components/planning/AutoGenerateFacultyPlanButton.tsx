import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateFacultyStudyPlan, validateGeneratedPlan, type Faculty, type GeneratedPlan } from '@/lib/facultyPlanGenerator';

interface AutoGenerateFacultyPlanButtonProps {
  faculties: Faculty[];
  startDate: string;
  endDate: string;
  studyDays: string[];
  dailyHours: number;
  onPlanGenerated: (plan: GeneratedPlan) => void;
  disabled?: boolean;
}

export function AutoGenerateFacultyPlanButton({
  faculties,
  startDate,
  endDate,
  studyDays,
  dailyHours,
  onPlanGenerated,
  disabled = false,
}: AutoGenerateFacultyPlanButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    setIsGenerating(true);

    try {
      // Validar inputs
      if (!startDate || !endDate) {
        toast({
          title: 'Erro',
          description: 'Defina as datas de início e fim do período letivo',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      if (studyDays.length === 0) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos um dia da semana para estudo',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      if (faculties.length === 0) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos uma faculdade',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Contar total de módulos
      const totalModules = faculties.reduce((sum, f) => 
        sum + f.disciplines.reduce((dSum, d) => dSum + d.modules.length, 0), 0
      );

      if (totalModules === 0) {
        toast({
          title: 'Erro',
          description: 'Nenhum módulo encontrado nas disciplinas selecionadas',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Gerar plano
      const plan = generateFacultyStudyPlan(
        faculties,
        startDate,
        endDate,
        studyDays,
        dailyHours
      );

      // Validar plano gerado
      const validationResult = validateGeneratedPlan(plan, totalModules);
      
      setGeneratedPlan(plan);
      setValidation(validationResult);
      setShowPreview(true);

    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      toast({
        title: 'Erro ao gerar plano',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (generatedPlan) {
      onPlanGenerated(generatedPlan);
      setShowPreview(false);
      toast({
        title: 'Plano gerado com sucesso!',
        description: `${generatedPlan.modulesCount} módulos distribuídos em ${generatedPlan.totalDays} dias`,
      });
    }
  };

  const totalDisciplines = faculties.reduce((sum, f) => sum + f.disciplines.length, 0);
  const totalModules = faculties.reduce((sum, f) => 
    sum + f.disciplines.reduce((dSum, d) => dSum + d.modules.length, 0), 0
  );

  const canGenerate = !disabled && faculties.length > 0 && totalModules > 0 && startDate && endDate && studyDays.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="default"
        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando plano...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Gerar Plano Automaticamente
          </>
        )}
      </Button>

      {!canGenerate && faculties.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {!startDate || !endDate ? 'Defina as datas do período letivo' : 
           studyDays.length === 0 ? 'Selecione os dias de estudo' :
           totalModules === 0 ? 'Nenhum módulo disponível nas disciplinas' : ''}
        </p>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Pré-visualização do Plano Gerado
            </DialogTitle>
            <DialogDescription>
              Revise o plano antes de confirmar
            </DialogDescription>
          </DialogHeader>

          {generatedPlan && validation && (
            <div className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Disciplinas</p>
                  <p className="text-2xl font-bold text-primary">{generatedPlan.disciplinesCount}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Módulos</p>
                  <p className="text-2xl font-bold text-primary">{generatedPlan.modulesCount}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Dias de Estudo</p>
                  <p className="text-2xl font-bold text-primary">{generatedPlan.totalDays}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Média/Dia</p>
                  <p className="text-2xl font-bold text-primary">{generatedPlan.averageHoursPerDay.toFixed(1)}h</p>
                </div>
              </div>

              {/* Validação */}
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.isValid && validation.warnings.length === 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Plano gerado com sucesso! Todos os módulos foram distribuídos uniformemente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Resumo por Disciplina */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Distribuição por Disciplina</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(
                    generatedPlan.studyBlocks.reduce((acc, block) => {
                      if (!acc[block.disciplineId]) {
                        acc[block.disciplineId] = {
                          name: block.disciplineName,
                          modules: 0,
                          hours: 0,
                        };
                      }
                      acc[block.disciplineId].modules++;
                      acc[block.disciplineId].hours += block.hours;
                      return acc;
                    }, {} as Record<string, { name: string; modules: number; hours: number }>)
                  ).map(([id, data]) => (
                    <div key={id} className="flex items-center justify-between p-2 rounded border bg-card">
                      <span className="text-sm font-medium">{data.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{data.modules} módulos</span>
                        <span className="font-medium text-primary">{data.hours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30">
                <p>• Os módulos foram distribuídos alternando entre disciplinas</p>
                <p>• Cada disciplina terá seus módulos estudados em sequência</p>
                <p>• O plano respeita os dias de estudo e carga horária definidos</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!validation?.isValid}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
