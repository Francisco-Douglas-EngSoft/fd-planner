import { useState } from 'react';
import { FolderPlus, Folder, FolderOpen, Inbox, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NoteFolder {
  id: string;
  name: string;
  color: string | null;
}

const PALETTE = ['#64748b', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

interface Props {
  folders: NoteFolder[];
  selectedFolderId: string | null | 'all';
  onSelect: (id: string | null | 'all') => void;
  counts: Record<string, number>;
  totalCount: number;
  uncategorizedCount: number;
  onRefresh: () => void;
}

export function FolderSidebar({
  folders, selectedFolderId, onSelect, counts, totalCount, uncategorizedCount, onRefresh,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoteFolder | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(PALETTE[0]);
    setOpen(true);
  };
  const openEdit = (f: NoteFolder) => {
    setEditing(f);
    setName(f.name);
    setColor(f.color || PALETTE[0]);
    setOpen(true);
  };

  const save = async () => {
    if (!user || !name.trim()) return;
    if (editing) {
      const { error } = await (supabase as any).from('note_folders').update({ name: name.trim(), color }).eq('id', editing.id);
      if (error) return toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await (supabase as any).from('note_folders').insert({ user_id: user.id, name: name.trim(), color });
      if (error) return toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    }
    setOpen(false);
    onRefresh();
  };

  const remove = async (f: NoteFolder) => {
    if (!confirm(`Excluir a pasta "${f.name}"? As notas serão movidas para "Sem categoria".`)) return;
    const { error } = await (supabase as any).from('note_folders').delete().eq('id', f.id);
    if (error) return toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    if (selectedFolderId === f.id) onSelect('all');
    onRefresh();
  };

  const Item = ({
    active, onClick, icon, label, count, dot, actions,
  }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
    count: number; dot?: string | null; actions?: React.ReactNode;
  }) => (
    <div className={cn(
      'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-l-2',
      active ? 'bg-accent border-primary text-foreground' : 'border-transparent hover:bg-muted/60 text-muted-foreground',
    )} onClick={onClick}>
      {dot ? <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: dot }} /> : icon}
      <span className="flex-1 text-sm truncate">{label}</span>
      <span className="text-xs tabular-nums opacity-70">{count}</span>
      {actions}
    </div>
  );

  return (
    <>
      <aside className="w-full lg:w-64 shrink-0 border border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pastas</span>
          <Button size="icon-sm" variant="ghost" onClick={openCreate} title="Nova pasta">
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="py-1">
          <Item
            active={selectedFolderId === 'all'}
            onClick={() => onSelect('all')}
            icon={<FolderOpen className="h-4 w-4" />}
            label="Todas as notas"
            count={totalCount}
          />
          <Item
            active={selectedFolderId === null}
            onClick={() => onSelect(null)}
            icon={<Inbox className="h-4 w-4" />}
            label="Sem categoria"
            count={uncategorizedCount}
          />
          {folders.map((f) => (
            <Item
              key={f.id}
              active={selectedFolderId === f.id}
              onClick={() => onSelect(f.id)}
              icon={<Folder className="h-4 w-4" />}
              label={f.name}
              count={counts[f.id] || 0}
              dot={f.color}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => openEdit(f)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(f)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          ))}
        </div>
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Renomear pasta' : 'Nova pasta'}</DialogTitle>
            <DialogDescription>Organize suas notas por categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Programação" autoFocus />
            <div>
              <div className="text-xs text-muted-foreground mb-2">Cor</div>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn('h-7 w-7 border-2 transition-all', color === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim()}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}