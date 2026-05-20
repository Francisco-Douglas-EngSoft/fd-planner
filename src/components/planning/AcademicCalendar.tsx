import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, Plus, Calendar, FileText, BookOpen, 
  AlertTriangle, CheckCircle, Trash2, Edit, Clock 
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AcademicEvent {
  id: string;
  study_plan_id: string;
  course_id: string | null;
  title: string;
  event_type: string;
  event_date: string;
  end_date: string | null;
  description: string | null;
  is_completed: boolean;
  priority: string;
  grade: number | null;
}

interface Course {
  id: string;
  name: string;
}

interface AcademicCalendarProps {
  planId: string;
  planCourses: Course[];
}

const eventTypeConfig: Record<string, { label: string; icon: typeof GraduationCap; color: string; bgColor: string }> = {
  exam: { label: 'Prova', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/20' },
  assignment: { label: 'Trabalho', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  review: { label: 'Revisão', icon: BookOpen, color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  presentation: { label: 'Apresentação', icon: GraduationCap, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/20' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-primary/20 text-primary' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-600' },
  critical: { label: 'Crítica', color: 'bg-red-500/20 text-red-600' },
};

export function AcademicCalendar({ planId, planCourses }: AcademicCalendarProps) {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<AcademicEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'exam',
    event_date: '',
    end_date: '',
    course_id: '',
    description: '',
    priority: 'normal',
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, [planId]);

  const fetchEvents = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('academic_events')
      .select('*')
      .eq('study_plan_id', planId)
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as AcademicEvent[]);
    }
    setIsLoading(false);
  };

  const openCreateDialog = () => {
    setEditEvent(null);
    setFormData({
      title: '',
      event_type: 'exam',
      event_date: '',
      end_date: '',
      course_id: '',
      description: '',
      priority: 'normal',
    });
    setShowDialog(true);
  };

  const openEditDialog = (event: AcademicEvent) => {
    setEditEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      event_date: event.event_date,
      end_date: event.end_date || '',
      course_id: event.course_id || '',
      description: event.description || '',
      priority: event.priority,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !formData.title || !formData.event_date) return;

    const payload = {
      user_id: user.id,
      study_plan_id: planId,
      title: formData.title,
      event_type: formData.event_type,
      event_date: formData.event_date,
      end_date: formData.end_date || null,
      course_id: formData.course_id || null,
      description: formData.description || null,
      priority: formData.priority,
    };

    if (editEvent) {
      const { error } = await supabase
        .from('academic_events')
        .update(payload)
        .eq('id', editEvent.id);
      if (error) {
        toast({ title: 'Erro ao atualizar evento', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('academic_events')
        .insert(payload);
      if (error) {
        toast({ title: 'Erro ao criar evento', variant: 'destructive' });
        return;
      }
    }

    toast({ title: editEvent ? 'Evento atualizado!' : 'Evento criado!' });
    setShowDialog(false);
    fetchEvents();
  };

  const toggleComplete = async (event: AcademicEvent) => {
    await supabase
      .from('academic_events')
      .update({ is_completed: !event.is_completed })
      .eq('id', event.id);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('academic_events').delete().eq('id', id);
    fetchEvents();
  };

  const today = new Date();
  const upcoming = events.filter(e => !e.is_completed && isAfter(parseISO(e.event_date), today));
  const overdue = events.filter(e => !e.is_completed && isBefore(parseISO(e.event_date), today));
  const completed = events.filter(e => e.is_completed);

  const getDaysUntil = (date: string) => {
    const d = parseISO(date);
    return isValid(d) ? differenceInDays(d, today) : 0;
  };

  const getCourseName = (courseId: string | null) => {
    if (!courseId) return null;
    return planCourses.find(c => c.id === courseId)?.name || null;
  };

  const renderEvent = (event: AcademicEvent) => {
    const config = eventTypeConfig[event.event_type] || eventTypeConfig.exam;
    const Icon = config.icon;
    const pConfig = priorityConfig[event.priority] || priorityConfig.normal;
    const daysUntil = getDaysUntil(event.event_date);
    const courseName = getCourseName(event.course_id);
    const isOverdue = !event.is_completed && daysUntil < 0;

    return (
      <div
        key={event.id}
        className={`p-3 rounded-xl border transition-all ${
          event.is_completed 
            ? 'bg-muted/30 border-border/30 opacity-60' 
            : isOverdue 
              ? 'bg-red-500/5 border-red-500/30' 
              : config.bgColor
        }`}
      >
        <div className="flex items-start gap-3">
          <button onClick={() => toggleComplete(event)} className="mt-0.5">
            {event.is_completed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary transition-colors" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className={`font-medium text-sm ${event.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                {event.title}
              </span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pConfig.color}`}>
                {pConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(event.event_date), "dd/MM/yyyy", { locale: ptBR })}
                {event.end_date && ` — ${format(parseISO(event.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
              </span>
              {courseName && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {courseName}
                </Badge>
              )}
              {!event.is_completed && (
                <span className={`text-[10px] font-medium ${
                  isOverdue ? 'text-red-500' : daysUntil <= 3 ? 'text-amber-500' : 'text-muted-foreground'
                }`}>
                  {isOverdue ? `${Math.abs(daysUntil)} dias atrasado` : daysUntil === 0 ? 'Hoje!' : `em ${daysUntil} dias`}
                </span>
              )}
              {event.grade !== null && (
                <Badge className="bg-green-500/20 text-green-600 text-[10px]">
                  Nota: {event.grade}
                </Badge>
              )}
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => openEditDialog(event)} className="p-1 hover:bg-muted rounded">
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => deleteEvent(event.id)} className="p-1 hover:bg-destructive/10 rounded">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-amber-500" />
          Calendário Acadêmico
        </h4>
        <Button variant="outline" size="sm" onClick={openCreateDialog} className="gap-1.5 text-xs rounded-lg">
          <Plus className="h-3.5 w-3.5" />
          Evento
        </Button>
      </div>

      {/* Summary Cards */}
      {events.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-red-500/10 text-center">
            <p className="text-lg font-bold text-red-500">{overdue.length}</p>
            <p className="text-[10px] text-muted-foreground">Atrasados</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-center">
            <p className="text-lg font-bold text-amber-500">{upcoming.length}</p>
            <p className="text-[10px] text-muted-foreground">Próximos</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-lg font-bold text-green-500">{completed.length}</p>
            <p className="text-[10px] text-muted-foreground">Concluídos</p>
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Atrasados ({overdue.length})
          </p>
          {overdue.map(renderEvent)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-500">Próximos ({upcoming.length})</p>
          {upcoming.map(renderEvent)}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Concluídos ({completed.length})</p>
          {completed.map(renderEvent)}
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center p-6 rounded-xl bg-muted/20 border border-dashed border-border/50">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum evento acadêmico</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Adicione provas, trabalhos e revisões</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEvent ? 'Editar Evento' : 'Novo Evento Acadêmico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Prova de Cálculo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.event_type} onValueChange={v => setFormData(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">🔴 Prova</SelectItem>
                    <SelectItem value="assignment">🔵 Trabalho</SelectItem>
                    <SelectItem value="review">🟡 Revisão</SelectItem>
                    <SelectItem value="presentation">🟣 Apresentação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.event_date} onChange={e => setFormData(p => ({ ...p, event_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data Final (revisão)</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            {planCourses.length > 0 && (
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select value={formData.course_id} onValueChange={v => setFormData(p => ({ ...p, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {planCourses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Detalhes do evento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.title || !formData.event_date}>
              {editEvent ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
