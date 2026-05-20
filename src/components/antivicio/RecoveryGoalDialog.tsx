import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecoveryGoalDialog({ open, onOpenChange, onSuccess }: RecoveryGoalDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('days_clean');
  const [targetValue, setTargetValue] = useState('7');
  const [saving, setSaving] = useState(false);

  const goalTypeLabels: Record<string, string> = {
    'days_clean': 'Dias sem recaída',
    'resistances': 'Impulsos resistidos',
    'study_hours': 'Horas de estudo',
    'streak': 'Sequência de dias',
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error('Preencha o título da meta');
      return;
    }

    const target = parseInt(targetValue);
    if (isNaN(target) || target <= 0) {
      toast.error('Digite um valor válido para a meta');
      return;
    }

    try {
      setSaving(true);
      
      await supabase.from('recovery_goals').insert({
        user_id: user.id,
        title: title.trim(),
        goal_type: goalType,
        target_value: target,
        current_value: 0,
      });

      toast.success('Meta criada com sucesso!');
      setTitle('');
      setGoalType('days_clean');
      setTargetValue('7');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Nova Meta de Recuperação
          </DialogTitle>
          <DialogDescription>
            Defina uma meta para acompanhar seu progresso de recuperação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Meta</Label>
            <Input
              id="title"
              placeholder="Ex: 7 dias sem redes sociais"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalType">Tipo de Meta</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(goalTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">Valor Alvo</Label>
            <Input
              id="targetValue"
              type="number"
              min="1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {goalType === 'days_clean' && 'Quantos dias sem recaída você quer atingir?'}
              {goalType === 'resistances' && 'Quantos impulsos você quer resistir?'}
              {goalType === 'study_hours' && 'Quantas horas de estudo você quer completar?'}
              {goalType === 'streak' && 'Quantos dias de sequência você quer manter?'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Criando...' : 'Criar Meta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
