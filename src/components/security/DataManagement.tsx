/**
 * Data Management Component
 * LGPD Art. 18 - Direitos do Titular
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, Shield, AlertTriangle, FileJson } from 'lucide-react';
import { GDPRService } from '@/services/gdprService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DataManagement() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await GDPRService.exportUserData();
      
      // Cria arquivo JSON para download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fd-planner-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Dados exportados com sucesso!',
        description: 'Seus dados foram baixados em formato JSON.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETAR MINHA CONTA') {
      toast({
        title: 'Confirmação incorreta',
        description: 'Digite exatamente "DELETAR MINHA CONTA" para confirmar.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await GDPRService.deleteUserData();
      
      toast({
        title: 'Conta deletada',
        description: 'Todos os seus dados foram permanentemente removidos.',
      });

      // Redireciona para página de login após 2 segundos
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      toast({
        title: 'Erro ao deletar conta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Meus Dados
          </CardTitle>
          <CardDescription>
            Baixe uma cópia completa de todos os seus dados em formato JSON (LGPD Art. 18, II e V)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>O arquivo incluirá:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Perfil e informações pessoais</li>
              <li>Todos os cursos e módulos</li>
              <li>Tarefas e notas de estudo</li>
              <li>Sessões de foco e estatísticas</li>
              <li>Planejamentos e conquistas</li>
              <li>Logs de auditoria</li>
            </ul>
          </div>

          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <FileJson className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Dados'}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Relatório de Privacidade
          </CardTitle>
          <CardDescription>
            Informações sobre como seus dados são coletados e utilizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">📊 Dados Coletados</h4>
              <p className="text-xs text-muted-foreground">
                Nome, email, cursos, notas, sessões de foco, progresso acadêmico
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">🔒 Compartilhamento</h4>
              <p className="text-xs text-muted-foreground">
                Nenhum dado é compartilhado com terceiros
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">⏱️ Retenção</h4>
              <p className="text-xs text-muted-foreground">
                2 anos após última atividade (pode solicitar exclusão a qualquer momento)
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">✅ Seus Direitos</h4>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>Acesso aos dados (exportação)</li>
                <li>Correção de dados</li>
                <li>Exclusão de dados</li>
                <li>Portabilidade</li>
                <li>Revogação de consentimento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam permanentemente sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-destructive">
              ⚠️ Deletar Conta e Todos os Dados
            </p>
            <p className="text-xs text-muted-foreground">
              Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados serão 
              completamente removidos de nossos servidores e não poderão ser recuperados.
            </p>
            <p className="text-xs text-muted-foreground">
              Recomendamos exportar seus dados antes de prosseguir.
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar Minha Conta
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Conta
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação é <strong>permanente e irreversível</strong>. 
                Todos os seus dados serão completamente removidos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Perfil e informações pessoais</li>
                <li>Todos os cursos e módulos</li>
                <li>Tarefas e notas</li>
                <li>Sessões de foco e estatísticas</li>
                <li>Planejamentos e conquistas</li>
              </ul>
              <p className="text-destructive font-semibold">
                Você não poderá recuperar estes dados após a exclusão.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Digite "DELETAR MINHA CONTA" para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="DELETAR MINHA CONTA"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'DELETAR MINHA CONTA'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deletando...' : 'Deletar Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
