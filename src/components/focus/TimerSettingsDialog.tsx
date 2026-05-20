import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Preset } from '@/hooks/usePomodoroTimer';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: Preset[];
  updatePreset: (index: number, preset: Preset) => void;
  addCustomPreset: (preset: Preset) => void;
  removePreset: (index: number) => void;
}

export function TimerSettingsDialog({
  open,
  onOpenChange,
  presets,
  updatePreset,
  addCustomPreset,
  removePreset,
}: TimerSettingsDialogProps) {
  const [editingPresets, setEditingPresets] = useState<Preset[]>(presets);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetWork, setNewPresetWork] = useState('25');
  const [newPresetBreak, setNewPresetBreak] = useState('5');
  const [newPresetLongBreak, setNewPresetLongBreak] = useState('15');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePresetChange = (index: number, field: keyof Preset, value: string | number) => {
    setEditingPresets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    editingPresets.forEach((preset, index) => {
      updatePreset(index, preset);
    });
    
    toast({
      title: 'Configurações salvas!',
      description: 'Os presets foram atualizados com sucesso.',
    });
    
    onOpenChange(false);
  };

  const handleAddPreset = () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o novo preset.',
        variant: 'destructive',
      });
      return;
    }

    const newPreset: Preset = {
      name: newPresetName,
      work: parseInt(newPresetWork) || 25,
      break: parseInt(newPresetBreak) || 5,
      longBreak: parseInt(newPresetLongBreak) || 15,
    };

    addCustomPreset(newPreset);
    setEditingPresets(prev => [...prev, newPreset]);
    
    setNewPresetName('');
    setNewPresetWork('25');
    setNewPresetBreak('5');
    setNewPresetLongBreak('15');
    
    toast({
      title: 'Preset adicionado!',
      description: `O preset "${newPresetName}" foi criado.`,
    });
  };

  const handleRemovePreset = (index: number) => {
    removePreset(index);
    setEditingPresets(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: 'Preset removido',
      description: 'O preset foi removido com sucesso.',
    });
  };

  const handleDeleteAllHistory = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Histórico excluído',
        description: 'Todas as sessões de foco foram removidas.',
      });
    } catch (error) {
      console.error('Error deleting history:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o histórico.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync editing presets when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setEditingPresets(presets);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Timer</DialogTitle>
          <DialogDescription>
            Personalize os tempos de foco e pausa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Presets */}
          {editingPresets.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Meus Presets</Label>
              
              {editingPresets.map((preset, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={preset.name}
                      onChange={(e) => handlePresetChange(index, 'name', e.target.value)}
                      className="font-medium max-w-[200px]"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemovePreset(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Foco (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={preset.work}
                        onChange={(e) => handlePresetChange(index, 'work', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pausa (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={preset.break}
                        onChange={(e) => handlePresetChange(index, 'break', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pausa Longa (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={preset.longBreak}
                        onChange={(e) => handlePresetChange(index, 'longBreak', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Preset */}
          <div className="border-t pt-4 space-y-4">
            <Label className="text-base font-semibold">Criar Novo Preset</Label>
            
            <div className="space-y-3">
              <Input
                placeholder="Nome do preset"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Foco (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={newPresetWork}
                    onChange={(e) => setNewPresetWork(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pausa (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={newPresetBreak}
                    onChange={(e) => setNewPresetBreak(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pausa Longa (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={newPresetLongBreak}
                    onChange={(e) => setNewPresetLongBreak(e.target.value)}
                  />
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAddPreset}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Preset
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t pt-4 space-y-4">
            <Label className="text-base font-semibold text-destructive">Zona de Perigo</Label>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isDeleting}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Excluindo...' : 'Excluir Todo Histórico de Sessões'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todo o histórico?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá excluir permanentemente todas as suas sessões de foco registradas. 
                    Isso afetará seus relatórios e estatísticas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllHistory} className="bg-destructive hover:bg-destructive/90">
                    Excluir Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={editingPresets.length === 0}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
