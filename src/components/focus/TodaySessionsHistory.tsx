import { useState, useEffect } from 'react';
import { Clock, BookOpen, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FocusSession {
  id: string;
  duration_minutes: number;
  completed_at: string;
  course_id: string | null;
  course?: {
    name: string;
  } | null;
}

export function TodaySessionsHistory() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTodaySessions = async () => {
    if (!user) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('focus_sessions')
      .select(`
        id,
        duration_minutes,
        completed_at,
        course_id,
        courses (name)
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'work')
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString())
      .order('completed_at', { ascending: false });

    if (!error && data) {
      setSessions(data.map((s: any) => ({
        ...s,
        course: Array.isArray(s.courses) ? s.courses[0] || null : s.courses || null
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTodaySessions();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('focus_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchTodaySessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('focus_sessions')
      .delete()
      .eq('id', sessionId);

    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    }
  };

  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            Sessões de Hoje
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs">
            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        {sessions.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">Nenhuma sessão registrada hoje</p>
            <p className="text-[10px] sm:text-xs mt-1">Inicie o timer para começar!</p>
          </div>
        ) : (
          <ScrollArea className="h-[150px] sm:h-[200px] pr-2 sm:pr-3">
            <div className="space-y-1.5 sm:space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-md bg-primary/10 shrink-0">
                      <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {session.course?.name || 'Sem curso'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(session.completed_at), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                      {session.duration_minutes}min
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
