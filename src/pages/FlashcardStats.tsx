import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { flashcardService, type FlashcardRow } from "@/services/flashcardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, CalendarDays, TrendingUp, Brain } from "lucide-react";
import { AdvancedAnalytics } from "@/components/analytics/AdvancedAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ReviewRow {
  quality: number;
  reviewed_at: string;
}

export default function FlashcardStats() {
  const { user } = useAuth();

  const cards = useQuery({
    queryKey: ["flashcards", user?.id],
    queryFn: () => (user ? flashcardService.list(user.id) : Promise.resolve([] as FlashcardRow[])),
    enabled: !!user,
  });

  const reviews = useQuery({
    queryKey: ["flashcard-review-history", user?.id],
    queryFn: async (): Promise<ReviewRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("review_history")
        .select("quality, reviewed_at")
        .eq("user_id", user.id)
        .order("reviewed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
    enabled: !!user,
  });

  const decks = useMemo(() => {
    const grouped = new Map<string, FlashcardRow[]>();
    for (const c of cards.data ?? []) {
      const k = c.topic?.trim() || "Sem tópico";
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(c);
    }
    return Array.from(grouped.entries())
      .map(([topic, items]) => {
        const now = Date.now();
        const due = items.filter((c) => c.next_review && new Date(c.next_review).getTime() <= now).length;
        const avgEf =
          items.reduce((s, c) => s + (c.ease_factor ?? 2.5), 0) / Math.max(items.length, 1);
        return { topic, total: items.length, due, avgEf };
      })
      .sort((a, b) => b.total - a.total);
  }, [cards.data]);

  const dueByDay = useMemo(() => {
    const buckets: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        count: 0,
      });
    }
    for (const c of cards.data ?? []) {
      if (!c.next_review) continue;
      const key = new Date(c.next_review).toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) b.count++;
    }
    return buckets;
  }, [cards.data]);

  const retention = useMemo(() => {
    const rs = reviews.data ?? [];
    if (!rs.length) return { rate: 0, total: 0, correct: 0, last7: 0 };
    const correct = rs.filter((r) => r.quality >= 3).length;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = rs.filter((r) => new Date(r.reviewed_at).getTime() >= cutoff).length;
    return {
      rate: Math.round((correct / rs.length) * 100),
      total: rs.length,
      correct,
      last7,
    };
  }, [reviews.data]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/flashcards"><ArrowLeft className="h-4 w-4 mr-1" /> Flashcards</Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Estatísticas de Flashcards</h1>
            <p className="text-sm text-muted-foreground">Decks, revisões e retenção</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-blue)" }}>
          <CardContent className="p-4">
            <div className="tint-icon inline-flex rounded-xl p-2 mb-2"><Layers className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{cards.data?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de cards</p>
          </CardContent>
        </Card>
        <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-amber)" }}>
          <CardContent className="p-4">
            <div className="tint-icon inline-flex rounded-xl p-2 mb-2"><CalendarDays className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{dueByDay[0]?.count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Devidos hoje</p>
          </CardContent>
        </Card>
        <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-emerald)" }}>
          <CardContent className="p-4">
            <div className="tint-icon inline-flex rounded-xl p-2 mb-2"><TrendingUp className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{retention.rate}%</p>
            <p className="text-xs text-muted-foreground">Retenção ({retention.total} revisões)</p>
          </CardContent>
        </Card>
        <Card className="tint-card" style={{ ["--tint" as string]: "var(--tint-violet)" }}>
          <CardContent className="p-4">
            <div className="tint-icon inline-flex rounded-xl p-2 mb-2"><Brain className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{retention.last7}</p>
            <p className="text-xs text-muted-foreground">Revisões (últimos 7 dias)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cards devidos por dia (próximos 14 dias)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dueByDay}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Decks por tópico</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {decks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum flashcard ainda.</p>
          )}
          {decks.map((d) => (
            <div key={d.topic} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div>
                <p className="font-medium">{d.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {d.total} cards · EF médio {d.avgEf.toFixed(2)}
                </p>
              </div>
              {d.due > 0 ? (
                <Badge variant="destructive">{d.due} devidos</Badge>
              ) : (
                <Badge variant="secondary">Em dia</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AdvancedAnalytics
        title="Análises de estudo"
        description="Padrões de foco relacionados às suas revisões"
        hide={["distribution"]}
      />
    </div>
  );
}