import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle2, Circle, AlertCircle, Clock, MoreVertical, Trash2, Edit, BookText, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NoteDialog } from '@/components/notes/NoteDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/security';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  course_id: string | null;
  courses?: { name: string } | null;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  mood: string | null;
  course_id: string | null;
  created_at: string;
  courses?: { name: string } | null;
}

interface Course {
  id: string;
  name: string;
}

const priorityConfig = {
  urgent: { label: 'Urgente', icon: AlertCircle, class: 'text-destructive' },
  normal: { label: 'Normal', icon: Clock, class: 'text-warning' },
  low: { label: 'Baixa', icon: Circle, class: 'text-muted-foreground' },
};

const statusConfig = {
  pending: { label: 'Pendente', class: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em Andamento', class: 'bg-primary/10 text-primary' },
  completed: { label: 'Concluído', class: 'bg-success/10 text-success' },
};

const moodEmojis: Record<string, string> = {
  great: '😄',
  good: '😊',
  neutral: '😐',
  tired: '😴',
  frustrated: '😤',
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [tasksResult, notesResult, coursesResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, courses(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('study_notes')
        .select('*, courses(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    if (tasksResult.data) setTasks(tasksResult.data);
    if (notesResult.data) setNotes(notesResult.data);
    if (coursesResult.data) setCourses(coursesResult.data);
    
    setIsLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', task.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Tarefa excluída' });
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from('study_notes').delete().eq('id', noteId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast({ title: 'Nota excluída' });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskTitle.trim()) return;

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: taskTitle.trim(),
      description: taskDescription || null,
      priority: taskPriority,
      course_id: taskCourseId || null,
      due_date: taskDueDate || null,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tarefa criada!' });
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('normal');
      setTaskCourseId('');
      setTaskDueDate('');
      setShowTaskDialog(false);
      fetchData();
    }
  };

  const filterTasks = (status?: string) => {
    let filtered = tasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (status === 'urgent') {
      filtered = filtered.filter(t => t.priority === 'urgent' && t.status !== 'completed');
    } else if (status === 'in_progress') {
      filtered = filtered.filter(t => t.status === 'in_progress');
    } else if (status === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }

    return filtered;
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Tarefas & Diário</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Organize suas atividades e registre seus aprendizados
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10" onClick={() => {
            setEditingNote(null);
            setShowNoteDialog(true);
          }}>
            <BookText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Nova</span> Nota
          </Button>
          <Button className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10" onClick={() => setShowTaskDialog(true)}>
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Nova</span> Tarefa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.completed}/{stats.total}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Concluídas</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-destructive/10 p-1.5 sm:p-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.urgent}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Urgentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-warning/10 p-1.5 sm:p-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-success/10 p-1.5 sm:p-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Progresso</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto">
          <TabsTrigger value="tasks" className="flex-1 sm:flex-none text-xs sm:text-sm">Tarefas</TabsTrigger>
          <TabsTrigger value="diary" className="flex-1 sm:flex-none text-xs sm:text-sm">Diário de Estudos</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Tabs defaultValue="all">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="mb-4 min-w-max">
                <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
                <TabsTrigger value="urgent" className="text-xs sm:text-sm">Urgentes</TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs sm:text-sm">Em Andamento</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">Concluídas</TabsTrigger>
              </TabsList>
            </div>

            {['all', 'urgent', 'in_progress', 'completed'].map(status => (
              <TabsContent key={status} value={status} className="space-y-2 sm:space-y-3">
                {filterTasks(status === 'all' ? undefined : status).map(task => {
                  const PriorityIcon = priorityConfig[task.priority as keyof typeof priorityConfig]?.icon || Circle;
                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        "transition-all duration-200 hover:shadow-md",
                        task.status === 'completed' && "opacity-60"
                      )}
                    >
                      <CardContent className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                        <button onClick={() => toggleTaskStatus(task)} className="shrink-0">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                          ) : (
                            <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm sm:text-base truncate",
                            task.status === 'completed' && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          {task.courses?.name && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{task.courses.name}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                          <div className={cn("flex items-center gap-0.5 sm:gap-1", priorityConfig[task.priority as keyof typeof priorityConfig]?.class)}>
                            <PriorityIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs hidden sm:inline">{priorityConfig[task.priority as keyof typeof priorityConfig]?.label}</span>
                          </div>
                          {task.due_date && (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2", statusConfig[task.status as keyof typeof statusConfig]?.class)}>
                              {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filterTasks(status === 'all' ? undefined : status).length === 0 && (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">Nenhuma tarefa encontrada</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Diary Tab */}
        <TabsContent value="diary" className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Nenhuma nota encontrada</p>
              <Button onClick={() => {
                setEditingNote(null);
                setShowNoteDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Nota
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notes.filter(note => 
                note.title.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(note => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {note.mood && (
                          <span className="text-xl">{moodEmojis[note.mood]}</span>
                        )}
                        <h4 className="font-medium line-clamp-1">{note.title}</h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingNote(note);
                            setShowNoteDialog(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteNote(note.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {note.content && (
                      <div 
                        className="text-sm text-muted-foreground line-clamp-3 prose prose-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
                      />
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {note.courses?.name && (
                        <Badge variant="secondary" className="text-xs">
                          {note.courses.name}
                        </Badge>
                      )}
                      <span>
                        {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Crie uma nova tarefa para organizar seus estudos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título *</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ex: Estudar capítulo 5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Descrição</Label>
              <Input
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Detalhes da tarefa..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de vencimento</Label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Curso relacionado</Label>
              <Select value={taskCourseId || "none"} onValueChange={(val) => setTaskCourseId(val === "none" ? "" : val)}>
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
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!taskTitle.trim()}>
                Criar Tarefa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <NoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        onSuccess={fetchData}
        editNote={editingNote}
      />
    </div>
  );
}
