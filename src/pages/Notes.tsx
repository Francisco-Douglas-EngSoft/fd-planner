import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileText, Calendar, Tag, BookOpen, MoreVertical, Edit, Trash2, StickyNote, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NoteDialog } from '@/components/notes/NoteDialog';
import { FolderSidebar, type NoteFolder } from '@/components/notes/FolderSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/QueryState';

interface Note {
  id: string;
  title: string;
  content: string | null;
  course_id: string | null;
  folder_id?: string | null;
  tags: string[] | null;
  mood: string | null;
  created_at: string;
  updated_at: string;
  courses?: {
    name: string;
  } | null;
}

const moodEmojis: Record<string, string> = {
  'focused': '🎯',
  'confused': '🤔',
  'excited': '🚀',
  'tired': '😴',
  'neutral': '😐',
};

const PAGE_SIZE = 12;

export default function Notes() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Cache (react-query) + paginação em blocos de 500 linhas no servidor,
  // evitando o limite padrão de 1000 registros do Supabase.
  const notesQuery = useQuery({
    queryKey: ['study_notes', user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () =>
      (await fetchAllPaginated<Note>(
        () =>
          supabase
            .from('study_notes')
            .select('*, courses (name)')
            .eq('user_id', user!.id)
            .order('updated_at', { ascending: false }) as never,
      )) as Note[],
  });

  const foldersQuery = useQuery({
    queryKey: ['note_folders', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('note_folders')
        .select('id, name, color')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw new Error(error.message);
      return (data || []) as NoteFolder[];
    },
  });

  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const folders = foldersQuery.data ?? [];
  const isLoading = notesQuery.isLoading;

  const fetchNotes = () => qc.invalidateQueries({ queryKey: ['study_notes', user?.id] });
  const fetchFolders = () => qc.invalidateQueries({ queryKey: ['note_folders', user?.id] });
  const setNotes = (updater: (prev: Note[]) => Note[]) =>
    qc.setQueryData(['study_notes', user?.id], (prev: Note[] | undefined) => updater(prev ?? []));

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('study_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast({
        title: 'Nota excluída',
        description: 'A nota foi removida com sucesso.',
      });
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    const { error } = await (supabase as any)
      .from('study_notes')
      .update({ folder_id: folderId })
      .eq('id', noteId);
    if (error) {
      toast({ title: 'Erro ao mover', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, folder_id: folderId } : n)));
    toast({ title: 'Nota movida' });
  };

  const handleEdit = (note: Note) => {
    setEditNote(note);
    setShowNoteDialog(true);
  };

  // Get all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));

    const matchesFolder =
      selectedFolderId === 'all' ? true :
      selectedFolderId === null ? note.folder_id === null :
      note.folder_id === selectedFolderId;

    return matchesSearch && matchesTag && matchesFolder;
  });

  const folderCounts = notes.reduce<Record<string, number>>((acc, n) => {
    if (n.folder_id) acc[n.folder_id] = (acc[n.folder_id] || 0) + 1;
    return acc;
  }, {});
  const uncategorizedCount = notes.filter((n) => !n.folder_id).length;

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '—';
    return format(date, "dd MMM yyyy, HH:mm", { locale: ptBR });
  };

  const getExcerpt = (content: string | null) => {
    if (!content) return 'Sem conteúdo...';
    // Strip HTML tags and get first 150 chars
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  const sanitizeContent = (content: string | null) => {
    if (!content) return '';
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'hr', 'span', 'div', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style'],
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-primary bg-clip-text text-transparent">
            Notas de Estudo
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Organize suas anotações em pastas, com formatação profissional, imagens e código
          </p>
        </div>
        <Button 
          className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
          onClick={() => {
            setEditNote(null);
            setShowNoteDialog(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Nota
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelect={setSelectedFolderId}
          counts={folderCounts}
          totalCount={notes.length}
          uncategorizedCount={uncategorizedCount}
          onRefresh={fetchFolders}
        />

        <div className="flex-1 min-w-0 space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90"
              onClick={() => setSelectedTag(null)}
            >
              Todas
            </Badge>
            {allTags.slice(0, 5).map(tag => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/90"
                onClick={() => setSelectedTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded-full w-16" />
                  <div className="h-5 bg-muted rounded-full w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2 bg-gradient-to-br from-card to-muted/20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
            <StickyNote className="h-8 w-8 text-primary-foreground" />
          </div>
          <h4 className="font-bold text-lg mb-2">
            {searchQuery || selectedTag ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada'}
          </h4>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            {searchQuery || selectedTag 
              ? 'Tente ajustar os filtros de busca' 
              : 'Comece a documentar seu aprendizado criando sua primeira nota'
            }
          </p>
          {!searchQuery && !selectedTag && (
            <Button 
              className="bg-gradient-primary hover:opacity-90 shadow-glow"
              onClick={() => {
                setEditNote(null);
                setShowNoteDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira nota
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredNotes.map((note, index) => (
            <Card 
              key={note.id}
              className="group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden border-0 shadow-card"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleEdit(note)}
            >
              <div className="h-1.5 bg-gradient-primary" />
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {note.mood && moodEmojis[note.mood] && (
                      <span className="text-2xl shrink-0">{moodEmojis[note.mood]}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors mb-1">
                        {note.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(note.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                          <FolderInput className="h-4 w-4 mr-2" />
                          Mover para
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); moveNoteToFolder(note.id, null); }}>
                            Sem categoria
                          </DropdownMenuItem>
                          {folders.length > 0 && <DropdownMenuSeparator />}
                          {folders.map((f) => (
                            <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); moveNoteToFolder(note.id, f.id); }}>
                              <span className="h-2.5 w-2.5 mr-2" style={{ backgroundColor: f.color || '#64748b' }} />
                              {f.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content Preview */}
                {note.content && (
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground line-clamp-6 whitespace-pre-wrap
                               prose-headings:text-foreground prose-headings:font-semibold prose-headings:mb-2
                               prose-p:my-2 prose-p:leading-relaxed
                               prose-strong:text-foreground prose-strong:font-semibold
                               prose-ul:my-2 prose-ol:my-2 prose-li:my-1
                               prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                               prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                               prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeContent(note.content) }}
                  />
                )}

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
                  {note.courses && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="truncate font-medium">{note.courses.name}</span>
                    </div>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      {note.tags.slice(0, 4).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                          +{note.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {notes.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{notes.length} nota{notes.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>{allTags.length} tag{allTags.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Note Dialog */}
      <NoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        onSuccess={fetchNotes}
        editNote={editNote}
        folders={folders}
        defaultFolderId={selectedFolderId && selectedFolderId !== 'all' ? selectedFolderId : null}
      />
    </div>
  );
}
