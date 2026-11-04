import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Brain,
  Layers,
  Sparkles,
  LayoutDashboard,
  Target,
  Timer,
  ListChecks,
  Trophy,
  Settings as SettingsIcon,
  FileText,
} from "lucide-react";

interface Result {
  id: string;
  label: string;
  hint?: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Result[] = [
  { id: "n-dash", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { id: "n-focus", label: "Foco", to: "/foco", icon: Timer },
  { id: "n-plan", label: "Planejamentos", to: "/planejamentos", icon: Target },
  { id: "n-tasks", label: "Tarefas", to: "/tarefas", icon: ListChecks },
  { id: "n-ach", label: "Conquistas", to: "/conquistas", icon: Trophy },
  { id: "n-lib", label: "Biblioteca", to: "/biblioteca", icon: BookOpen },
  { id: "n-ai", label: "Assistente IA", to: "/assistente", icon: Sparkles },
  { id: "n-set", label: "Configurações", to: "/configuracoes", icon: SettingsIcon },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dynamic, setDynamic] = useState<Result[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !user || query.trim().length < 2) {
      setDynamic([]);
      return;
    }
    const q = query.trim();
    const like = `%${q}%`;
    (async () => {
      const [books, notes] = await Promise.all([
        supabase.from("books").select("id, title").ilike("title", like).eq("user_id", user.id).limit(5),
        supabase.from("study_notes").select("id, title").ilike("title", like).eq("user_id", user.id).limit(5),
      ]);
      const rs: Result[] = [];
      books.data?.forEach((b) => rs.push({ id: `b-${b.id}`, label: b.title, hint: "Livro", to: `/leitor/${b.id}`, icon: BookOpen }));
      notes.data?.forEach((n) => rs.push({ id: `n-${n.id}`, label: n.title, hint: "Nota", to: `/notas`, icon: FileText }));
      setDynamic(rs);
    })();
  }, [query, open, user]);

  function go(to: string) {
    setOpen(false);
    setQuery("");
    navigate(to);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar (Ctrl+K)…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        {dynamic.length > 0 && (
          <CommandGroup heading="Seus itens">
            {dynamic.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.to)}>
                <r.icon className="h-4 w-4 mr-2" />
                <span className="flex-1 truncate">{r.label}</span>
                {r.hint && <span className="text-[10px] text-muted-foreground ml-2">{r.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Navegar">
          {NAV.map((r) => (
            <CommandItem key={r.id} onSelect={() => go(r.to)}>
              <r.icon className="h-4 w-4 mr-2" />
              {r.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}