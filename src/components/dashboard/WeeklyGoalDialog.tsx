import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Clock, CheckSquare, Zap } from 'lucide-react';

interface WeeklyGoal {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  week_start: string;
  week_end: string;
}

interface WeeklyGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingGoal: WeeklyGoal | null;
  weekStart: Date;
  weekEnd: Date;
}

const goalTypes = [
  { value: 'hours', label: 'Horas de Estudo', icon: Clock, placeholder: 'Ex: 20' },
  { value: 'tasks', label: 'Tarefas Concluídas', icon: CheckSquare, placeholder: 'Ex: 10' },
  { value: 'sessions', label: 'Sessões Pomodoro', icon: Zap, placeholder: 'Ex: 15' },
];

export function WeeklyGoalDialog({
  open,
  onOpenChange,
  onSuccess,
  editingGoal,
  weekStart,
  weekEnd,
}: WeeklyGoalDialogProps) {
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('hours');
  const [targetValue, setTargetValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setGoalType(editingGoal.goal_type);
      setTargetValue(editingGoal.target_value.toString());
    } else {
      setTitle('');
      setGoalType('hours');
      setTargetValue('');
    }
  }, [editingGoal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !targetValue) return;

    setIsLoading(true);

    const goalData = {
      title,
      goal_type: goalType,
      target_value: parseFloat(targetValue),
      week_start: format(weekStart, 'yyyy-MM-dd'),
      week_end: format(weekEnd, 'yyyy-MM-dd'),
    };

    let error;

    if (editingGoal) {
      const result = await supabase
        .from('weekly_goals')
        .update({ ...goalData, updated_at: new Date().toISOString() })
        .eq('id', editingGoal.id);
      error = result.error;
    } else {
      const result = await supabase.from('weekly_goals').insert({
        ...goalData,
        user_id: user.id,
        current_value: 0,
      });
      error = result.error;
    }

    setIsLoading(false);

    if (error) {
      toast.error('Erro ao salvar meta');
      return;
    }

    toast.success(editingGoal ? 'Meta atualizada!' : 'Meta criada!');
    onSuccess();
    onOpenChange(false);
  };

  const selectedType = goalTypes.find((t) => t.value === goalType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingGoal ? 'Editar Meta' : 'Nova Meta Semanal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Meta</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar 20 horas esta semana"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalType">Tipo de Meta</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
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
              step="0.5"
              min="1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={selectedType?.placeholder}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Criar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
