import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  Shield,
  Search,
  Mail,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

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

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  readonly icon: typeof Users;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <Card className="bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
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
      setLoading(false);
    };
    load();
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => (p.full_name ?? '').toLowerCase().includes(q));
  }, [profiles, query]);

  const totalHours = useMemo(
    () => profiles.reduce((acc, p) => acc + Number(p.total_study_hours ?? 0), 0),
    [profiles],
  );

  const signupChart = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of profiles) {
      const d = new Date(p.created_at);
      const key = d.toLocaleString('pt-BR', { month: 'short' });
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([mes, total]) => ({ mes, total })).slice(-6);
  }, [profiles]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel do Admin</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma, usuários e mensagens</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Usuários" value={String(profiles.length)} hint="cadastrados" />
        <StatCard icon={MessageSquare} label="Mensagens" value={String(messages.length)} hint="recebidas" />
        <StatCard icon={Clock} label="Horas de estudo" value={`${Math.round(totalHours)}h`} hint="acumuladas" />
        <StatCard
          icon={TrendingUp}
          label="Média de nível"
          value={profiles.length ? String(Math.round(profiles.reduce((a, p) => a + (p.level ?? 0), 0) / profiles.length)) : '0'}
          hint="por usuário"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Novos cadastros</CardTitle>
              <CardDescription>Últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signupChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-card">
            <CardHeader className="gap-3">
              <CardTitle className="text-base">Usuários</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && filteredProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              )}
              {filteredProfiles.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback>{(p.full_name ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.full_name ?? 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      Nível {p.level ?? 0} · {Math.round(Number(p.total_study_hours ?? 0))}h · {p.streak_days ?? 0} dias
                    </p>
                  </div>
                  <Badge variant="secondary">{p.experience_points ?? 0} XP</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Mensagens de contato</CardTitle>
              <CardDescription>Formulário de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem recebida.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{m.subject ?? 'Sem assunto'}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {m.name ?? '—'} · {m.email ?? '—'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{m.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}