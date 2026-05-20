import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Calendar, CheckSquare, StickyNote, Clock, X } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'course' | 'plan' | 'task' | 'note';
  title: string;
  subtitle?: string;
  url: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!user || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchLower = `%${searchQuery.toLowerCase()}%`;

      // Search courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name, category')
        .eq('user_id', user.id)
        .ilike('name', searchLower)
        .limit(5);

      // Search study plans
      const { data: plans } = await supabase
        .from('study_plans')
        .select('id, name, description')
        .eq('user_id', user.id)
        .ilike('name', searchLower)
        .limit(5);

      // Search tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('user_id', user.id)
        .ilike('title', searchLower)
        .limit(5);

      // Search notes
      const { data: notes } = await supabase
        .from('study_notes')
        .select('id, title')
        .eq('user_id', user.id)
        .ilike('title', searchLower)
        .limit(5);

      const allResults: SearchResult[] = [
        ...(courses || []).map(c => ({
          id: c.id,
          type: 'course' as const,
          title: c.name,
          subtitle: c.category || 'Curso',
          url: '/cursos',
        })),
        ...(plans || []).map(p => ({
          id: p.id,
          type: 'plan' as const,
          title: p.name,
          subtitle: p.description || 'Planejamento',
          url: '/planejamentos',
        })),
        ...(tasks || []).map(t => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          subtitle: t.status === 'completed' ? 'Concluída' : 'Pendente',
          url: '/tarefas',
        })),
        ...(notes || []).map(n => ({
          id: n.id,
          type: 'note' as const,
          title: n.title,
          subtitle: 'Nota',
          url: '/notas',
        })),
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(result.url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'plan': return Calendar;
      case 'task': return CheckSquare;
      case 'note': return StickyNote;
      default: return Search;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Curso';
      case 'plan': return 'Planejamento';
      case 'task': return 'Tarefa';
      case 'note': return 'Nota';
      default: return type;
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Buscar cursos, planejamentos, tarefas, notas..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isSearching && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin mx-auto mb-2" />
              Buscando...
            </div>
          )}
          
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>
              Nenhum resultado encontrado para "{query}"
            </CommandEmpty>
          )}

          {!isSearching && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}

          {Object.entries(groupedResults).map(([type, items], index) => (
            <div key={type}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={getTypeLabel(type) + 's'}>
                {items.map((result) => {
                  const Icon = getIcon(result.type);
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={result.title}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className={cn(
                        "p-1.5 rounded-md",
                        result.type === 'course' && "bg-primary/10",
                        result.type === 'plan' && "bg-accent/10",
                        result.type === 'task' && "bg-success/10",
                        result.type === 'note' && "bg-warning/10",
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          result.type === 'course' && "text-primary",
                          result.type === 'plan' && "text-accent",
                          result.type === 'task' && "text-success",
                          result.type === 'note' && "text-warning",
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
