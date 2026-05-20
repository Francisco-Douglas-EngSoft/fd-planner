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
import { CheckCircle2 } from 'lucide-react';

interface CompleteCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  onConfirm: () => void;
}

export function CompleteCourseDialog({
  open,
  onOpenChange,
  courseName,
  onConfirm,
}: CompleteCourseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <AlertDialogTitle>Concluir Curso</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja marcar o curso <strong>"{courseName}"</strong> como concluído?
            </p>
            <p className="text-sm">
              Esta ação irá:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
              <li>Remover o curso deste planejamento</li>
              <li>Marcar o curso como "Concluído" na página de Cursos</li>
              <li>Recalcular as datas dos cursos restantes</li>
              <li>O próximo curso iniciará em 2 dias</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar Conclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}