import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  Search,
  Mail,
  RefreshCw,
  Code2,
  UserPlus,
  Flame,
  Trophy,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { format, formatDistanceToNow, startOfMonth, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { AuthorshipNotice } from '@/components/legal/AuthorshipNotice';
import { cn } from '@/lib/utils';

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number | null;
  experience_points: number | null;
  total_study_hours: number | null;
  streak_days: number | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
}

type SortKey = 'recent' | 'hours' | 'level' | 'streak';

const initials = (name: string | null) =>
  (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tint,
  loading,
  index,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tint: string;
  readonly loading: boolean;
  readonly index: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="tint-card relative h-full overflow-hidden" style={{ ['--tint' as string]: `var(${tint})` }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="tint-icon grid h-9 w-9 place-items-center rounded-lg">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-20" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyRow({ icon: Icon, text }: { readonly icon: LucideIcon; readonly text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default function Admin() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, level, experience_points, total_study_hours, streak_days, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('contact_messages')
        .select('id, name, email, subject, message, created_at')
        .order('created_at', { ascending: false }),
    ]);
    setProfiles((p as ProfileRow[]) ?? []);
    setMessages((m as MessageRow[]) ?? []);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalHours = useMemo(
    () => profiles.reduce((acc, p) => acc + Number(p.total_study_hours ?? 0), 0),
    [profiles],
  );

  const newLast30 = useMemo(() => {
    const since = subDays(new Date(), 30);
    return profiles.filter((p) => new Date(p.created_at) >= since).length;
  }, [profiles]);

  const avgLevel = profiles.length
    ? Math.round(profiles.reduce((a, p) => a + (p.level ?? 0), 0) / profiles.length)
    : 0;

  // Últimos 6 meses em ordem cronológica, incluindo meses sem cadastros
  const signupChart = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    return months.map((m) => {
      const key = format(m, 'yyyy-MM');
      return {
        mes: format(m, 'MMM', { locale: ptBR }),
        total: profiles.filter((p) => format(new Date(p.created_at), 'yyyy-MM') === key).length,
      };
    });
  }, [profiles]);

  const topStudents = useMemo(
    () => [...profiles].sort((a, b) => Number(b.total_study_hours ?? 0) - Number(a.total_study_hours ?? 0)).slice(0, 5),
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? profiles.filter((p) => (p.full_name ?? '').toLowerCase().includes(q)) : [...profiles];
    const by: Record<SortKey, (a: ProfileRow, b: ProfileRow) => number> = {
      recent: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      hours: (a, b) => Number(b.total_study_hours ?? 0) - Number(a.total_study_hours ?? 0),
      level: (a, b) => (b.level ?? 0) - (a.level ?? 0),
      streak: (a, b) => (b.streak_days ?? 0) - (a.streak_days ?? 0),
    };
    return list.sort(by[sort]);
  }, [profiles, query, sort]);

  const maxTopHours = Number(topStudents[0]?.total_study_hours ?? 0) || 1;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Code2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Painel do Desenvolvedor</h1>
                <Badge variant="outline" className="hidden border-primary/30 text-primary sm:inline-flex">Admin</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Visão geral da plataforma, estudantes e mensagens recebidas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {updatedAt && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Atualizado {formatDistanceToNow(updatedAt, { locale: ptBR, addSuffix: true })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} loading={loading} icon={Users} tint="--tint-blue" label="Usuários" value={String(profiles.length)} hint={`${newLast30} novos nos últimos 30 dias`} />
        <StatCard index={1} loading={loading} icon={MessageSquare} tint="--tint-violet" label="Mensagens" value={String(messages.length)} hint="pelo formulário de contato" />
        <StatCard index={2} loading={loading} icon={Clock} tint="--tint-emerald" label="Horas de estudo" value={`${Math.round(totalHours).toLocaleString('pt-BR')}h`} hint={profiles.length ? `${(totalHours / profiles.length).toFixed(1)}h por usuário` : 'acumuladas'} />
        <StatCard index={3} loading={loading} icon={TrendingUp} tint="--tint-amber" label="Nível médio" value={String(avgLevel)} hint="entre todos os usuários" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-10">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            Usuários <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{profiles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            Mensagens <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{messages.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Novos cadastros</CardTitle>
                  <CardDescription>Últimos 6 meses</CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <UserPlus className="h-3 w-3" /> {signupChart.reduce((a, b) => a + b.total, 0)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={signupChart} margin={{ left: -20, right: 8, top: 8 }}>
                        <defs>
                          <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          cursor={{ stroke: 'hsl(var(--border))' }}
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 12,
                            color: 'hsl(var(--popover-foreground))',
                          }}
                          formatter={(v: number) => [v, 'Cadastros']}
                        />
                        <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#signupFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-warning" /> Mais horas de estudo
                </CardTitle>
                <CardDescription>Top 5 estudantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                {!loading && topStudents.length === 0 && <EmptyRow icon={Users} text="Nenhum usuário ainda." />}
                {!loading &&
                  topStudents.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-4 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[11px]">{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{p.full_name ?? 'Sem nome'}</p>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {Math.round(Number(p.total_study_hours ?? 0))}h
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(Number(p.total_study_hours ?? 0) / maxTopHours) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Mensagens recentes</CardTitle>
                <CardDescription>Últimos contatos recebidos</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {!loading && messages.length === 0 && <EmptyRow icon={Inbox} text="Nenhuma mensagem recebida." />}
              {messages.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-start gap-3 px-6 py-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[11px]">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{m.subject ?? 'Sem assunto'}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{m.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-base">Usuários</CardTitle>
                <CardDescription>{filteredProfiles.length} de {profiles.length}</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
                </div>
                <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  {([
                    ['recent', 'Recentes'],
                    ['hours', 'Horas'],
                    ['level', 'Nível'],
                    ['streak', 'Ofensiva'],
                  ] as [SortKey, string][]).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSort(k)}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                        sort === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-6">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredProfiles.length === 0 ? (
                <EmptyRow icon={Users} text="Nenhum usuário encontrado." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Usuário</TableHead>
                      <TableHead className="text-right">Nível</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Horas</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Ofensiva</TableHead>
                      <TableHead className="hidden text-right md:table-cell">XP</TableHead>
                      <TableHead className="hidden pr-6 text-right lg:table-cell">Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={p.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials(p.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate font-medium text-foreground">{p.full_name ?? 'Sem nome'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><Badge variant="secondary">Nv. {p.level ?? 0}</Badge></TableCell>
                        <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{Math.round(Number(p.total_study_hours ?? 0))}h</TableCell>
                        <TableCell className="hidden text-right md:table-cell">
                          <span className="inline-flex items-center gap-1 tabular-nums"><Flame className="h-3.5 w-3.5 text-warning" />{p.streak_days ?? 0}</span>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">{(p.experience_points ?? 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="hidden pr-6 text-right text-muted-foreground lg:table-cell">
                          {format(new Date(p.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens de contato</CardTitle>
              <CardDescription>Enviadas pelo formulário da página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              {!loading && messages.length === 0 && <EmptyRow icon={Inbox} text="Nenhuma mensagem recebida." />}
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{m.subject ?? 'Sem assunto'}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(m.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {m.name ?? '—'} · {m.email ?? '—'}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{m.message}</p>
                      {m.email && (
                        <Button asChild variant="ghost" size="sm" className="-ml-2 mt-2 h-8 gap-1.5 text-primary">
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? 'Contato FD-Planner'}`)}`}>
                            Responder por email <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AuthorshipNotice variant="card" />
    </div>
  );
}
