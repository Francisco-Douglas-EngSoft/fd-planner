import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Flame,
  Target,
  Brain,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyStats {
  totalImpulses: number;
  totalResistances: number;
  totalRelapses: number;
  avgSelfControl: number;
  resistanceRate: number;
  daysWithCheckin: number;
  longestStreak: number;
  goalsCompleted: number;
  impulsesByType: Record<string, number>;
  weeklyBreakdown: Array<{
    week: string;
    impulses: number;
    resistances: number;
    avgScore: number;
  }>;
  comparisonToPrevious: {
    impulses: number;
    resistances: number;
    avgScore: number;
  };
}

const monthOptions = () => {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR })
    });
  }
  return months;
};

export function MonthlyReport() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && selectedMonth) {
      fetchMonthlyStats();
    }
  }, [user, selectedMonth]);

  const fetchMonthlyStats = async () => {
    try {
      setLoading(true);
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));
      const prevStartDate = startOfMonth(subMonths(startDate, 1));
      const prevEndDate = endOfMonth(subMonths(startDate, 1));

      // Fetch checkins for the month
      const { data: checkins } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .gte('check_date', format(startDate, 'yyyy-MM-dd'))
        .lte('check_date', format(endDate, 'yyyy-MM-dd'));

      // Fetch previous month for comparison
      const { data: prevCheckins } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .gte('check_date', format(prevStartDate, 'yyyy-MM-dd'))
        .lte('check_date', format(prevEndDate, 'yyyy-MM-dd'));

      // Fetch impulse logs for the month
      const { data: impulseLogs } = await supabase
        .from('impulse_logs')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch relapses for the month
      const { data: relapses } = await supabase
        .from('relapses')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch completed goals for the month
      const { data: goals } = await supabase
        .from('recovery_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Fetch streaks
      const { data: streaks } = await supabase
        .from('clean_streaks')
        .select('*')
        .eq('user_id', user?.id);

      // Calculate stats
      const totalImpulses = checkins?.reduce((acc, c) => acc + (c.impulses_count || 0), 0) || 0;
      const totalResistances = checkins?.reduce((acc, c) => acc + (c.resistances_count || 0), 0) || 0;
      const totalRelapses = relapses?.length || 0;
      const avgSelfControl = checkins?.length 
        ? Math.round(checkins.reduce((acc, c) => acc + (c.self_control_score || 0), 0) / checkins.length * 10) / 10
        : 0;
      const resistanceRate = totalImpulses > 0 
        ? Math.round((totalResistances / totalImpulses) * 100) 
        : 100;

      // Impulses by type
      const impulsesByType: Record<string, number> = {};
      impulseLogs?.forEach(log => {
        const type = log.trigger_type || 'other';
        impulsesByType[type] = (impulsesByType[type] || 0) + 1;
      });

      // Weekly breakdown
      const weeklyBreakdown: MonthlyStats['weeklyBreakdown'] = [];
      let currentWeek = 1;
      let weekStart = startDate;
      
      while (weekStart <= endDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

        const weekCheckins = checkins?.filter(c => {
          const date = parseISO(c.check_date);
          return date >= weekStart && date <= weekEnd;
        }) || [];

        weeklyBreakdown.push({
          week: `Semana ${currentWeek}`,
          impulses: weekCheckins.reduce((acc, c) => acc + (c.impulses_count || 0), 0),
          resistances: weekCheckins.reduce((acc, c) => acc + (c.resistances_count || 0), 0),
          avgScore: weekCheckins.length 
            ? Math.round(weekCheckins.reduce((acc, c) => acc + (c.self_control_score || 0), 0) / weekCheckins.length * 10) / 10
            : 0
        });

        weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() + 1);
        currentWeek++;
      }

      // Comparison with previous month
      const prevTotalImpulses = prevCheckins?.reduce((acc, c) => acc + (c.impulses_count || 0), 0) || 0;
      const prevTotalResistances = prevCheckins?.reduce((acc, c) => acc + (c.resistances_count || 0), 0) || 0;
      const prevAvgScore = prevCheckins?.length 
        ? prevCheckins.reduce((acc, c) => acc + (c.self_control_score || 0), 0) / prevCheckins.length
        : 0;

      setStats({
        totalImpulses,
        totalResistances,
        totalRelapses,
        avgSelfControl,
        resistanceRate,
        daysWithCheckin: checkins?.length || 0,
        longestStreak: streaks?.reduce((max, s) => Math.max(max, s.longest_streak || 0), 0) || 0,
        goalsCompleted: goals?.length || 0,
        impulsesByType,
        weeklyBreakdown,
        comparisonToPrevious: {
          impulses: prevTotalImpulses > 0 ? Math.round(((totalImpulses - prevTotalImpulses) / prevTotalImpulses) * 100) : 0,
          resistances: prevTotalResistances > 0 ? Math.round(((totalResistances - prevTotalResistances) / prevTotalResistances) * 100) : 0,
          avgScore: prevAvgScore > 0 ? Math.round(((avgSelfControl - prevAvgScore) / prevAvgScore) * 100) : 0
        }
      });

    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!stats) return;
    
    try {
      setExporting(true);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });

      // Header
      doc.setFillColor(139, 92, 246); // Purple gradient
      doc.rect(0, 0, pageWidth, 50, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('StudyFlow AntiVício', 20, 25);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório Mensal de Autocontrole', 20, 35);

      doc.setFontSize(10);
      doc.text(monthName, pageWidth - 20, 25, { align: 'right' });
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth - 20, 35, { align: 'right' });

      doc.setTextColor(0, 0, 0);

      // Summary Stats
      let yPos = 65;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Mês', 20, yPos);

      yPos += 10;

      const summaryData = [
        ['Impulsos Registrados', stats.totalImpulses.toString()],
        ['Resistências', stats.totalResistances.toString()],
        ['Taxa de Resistência', `${stats.resistanceRate}%`],
        ['Recaídas', stats.totalRelapses.toString()],
        ['Autocontrole Médio', `${stats.avgSelfControl}/10`],
        ['Dias com Check-in', stats.daysWithCheckin.toString()],
        ['Maior Sequência', `${stats.longestStreak} dias`],
        ['Metas Concluídas', stats.goalsCompleted.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 6,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' },
        },
      });

      // Weekly Breakdown
      yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolução Semanal', 20, yPos);

      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Semana', 'Impulsos', 'Resistências', 'Autocontrole']],
        body: stats.weeklyBreakdown.map(w => [
          w.week,
          w.impulses.toString(),
          w.resistances.toString(),
          `${w.avgScore}/10`
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 6,
        },
      });

      // Comparison
      yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 20;

      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Comparação com Mês Anterior', 20, yPos);

      yPos += 10;

      const comparisonData = [
        [
          'Impulsos', 
          `${stats.comparisonToPrevious.impulses >= 0 ? '+' : ''}${stats.comparisonToPrevious.impulses}%`,
          stats.comparisonToPrevious.impulses <= 0 ? '✓ Melhor' : '⚠ Pior'
        ],
        [
          'Resistências', 
          `${stats.comparisonToPrevious.resistances >= 0 ? '+' : ''}${stats.comparisonToPrevious.resistances}%`,
          stats.comparisonToPrevious.resistances >= 0 ? '✓ Melhor' : '⚠ Pior'
        ],
        [
          'Autocontrole', 
          `${stats.comparisonToPrevious.avgScore >= 0 ? '+' : ''}${stats.comparisonToPrevious.avgScore}%`,
          stats.comparisonToPrevious.avgScore >= 0 ? '✓ Melhor' : '⚠ Pior'
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Variação', 'Avaliação']],
        body: comparisonData,
        theme: 'striped',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 6,
        },
      });

      // Impulses by type
      if (Object.keys(stats.impulsesByType).length > 0) {
        yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 20;

        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Impulsos por Tipo de Gatilho', 20, yPos);

        yPos += 10;

        const triggerLabels: Record<string, string> = {
          'stress': 'Estresse',
          'boredom': 'Tédio',
          'anxiety': 'Ansiedade',
          'tiredness': 'Cansaço',
          'button_press': 'Botão de Crise',
          'other': 'Outro'
        };

        const impulseTypeData = Object.entries(stats.impulsesByType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => [triggerLabels[type] || type, count.toString()]);

        autoTable(doc, {
          startY: yPos,
          head: [['Gatilho', 'Quantidade']],
          body: impulseTypeData,
          theme: 'striped',
          headStyles: {
            fillColor: [139, 92, 246],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 10,
            cellPadding: 6,
          },
          columnStyles: {
            1: { halign: 'right' },
          },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount} • StudyFlow AntiVício`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `antivicio-relatorio-${selectedMonth}.pdf`;
      doc.save(fileName);
      
      toast.success('Relatório exportado com sucesso!');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  const ComparisonBadge = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value <= 0 : value >= 0;
    return (
      <Badge 
        variant={isPositive ? 'default' : 'destructive'} 
        className={`gap-1 ${isPositive ? 'bg-success text-success-foreground' : ''}`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {value >= 0 ? '+' : ''}{value}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Relatório Mensal
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Análise detalhada do seu progresso
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportToPDF} disabled={exporting || !stats}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exportando...' : 'PDF'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!stats ? (
        <Card className="card-elevated">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum dado encontrado para este mês
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="card-elevated">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <ComparisonBadge value={stats.comparisonToPrevious.impulses} inverse />
                </div>
                <p className="text-lg sm:text-2xl font-bold">{stats.totalImpulses}</p>
                <p className="text-xs text-muted-foreground">Impulsos</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <ComparisonBadge value={stats.comparisonToPrevious.resistances} />
                </div>
                <p className="text-lg sm:text-2xl font-bold">{stats.resistanceRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa Resistência</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="h-4 w-4 text-accent" />
                  <ComparisonBadge value={stats.comparisonToPrevious.avgScore} />
                </div>
                <p className="text-lg sm:text-2xl font-bold">{stats.avgSelfControl}</p>
                <p className="text-xs text-muted-foreground">Autocontrole Médio</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-lg sm:text-2xl font-bold">{stats.totalRelapses}</p>
                <p className="text-xs text-muted-foreground">Recaídas</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown */}
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Evolução Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.weeklyBreakdown.map((week, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{week.week}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{week.impulses} impulsos</span>
                        <span>{week.resistances} resistências</span>
                        <span className="font-medium text-foreground">{week.avgScore}/10</span>
                      </div>
                    </div>
                    <Progress 
                      value={week.avgScore * 10} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-warning" />
                  Conquistas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dias com check-in</span>
                  <span className="font-bold">{stats.daysWithCheckin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Maior sequência</span>
                  <span className="font-bold">{stats.longestStreak} dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Metas concluídas</span>
                  <span className="font-bold">{stats.goalsCompleted}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.resistanceRate >= 80 
                    ? '🎉 Excelente! Você está mantendo um ótimo controle sobre os impulsos.'
                    : stats.resistanceRate >= 60
                    ? '💪 Bom progresso! Continue focando nas técnicas de resistência.'
                    : stats.resistanceRate >= 40
                    ? '📈 Há espaço para melhorar. Considere revisar seus horários críticos.'
                    : '🎯 Foque em identificar os gatilhos e use o botão de crise quando precisar.'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
