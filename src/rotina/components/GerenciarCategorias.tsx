import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import type { RotinaEstado } from '../hooks';
import type { RotinaCategoria } from '../tipos';
import { categoriaSchema } from '../api';

function LinhaCategoria({ categoria, rotina, usos }: { categoria: RotinaCategoria; rotina: RotinaEstado; usos: number }) {
  const { toast } = useToast();
  const [nome, setNome] = useState(categoria.nome);
  useEffect(() => setNome(categoria.nome), [categoria.nome]);

  const salvarNome = () => {
    const r = categoriaSchema.shape.nome.safeParse(nome);
    if (!r.success) {
      toast({ title: 'Nome inválido', description: r.error.issues[0]?.message, variant: 'destructive' });
      setNome(categoria.nome);
      return;
    }
    if (r.data !== categoria.nome) rotina.acoes.atualizarCategoria(categoria.id, { nome: r.data });
  };

  return (
    <li className="flex items-center gap-2">
      <Label htmlFor={`cor-${categoria.id}`} className="sr-only">Cor de {categoria.nome}</Label>
      <input
        id={`cor-${categoria.id}`}
        type="color"
        value={categoria.cor}
        onChange={(e) => rotina.acoes.atualizarCategoria(categoria.id, { cor: e.target.value.toUpperCase() })}
        className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1 md:h-9 md:w-9"
      />
      <Label htmlFor={`nome-cat-${categoria.id}`} className="sr-only">Nome da categoria</Label>
      <Input
        id={`nome-cat-${categoria.id}`}
        value={nome}
        maxLength={60}
        onChange={(e) => setNome(e.target.value)}
        onBlur={salvarNome}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-11 md:h-9"
      />
      <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
        {usos} {usos === 1 ? 'tarefa' : 'tarefas'}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive md:h-9 md:w-9" aria-label={`Remover categoria ${categoria.nome}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a categoria “{categoria.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {usos > 0 ? `${usos} ${usos === 1 ? 'tarefa ficará' : 'tarefas ficarão'} sem categoria.` : 'Nenhuma tarefa usa esta categoria.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => rotina.acoes.removerCategoria(categoria.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function GerenciarCategorias({ rotina }: { rotina: RotinaEstado }) {
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#2D7FF9');

  const usos = (id: string) => rotina.tarefas.filter((t) => t.categoria_id === id).length;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = categoriaSchema.safeParse({ nome, cor: cor.toUpperCase() });
    if (!r.success) {
      toast({ title: 'Confira os dados', description: r.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    rotina.acoes.criarCategoria(r.data as { nome: string; cor: string });
    setNome('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {rotina.categorias.map((c) => (
            <LinhaCategoria key={c.id} categoria={c} rotina={rotina} usos={usos(c.id)} />
          ))}
        </ul>
        <form onSubmit={enviar} className="flex items-center gap-2 border-t pt-3" aria-label="Nova categoria">
          <Label htmlFor="nova-cat-cor" className="sr-only">Cor da nova categoria</Label>
          <input
            id="nova-cat-cor"
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1 md:h-9 md:w-9"
          />
          <Label htmlFor="nova-cat-nome" className="sr-only">Nome da nova categoria</Label>
          <Input id="nova-cat-nome" placeholder="Nova categoria" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 md:h-9" />
          <Button type="submit" variant="outline" className="h-11 shrink-0 md:h-9">
            <Plus className="mr-1 h-4 w-4" /> Criar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
