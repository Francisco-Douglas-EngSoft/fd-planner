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
import { FileText, Sparkles } from 'lucide-react';
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
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          "w-[95vw] sm:w-[85vw] lg:w-[70vw] xl:w-[70vw]",
          "!max-w-[1400px] sm:!max-w-[1400px] h-[85vh] sm:h-[80vh] sm:!max-h-[85vh]"
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg">
                  {editNote ? 'Editar Nota' : 'Nova Nota'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Registre reflexões, insights e aprendizados com formatação profissional
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body: sidebar + editor */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr] overflow-hidden">
            {/* Sidebar metadata */}
            <aside className="border-b lg:border-b-0 lg:border-r bg-muted/20 p-5 space-y-5 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Título *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Resumo sobre Hooks"
                  required
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Humor
                </Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {moods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(mood === m.value ? '' : m.value)}
                        title={m.label}
                        className={cn(
                          "flex flex-col items-center gap-1 py-2 border transition-all",
                          mood === m.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 bg-background"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", m.color)} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Curso relacionado
                </Label>
                <Select value={courseId || "none"} onValueChange={(val) => setCourseId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
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
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pasta
                  </Label>
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

              <div className="pt-2 border-t">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>Use a barra de ferramentas para títulos, código, imagens e mais.</span>
                </div>
              </div>
            </aside>

            {/* Editor */}
            <section className="flex flex-col min-h-0 overflow-hidden bg-background">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Comece a escrever suas anotações, reflexões e insights..."
              />
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {content ? `${content.replace(/<[^>]+>/g, '').length} caracteres` : 'Rascunho vazio'}
            </p>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim()}>
                {isLoading ? 'Salvando...' : editNote ? 'Atualizar nota' : 'Salvar nota'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
