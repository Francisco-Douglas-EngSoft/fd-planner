import { useState, useRef, useEffect } from 'react';
import { Download, Upload, FileJson, Check, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  exportCourses, 
  downloadExportFile, 
  importCourses, 
  parseImportFile,
  ExportData,
  ExportedCourse
} from '@/lib/courseExport';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  name: string;
  total_hours: number | null;
  category: string | null;
}

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function ImportExportDialog({ 
  open, 
  onOpenChange, 
  onImportSuccess 
}: ImportExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  
  // New states for individual selection
  const [userCourses, setUserCourses] = useState<Course[]>([]);
  const [selectedExportCourses, setSelectedExportCourses] = useState<string[]>([]);
  const [selectedImportCourses, setSelectedImportCourses] = useState<string[]>([]);
  const [showExportSelection, setShowExportSelection] = useState(false);
  const [showImportSelection, setShowImportSelection] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchUserCourses();
    }
  }, [open, user]);

  const fetchUserCourses = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, total_hours, category')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setUserCourses(data);
    }
  };

  const handleExport = async (exportAll: boolean = true) => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const courseIds = exportAll ? undefined : selectedExportCourses;
      const data = await exportCourses(user.id, courseIds);
      downloadExportFile(data);
      toast({
        title: 'Backup criado com sucesso!',
        description: `${data.courses.length} curso(s) exportado(s).`,
      });
      setShowExportSelection(false);
      setSelectedExportCourses([]);
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseImportFile(file);
      setImportData(data);
      setImportResult(null);
      setSelectedImportCourses(data.courses.map(c => c.name)); // Select all by default
      setShowImportSelection(true);
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: error instanceof Error ? error.message : 'Arquivo inválido',
        variant: 'destructive',
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!user || !importData) return;
    
    setIsImporting(true);
    try {
      const result = await importCourses(user.id, importData, {
        selectedCourses: selectedImportCourses,
      });
      setImportResult(result);
      
      if (result.imported > 0) {
        toast({
          title: 'Importação concluída!',
          description: `${result.imported} curso(s) importado(s)${result.skipped > 0 ? `, ${result.skipped} ignorado(s)` : ''}.`,
        });
        onImportSuccess?.();
      } else {
        toast({
          title: 'Nenhum curso importado',
          description: 'Todos os cursos selecionados já existem no sistema.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao importar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportData(null);
    setImportResult(null);
    setShowExportSelection(false);
    setShowImportSelection(false);
    setSelectedExportCourses([]);
    setSelectedImportCourses([]);
    onOpenChange(false);
  };

  const toggleExportCourse = (courseId: string) => {
    setSelectedExportCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleImportCourse = (courseName: string) => {
    setSelectedImportCourses(prev => 
      prev.includes(courseName) 
        ? prev.filter(name => name !== courseName)
        : [...prev, courseName]
    );
  };

  const selectAllExport = () => {
    setSelectedExportCourses(userCourses.map(c => c.id));
  };

  const deselectAllExport = () => {
    setSelectedExportCourses([]);
  };

  const selectAllImport = () => {
    if (importData) {
      setSelectedImportCourses(importData.courses.map(c => c.name));
    }
  };

  const deselectAllImport = () => {
    setSelectedImportCourses([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Backup de Cursos
          </DialogTitle>
          <DialogDescription>
            Exporte seus cursos para backup ou importe de um arquivo salvo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4 pr-4">
            {/* Export Section */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Exportar Cursos</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baixe um arquivo JSON com seus cursos e módulos.
                  </p>
                </div>
              </div>
              
              {/* Export Selection Toggle */}
              <button
                type="button"
                onClick={() => setShowExportSelection(!showExportSelection)}
                className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Selecionar cursos específicos</span>
                {showExportSelection ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showExportSelection && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {selectedExportCourses.length} de {userCourses.length} selecionados
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllExport}
                        className="text-primary hover:underline"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllExport}
                        className="text-muted-foreground hover:underline"
                      >
                        Nenhum
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {userCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 text-center">
                        Nenhum curso cadastrado
                      </p>
                    ) : (
                      userCourses.map(course => (
                        <div
                          key={course.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                        >
                          <Checkbox
                            id={`export-${course.id}`}
                            checked={selectedExportCourses.includes(course.id)}
                            onCheckedChange={() => toggleExportCourse(course.id)}
                          />
                          <label
                            htmlFor={`export-${course.id}`}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            {course.name}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {course.total_hours || 0}h
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => handleExport(true)}
                  disabled={isExporting || userCourses.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Exportar Todos
                </Button>
                {showExportSelection && selectedExportCourses.length > 0 && (
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => handleExport(false)}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Exportar ({selectedExportCourses.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Import Section */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-accent/10 p-2">
                  <Upload className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Importar Cursos</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restaure cursos de um arquivo de backup.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />

              {!importData ? (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Arquivo válido</span>
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{importData.courses.length} curso(s) no arquivo</p>
                      <p>Exportado em: {new Date(importData.exportedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Course Selection for Import */}
                  {showImportSelection && !importResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {selectedImportCourses.length} de {importData.courses.length} selecionados
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllImport}
                            className="text-primary hover:underline"
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={deselectAllImport}
                            className="text-muted-foreground hover:underline"
                          >
                            Nenhum
                          </button>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {importData.courses.map(course => (
                          <div
                            key={course.name}
                            className="flex items-center gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                          >
                            <Checkbox
                              id={`import-${course.name}`}
                              checked={selectedImportCourses.includes(course.name)}
                              onCheckedChange={() => toggleImportCourse(course.name)}
                            />
                            <label
                              htmlFor={`import-${course.name}`}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              {course.name}
                            </label>
                            <span className="text-xs text-muted-foreground">
                              {course.total_hours}h
                              {course.modules && course.modules.length > 0 && (
                                <span className="ml-1">• {course.modules.length} mód.</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult ? (
                    <div className={cn(
                      "rounded-md p-3 text-sm",
                      importResult.imported > 0 ? "bg-success/10" : "bg-warning/10"
                    )}>
                      <div className="flex items-center gap-2">
                        {importResult.imported > 0 ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-medium">
                          {importResult.imported} importado(s), {importResult.skipped} ignorado(s)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setImportData(null);
                          setShowImportSelection(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1 gap-2"
                        onClick={handleImport}
                        disabled={isImporting || selectedImportCourses.length === 0}
                      >
                        {isImporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Importar ({selectedImportCourses.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              Os cursos duplicados serão ignorados automaticamente.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
