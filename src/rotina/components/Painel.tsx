import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, CalendarCheck, Download, Flame, TrendingUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import type { RotinaEstado } from '../hooks';
import {
  calcularStreak,
  estatisticasDoPeriodo,
  gerarCsv,
  indexarConclusoes,
  maiorSequencia,
  resumoPorCategoria,
  resumosDoIntervalo,
} from '../calculos';
import { formatarDataBR, formatarDiaMes, somarDias } from '../datas';
import { MapaCalor } from './MapaCalor';

type Periodo = 'semana' | 'mes';
const DIAS: Record<Periodo, number> = { semana: 7, mes: 30 };

function Indicador({ icone: Icone, titulo, valor, detalhe }: { icone: typeof Award; titulo: string; valor: string; detalhe?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icone className="h-4 w-4" aria-hidden />
          {titulo}
        </div>
        <p className="mt-1.5 text-2xl font-bold font-display tabular-nums">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

const pct = (v: number | null) => (v == null ? '—' : `${v}%`);

export function Painel({ rotina }: { rotina: RotinaEstado }) {
  const { toast } = useToast();
  const { tarefas, categorias, conclusoes, hoje, desde } = rotina;
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  const idx = useMemo(() => indexarConclusoes(conclusoes), [conclusoes]);
  const historico = useMemo(() => resumosDoIntervalo(tarefas, idx, desde, hoje), [tarefas, idx, desde, hoje]);
  const ultimos = (n: number) => historico.slice(-n);

  const est7 = estatisticasDoPeriodo(ultimos(7));
  const est30 = estatisticasDoPeriodo(ultimos(30));
  const streak = calcularStreak(historico, hoje);
  const recorde = maiorSequencia(historico);

  const n = DIAS[periodo];
  const de = somarDias(hoje, -(n - 1));
  const resumosPeriodo = ultimos(n);
  const dadosGrafico = resumosPeriodo.map((r) => ({ dia: formatarDiaMes(r.data), data: r.data, percentual: r.percentual ?? 0, semTarefas: r.percentual == null }));
  const porCategoria = useMemo(() => resumoPorCategoria(tarefas, categorias, idx, de, hoje), [tarefas, categorias, idx, de, hoje]);

  const exportar = () => {
    const csv = gerarCsv(tarefas, categorias, conclusoes.filter((c) => c.data >= de && c.data <= hoje), de, hoje);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotina_${de}_a_${hoje}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Relatório exportado', description: `${formatarDataBR(de)} a ${formatarDataBR(hoje)}` });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Indicador icone={TrendingUp} titulo="Média semanal" valor={pct(est7.media)} detalhe="últimos 7 dias" />
        <Indicador icone={TrendingUp} titulo="Média mensal" valor={pct(est30.media)} detalhe="últimos 30 dias" />
        <Indicador
          icone={Award}
          titulo="Melhor dia"
          valor={est30.melhorDia ? pct(est30.melhorDia.percentual) : '—'}
          detalhe={est30.melhorDia ? formatarDataBR(est30.melhorDia.data) : 'últimos 30 dias'}
        />
        <Indicador icone={CalendarCheck} titulo="Dias 100%" valor={String(est30.diasCompletos)} detalhe={`de ${est30.diasComTarefas} dias (30 dias)`} />
        <Indicador icone={Flame} titulo="Sequência atual" valor={String(streak)} detalhe={streak === 1 ? 'dia seguido' : 'dias seguidos'} />
        <Indicador icone={Trophy} titulo="Recorde" valor={String(recorde)} detalhe="maior sequência no ano" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={periodo}
          onValueChange={(v) => v && setPeriodo(v as Periodo)}
          className="rounded-lg bg-muted p-1"
          aria-label="Período"
        >
          <ToggleGroupItem value="semana" className="h-10 px-4 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm">Semana</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="h-10 px-4 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm">Mês</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" className="h-11" onClick={exportar}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV ({periodo === 'semana' ? '7 dias' : '30 dias'})
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conclusão por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56" role="img" aria-label={`Gráfico de conclusão diária: ${resumosPeriodo.map((r) => `${formatarDiaMes(r.data)} ${pct(r.percentual)}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit="%" className="text-muted-foreground" />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(v: number, _n, item) => [(item?.payload as { semTarefas?: boolean })?.semTarefas ? 'sem tarefas' : `${v}%`, 'Concluído']}
                  />
                  <Bar dataKey="percentual" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {dadosGrafico.map((d) => (
                      <Cell key={d.data} fill={d.percentual === 100 ? 'hsl(var(--success))' : 'hsl(var(--accent))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {porCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem tarefas no período.</p>
            ) : (
              <ul className="space-y-3">
                {porCategoria.map((c) => (
                  <li key={c.categoria?.id ?? 'sem'}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.categoria?.cor ?? 'hsl(var(--muted-foreground))' }} aria-hidden />
                        <span className="truncate">{c.categoria?.nome ?? 'Sem categoria'}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {c.concluidas}/{c.total} · <strong className="text-foreground">{pct(c.percentual)}</strong>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                        style={{ width: `${c.percentual ?? 0}%`, backgroundColor: c.categoria?.cor ?? 'hsl(var(--muted-foreground))' }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimos 90 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <MapaCalor resumos={ultimos(90)} hoje={hoje} />
        </CardContent>
      </Card>
    </div>
  );
}
