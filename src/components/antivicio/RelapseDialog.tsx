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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RelapseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addictionTypes: string[];
  onSuccess: () => void;
}

const addictionTypeLabels: Record<string, string> = {
  'social_media': 'Redes Sociais',
  'games': 'Jogos',
  'pornography': 'Pornografia',
  'fast_dopamine': 'Dopamina Rápida',
  'procrastination': 'Procrastinação',
  'youtube': 'YouTube',
  'streaming': 'Streaming',
  'shopping': 'Compras Online'
};

export function RelapseDialog({ open, onOpenChange, addictionTypes, onSuccess }: RelapseDialogProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');
  const [lessons, setLessons] = useState('');
  const [returnedToStudy, setReturnedToStudy] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !selectedType) {
      toast.error('Selecione o tipo de recaída');
      return;
    }

    try {
      setSaving(true);
      
      // Log the relapse
      await supabase.from('relapses').insert({
        user_id: user.id,
        addiction_type: selectedType,
        trigger_identified: trigger || null,
        lessons_learned: lessons || null,
        returned_to_study: returnedToStudy,
      });

      // Update today's checkin
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: existingCheckin } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_date', today)
        .maybeSingle();

      if (existingCheckin) {
        await supabase
          .from('addiction_checkins')
          .update({
            relapses_count: existingCheckin.relapses_count + 1,
          })
          .eq('id', existingCheckin.id);
      } else {
        await supabase.from('addiction_checkins').insert({
          user_id: user.id,
          check_date: today,
          relapses_count: 1,
        });
      }

      // Reset streak for this addiction type
      await supabase
        .from('clean_streaks')
        .update({
          current_streak: 0,
          last_clean_date: today,
        })
        .eq('user_id', user.id)
        .eq('addiction_type', selectedType);

      toast.success('Recaída registrada. O importante é voltar ao foco!');
      
      // Reset form
      setSelectedType(null);
      setTrigger('');
      setLessons('');
      setReturnedToStudy(false);
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error logging relapse:', error);
      toast.error('Erro ao registrar recaída');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Registrar Recaída
          </DialogTitle>
          <DialogDescription>
            Registrar recaídas ajuda a entender padrões e melhorar suas estratégias. Não se julgue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Qual foi o comportamento?</Label>
            <div className="flex flex-wrap gap-2">
              {addictionTypes.map((type) => (
                <Badge
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all py-2 px-3",
                    selectedType === type && "bg-primary"
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  {addictionTypeLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger">O que disparou esse impulso?</Label>
            <Textarea
              id="trigger"
              placeholder="Ex: Estava entediado, cansado, ansioso..."
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessons">O que você aprendeu?</Label>
            <Textarea
              id="lessons"
              placeholder="Ex: Preciso ter mais atenção nesse horário..."
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="returnedToStudy"
              checked={returnedToStudy}
              onCheckedChange={(checked) => setReturnedToStudy(checked === true)}
            />
            <label
              htmlFor="returnedToStudy"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Consegui voltar aos estudos depois
            </label>
          </div>

          <div className="bg-primary/5 rounded-lg p-4 flex items-start gap-3">
            <Heart className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Lembre-se:</p>
              <p className="text-muted-foreground">
                Uma recaída não define você. O importante é aprender e voltar ao caminho.
              </p>
            </div>
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
              disabled={saving || !selectedType}
              className="flex-1"
            >
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
