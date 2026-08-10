import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeCompletedHours, ModuleLike, SubmoduleLike } from '@/lib/studyHours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, ListChecks, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AuditItem {
  courseName: string;
  moduleName: string;
  moduleHours: number;
  moduleCompleted: boolean;
  submodules: {
    name: string;
    hours: number;
    completed: boolean;
  }[];
  calculatedHours: number;
}

export function StudyAudit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const [summary, setSummary] = useState({ total: 0 });

  useEffect(() => {
    if (!user) return;
    fetchAudit();
  }, [user]);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const [modulesRes, submodulesRes] = await Promise.all([
        supabase
          .from('course_modules')
          .select('id, name, hours, is_completed, course_id, courses(name)')
          .eq('courses.user_id', user!.id),
        supabase
          .from('course_submodules')
          .select('id, name, hours, is_completed, module_id')
          .eq('course_modules.courses.user_id', user!.id)
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (submodulesRes.error) throw submodulesRes.error;

      const modules = modulesRes.data || [];
      const submodules = submodulesRes.data || [];

      const items: AuditItem[] = modules.map(m => {
        const mSubmodules = submodules.filter(s => s.module_id === m.id);
        const calculated = mSubmodules.length > 0
          ? mSubmodules.filter(s => s.is_completed).reduce((acc, s) => acc + (s.hours || 0), 0)
          : m.is_completed ? (m.hours || 0) : 0;

        return {
          courseName: (m.courses as any)?.name || 'Sem curso',
          moduleName: m.name,
          moduleHours: m.hours || 0,
          moduleCompleted: !!m.is_completed,
          submodules: mSubmodules.map(s => ({
            name: s.name,
            hours: s.hours || 0,
            completed: !!s.is_completed
          })),
          calculatedHours: calculated
        };
      });

      setAuditData(items);
      setSummary({ total: items.reduce((acc, i) => acc + i.calculatedHours, 0) });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Auditoria de Horas
          </h2>
          <p className="text-muted-foreground">Detalhamento técnico de como suas horas são calculadas.</p>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Calculado</p>
            <p className="text-3xl font-bold text-primary">{summary.total.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-xs font-bold uppercase">Como funciona o cálculo?</AlertTitle>
        <AlertDescription className="text-xs">
          Se um módulo possui submódulos, o sistema soma as horas dos <strong>submódulos concluídos</strong>. 
          Se não houver submódulos, o sistema considera as horas do <strong>módulo inteiro</strong> apenas se ele estiver marcado como concluído.
        </AlertDescription>
      </Alert>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso / Módulo</TableHead>
              <TableHead>Estrutura</TableHead>
              <TableHead className="text-right">Contribuição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Nenhum dado de estudo encontrado.</TableCell>
              </TableRow>
            ) : (
              auditData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="font-medium text-sm">{item.courseName}</div>
                    <div className="text-xs text-muted-foreground">{item.moduleName}</div>
                  </TableCell>
                  <TableCell>
                    {item.submodules.length > 0 ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] mb-1">Módulo com {item.submodules.length} submódulos</Badge>
                        <div className="flex flex-wrap gap-1">
                          {item.submodules.map((s, sidx) => (
                            <div key={sidx} title={`${s.name} (${s.hours}h)`} className={`w-2 h-2 rounded-full ${s.completed ? 'bg-emerald-500' : 'bg-muted'}`} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.moduleCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted" />
                        )}
                        <span className="text-xs">{item.moduleHours}h de base</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {item.calculatedHours > 0 ? (
                      <span className="text-emerald-500">+{item.calculatedHours.toFixed(1)}h</span>
                    ) : (
                      <span className="text-muted-foreground">0h</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
