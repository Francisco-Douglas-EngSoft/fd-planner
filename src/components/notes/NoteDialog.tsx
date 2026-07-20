import { useState, useEffect } from 'react';
import { Smile, Meh, Frown, Zap, Heart } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from './RichTextEditor';
import type { NoteFolder } from './FolderSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  name: string;
}

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editNote?: {
    id: string;
    title: string;
    content: string;
    mood: string | null;
    course_id: string | null;
    folder_id?: string | null;
  } | null;
  folders?: NoteFolder[];
  defaultFolderId?: string | null;
}

const moods = [
  { value: 'great', label: 'Ótimo', icon: Zap, color: 'text-success' },
  { value: 'good', label: 'Bem', icon: Heart, color: 'text-primary' },
  { value: 'neutral', label: 'Neutro', icon: Meh, color: 'text-muted-foreground' },
  { value: 'tired', label: 'Cansado', icon: Frown, color: 'text-warning' },
  { value: 'frustrated', label: 'Frustrado', icon: Frown, color: 'text-destructive' },
];

export function NoteDialog({ open, onOpenChange, onSuccess, editNote, folders = [], defaultFolderId = null }: NoteDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchCourses();
      if (editNote) {
        setTitle(editNote.title);
        setContent(editNote.content || '');
        setMood(editNote.mood || '');
        setCourseId(editNote.course_id || '');
        setFolderId(editNote.folder_id || '');
      } else {
        setTitle('');
        setContent('');
        setMood('');
        setCourseId('');
        setFolderId(defaultFolderId || '');
      }
    }
  }, [open, user, editNote, defaultFolderId]);

  const fetchCourses = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('courses')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    if (data) {
      setCourses(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setIsLoading(true);

    try {
      const noteData: Record<string, unknown> = {
        user_id: user.id,
        title: title.trim(),
        content,
        mood: mood || null,
        course_id: courseId || null,
        folder_id: folderId || null,
      };

      if (editNote) {
        const { error } = await supabase
          .from('study_notes')
          .update(noteData as never)
          .eq('id', editNote.id);

        if (error) throw error;

        toast({
          title: 'Nota atualizada!',
          description: 'Suas anotações foram salvas.',
        });
      } else {
        const { error } = await supabase
          .from('study_notes')
          .insert(noteData as never);

        if (error) throw error;

        toast({
          title: 'Nota criada!',
          description: 'Sua anotação foi salva no diário.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editNote ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
          <DialogDescription>
            Registre suas reflexões, insights e aprendizados
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Resumo sobre Hooks"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Como você está se sentindo?</Label>
            <div className="flex gap-2">
              {moods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(mood === m.value ? '' : m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                      mood === m.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", m.color)} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Curso relacionado</Label>
            <Select value={courseId || "none"} onValueChange={(val) => setCourseId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum curso selecionado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {folders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="folder">Pasta</Label>
              <Select value={folderId || 'none'} onValueChange={(val) => setFolderId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5" style={{ backgroundColor: f.color || '#64748b' }} />
                        {f.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Escreva suas anotações, reflexões e insights..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? 'Salvando...' : editNote ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
