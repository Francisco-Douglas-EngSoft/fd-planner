import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, FileJson, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TABLES_TO_EXPORT = [
  { name: 'profiles', label: 'Perfis' },
  { name: 'courses', label: 'Cursos' },
  { name: 'course_modules', label: 'Módulos' },
  { name: 'course_submodules', label: 'Submódulos' },
  { name: 'study_plans', label: 'Planos de Estudo' },
  { name: 'study_plan_courses', label: 'Cursos do Plano' },
  { name: 'study_plan_modules', label: 'Módulos do Plano' },
  { name: 'study_plan_time_blocks', label: 'Blocos de Tempo' },
  { name: 'daily_study_progress', label: 'Progresso Diário' },
  { name: 'weekly_goals', label: 'Metas Semanais' },
  { name: 'monthly_goals', label: 'Metas Mensais' },
  { name: 'recovery_goals', label: 'Metas de Recuperação' },
  { name: 'focus_sessions', label: 'Sessões de Foco' },
  { name: 'tasks', label: 'Tarefas' },
  { name: 'study_notes', label: 'Notas' },
  { name: 'study_reminders', label: 'Lembretes' },
  { name: 'addiction_profiles', label: 'Perfil Anti-Vício' },
  { name: 'addiction_checkins', label: 'Check-ins' },
  { name: 'clean_streaks', label: 'Sequências Limpas' },
  { name: 'impulse_logs', label: 'Logs de Impulso' },
  { name: 'relapses', label: 'Recaídas' },
  { name: 'user_achievements', label: 'Conquistas' },
  { name: 'user_certificates', label: 'Certificados' },
  { name: 'user_projects', label: 'Projetos' },
  { name: 'user_resume', label: 'Currículo' },
  { name: 'user_social_links', label: 'Links Sociais' },
  { name: 'notification_history', label: 'Notificações' },
] as const;

type TableName = typeof TABLES_TO_EXPORT[number]['name'];

interface ExportResult {
  table: string;
  count: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export function DatabaseExportTool() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [exportData, setExportData] = useState<Record<string, unknown[]> | null>(null);

  const fetchTableData = async (tableName: TableName): Promise<{ data: unknown[]; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) {
        return { data: [], error: error.message };
      }
      
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: String(err) };
    }
  };

  const handleExport = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para exportar os dados');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setResults([]);
    setExportData(null);

    const allData: Record<string, unknown[]> = {};
    const newResults: ExportResult[] = [];

    for (let i = 0; i < TABLES_TO_EXPORT.length; i++) {
      const table = TABLES_TO_EXPORT[i];
      
      const { data, error } = await fetchTableData(table.name);
      
      const result: ExportResult = {
        table: table.label,
        count: data.length,
        status: error ? 'error' : 'success',
        error: error || undefined,
      };
      
      newResults.push(result);
      setResults([...newResults]);
      
      if (!error) {
        allData[table.name] = data;
      }
      
      setProgress(((i + 1) / TABLES_TO_EXPORT.length) * 100);
    }

    setExportData(allData);
    setIsExporting(false);
    
    const successCount = newResults.filter(r => r.status === 'success').length;
    const totalRecords = newResults.reduce((acc, r) => acc + r.count, 0);
    
    toast.success(`Exportação concluída: ${successCount}/${TABLES_TO_EXPORT.length} tabelas, ${totalRecords} registros`);
  };

  const downloadJSON = () => {
    if (!exportData) return;

    const exportPackage = {
      exportedAt: new Date().toISOString(),
      userId: user?.id,
      tables: exportData,
      metadata: {
        totalTables: Object.keys(exportData).length,
        totalRecords: Object.values(exportData).reduce((acc, arr) => acc + arr.length, 0),
      },
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fdplanner-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo JSON baixado com sucesso!');
  };

  const downloadSQL = () => {
    if (!exportData) return;

    let sqlContent = '-- FD Planner Data Export\n';
    sqlContent += `-- Generated at: ${new Date().toISOString()}\n`;
    sqlContent += '-- IMPORTANTE: Execute este script APÓS criar as tabelas\n\n';

    for (const [tableName, records] of Object.entries(exportData)) {
      if (records.length === 0) continue;

      sqlContent += `-- Table: ${tableName}\n`;
      
      for (const record of records) {
        const columns = Object.keys(record).filter(k => record[k] !== null);
        const values = columns.map(k => {
          const val = record[k];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (typeof val === 'number') return val;
          if (Array.isArray(val)) return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        sqlContent += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      sqlContent += '\n';
    }

    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fdplanner-data-${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo SQL baixado com sucesso!');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Exportar Dados para Migração
        </CardTitle>
        <CardDescription>
          Exporte todos os seus dados para migrar para um projeto Supabase externo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Button */}
        <div className="flex flex-col gap-4">
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !user}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Iniciar Exportação
              </>
            )}
          </Button>

          {!user && (
            <p className="text-sm text-destructive text-center">
              Você precisa estar logado para exportar os dados
            </p>
          )}
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Resultado da Exportação</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm truncate">{result.table}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {result.count}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total de Registros</span>
                <Badge className="text-lg px-3">
                  {results.reduce((acc, r) => acc + r.count, 0)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Download Buttons */}
        {exportData && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={downloadJSON} variant="outline" className="flex-1">
              <FileJson className="mr-2 h-4 w-4" />
              Baixar JSON
            </Button>
            <Button onClick={downloadSQL} variant="outline" className="flex-1">
              <Database className="mr-2 h-4 w-4" />
              Baixar SQL (INSERT)
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
          <p className="font-medium">📋 Instruções de Migração:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Execute o script <code className="text-primary">docs/migration-schema.sql</code> no novo Supabase</li>
            <li>Clique em "Iniciar Exportação" para extrair seus dados</li>
            <li>Baixe o arquivo SQL ou JSON</li>
            <li>Execute os INSERTs no SQL Editor do novo projeto</li>
            <li>Atualize as variáveis de ambiente com as novas credenciais</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
