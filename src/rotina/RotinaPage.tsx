import { useEffect, useState } from 'react';
import { BarChart3, CalendarCheck2, ListChecks, LogIn, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useRotina } from './hooks';
import { TelaHoje } from './components/TelaHoje';
import { GerenciarTarefas } from './components/GerenciarTarefas';
import { Painel } from './components/Painel';

type Aba = 'hoje' | 'tarefas' | 'painel';

export default function RotinaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rotina = useRotina(user?.id);
  const [aba, setAba] = useState<Aba>('hoje');
  const [data, setData] = useState(rotina.hoje);

  // Ao virar o dia, a tela "Hoje" acompanha a nova data.
  const [hojeAnterior, setHojeAnterior] = useState(rotina.hoje);
  useEffect(() => {
    if (rotina.hoje !== hojeAnterior) {
      if (data === hojeAnterior) setData(rotina.hoje);
      setHojeAnterior(rotina.hoje);
    }
  }, [rotina.hoje, hojeAnterior, data]);

  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="Entre para usar a Rotina Diária"
        description="A rotina fica salva na sua conta para você acompanhar o progresso em qualquer aparelho."
        actionLabel="Entrar"
        onAction={() => navigate('/auth')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <CalendarCheck2 className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Rotina Diária</h1>
          <p className="text-sm text-muted-foreground">Seus hábitos do dia, um passo de cada vez.</p>
        </div>
      </header>

      {rotina.carregando ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : rotina.erro && rotina.tarefas.length === 0 ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-medium">Não foi possível carregar sua rotina.</p>
          <p className="mt-1 text-sm text-muted-foreground">{rotina.erro instanceof Error ? rotina.erro.message : ''}</p>
          <Button className="mt-4 h-11" variant="outline" onClick={rotina.recarregar}>Tentar de novo</Button>
        </div>
      ) : (
        <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
          <TabsList className="grid h-12 w-full grid-cols-3 sm:inline-grid sm:w-auto">
            <TabsTrigger value="hoje" className="h-10 gap-1.5 px-4"><Sun className="h-4 w-4" aria-hidden />Hoje</TabsTrigger>
            <TabsTrigger value="tarefas" className="h-10 gap-1.5 px-4"><ListChecks className="h-4 w-4" aria-hidden />Tarefas</TabsTrigger>
            <TabsTrigger value="painel" className="h-10 gap-1.5 px-4"><BarChart3 className="h-4 w-4" aria-hidden />Painel</TabsTrigger>
          </TabsList>
          <TabsContent value="hoje" className="mt-4">
            <TelaHoje rotina={rotina} data={data} onDataChange={setData} onIrParaTarefas={() => setAba('tarefas')} />
          </TabsContent>
          <TabsContent value="tarefas" className="mt-4">
            <GerenciarTarefas rotina={rotina} />
          </TabsContent>
          <TabsContent value="painel" className="mt-4">
            <Painel rotina={rotina} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
