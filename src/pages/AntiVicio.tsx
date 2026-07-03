import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Shield, 
  Flame, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Brain,
  Heart,
  Zap,
  Award,
  BarChart3,
  Plus,
  Bell,
  FileText,
  Sparkles,
  Activity,
  Clock,
  ChevronRight,
  Lightbulb,
  Star,
  Crown,
  Trophy,
  Sunrise
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AntiVicioOnboarding } from '@/components/antivicio/AntiVicioOnboarding';
import { ImpulseButton } from '@/components/antivicio/ImpulseButton';
import { DailyCheckin } from '@/components/antivicio/DailyCheckin';
import { RecoveryGoalDialog } from '@/components/antivicio/RecoveryGoalDialog';
import { RelapseDialog } from '@/components/antivicio/RelapseDialog';
import { NotificationSettings } from '@/components/antivicio/NotificationSettings';
import { useCriticalHourNotifications } from '@/hooks/useCriticalHourNotifications';
import { ProgressCharts } from '@/components/antivicio/ProgressCharts';
import { MonthlyReport } from '@/components/antivicio/MonthlyReport';
import { EmergencyProtocol } from '@/components/antivicio/EmergencyProtocol';
import { DailyMentalExercise } from '@/components/antivicio/DailyMentalExercise';
import { MinimumActionCard } from '@/components/antivicio/MinimumActionCard';
import { UserLevelBadge } from '@/components/antivicio/UserLevelBadge';
import { DailyAffirmation } from '@/components/antivicio/DailyAffirmation';
import { StreakMilestone } from '@/components/antivicio/StreakMilestone';
import { AdvancedStatisticsCard } from '@/components/antivicio/AdvancedStatisticsCard';
import { SmartRemindersCard } from '@/components/antivicio/SmartRemindersCard';
import { TriggerAnalysisCard } from '@/components/antivicio/TriggerAnalysisCard';

interface AddictionProfile {
  id: string;
  addiction_types: string[];
  critical_hours: string[];
  associated_emotions: string[];
  dependency_level: number;
  study_impact_level: number;
  onboarding_completed: boolean;
}

interface CleanStreak {
  id: string;
  addiction_type: string;
  current_streak: number;
  longest_streak: number;
  last_clean_date: string;
}

interface RecoveryGoal {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  is_completed: boolean;
}

interface TodayCheckin {
  id: string;
  impulses_count: number;
  resistances_count: number;
  relapses_count: number;
  self_control_score: number;
}

export default function AntiVicio() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AddictionProfile | null>(null);
  const [streaks, setStreaks] = useState<CleanStreak[]>([]);
  const [goals, setGoals] = useState<RecoveryGoal[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  
  // Initialize critical hour notifications
  useCriticalHourNotifications();
  const [showRelapseDialog, setShowRelapseDialog] = useState(false);
  const [showEmergencyProtocol, setShowEmergencyProtocol] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch addiction profile
      const { data: profileData } = await supabase
        .from('addiction_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (!profileData) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }
      
      setProfile(profileData);
      
      if (!profileData.onboarding_completed) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }
      
      // Fetch clean streaks
      const { data: streaksData } = await supabase
        .from('clean_streaks')
        .select('*')
        .eq('user_id', user?.id);
      
      setStreaks(streaksData || []);
      
      // Fetch recovery goals
      const { data: goalsData } = await supabase
        .from('recovery_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });
      
      setGoals(goalsData || []);
      
      // Fetch today's checkin
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: checkinData } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .eq('check_date', today)
        .maybeSingle();
      
      setTodayCheckin(checkinData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    fetchData();
  };

  const getTotalStreak = () => {
    if (streaks.length === 0) return 0;
    return Math.min(...streaks.map(s => s.current_streak));
  };

  const getLongestStreak = () => {
    if (streaks.length === 0) return 0;
    return Math.max(...streaks.map(s => s.longest_streak));
  };

  const getResistanceRate = () => {
    if (!todayCheckin || todayCheckin.impulses_count === 0) return 100;
    return Math.round((todayCheckin.resistances_count / todayCheckin.impulses_count) * 100);
  };

  const addictionTypeLabels: Record<string, string> = {
    'social_media': 'Redes Sociais',
    'games': 'Jogos',
    'pornography': 'Pornografia',
    'fast_dopamine': 'Dopamina Rápida',
    'procrastination': 'Procrastinação',
    'youtube': 'YouTube',
    'streaming': 'Streaming',
    'shopping': 'Compras Online'
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (showOnboarding) {
    return <AntiVicioOnboarding onComplete={handleOnboardingComplete} existingProfile={profile} />;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-6 sm:p-8"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl shadow-black/10"
            >
              <Shield className="h-10 w-10 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display text-white">
                AntiVício
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-1">
                Controle seus impulsos e proteja seu foco
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-2"
              onClick={() => setShowEmergencyProtocol(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Protocolo SOS</span>
            </Button>
            <ImpulseButton onResisted={fetchData} />
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="relative grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-300 shrink-0" />
              <span className="text-xl sm:text-3xl font-bold text-white">{getTotalStreak()}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/70">Dias em Sequência</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 shrink-0" />
              <span className="text-xl sm:text-3xl font-bold text-white">{getLongestStreak()}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/70">Recorde Pessoal</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 shrink-0" />
              <span className="text-xl sm:text-3xl font-bold text-white">{getResistanceRate()}%</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/70">Taxa de Resistência</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Daily Affirmation Card - Prominent */}
      <DailyAffirmation />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start bg-muted/50 p-1.5 rounded-2xl overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Evolução</span>
            <span className="sm:hidden">📊</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Relatório</span>
            <span className="sm:hidden">📄</span>
          </TabsTrigger>
          <TabsTrigger value="streaks" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Sequências</span>
            <span className="sm:hidden">🔥</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Metas</span>
            <span className="sm:hidden">🎯</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:shadow-md gap-2 px-4">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
            <span className="sm:hidden">🔔</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* User Level Badge - Full Width at Top */}
          <UserLevelBadge 
            profile={profile}
            streaks={streaks}
            todayCheckin={todayCheckin}
            totalRelapses={0}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Check-in */}
            <DailyCheckin checkin={todayCheckin} onUpdate={fetchData} />

            {/* Daily Mental Exercise */}
            <DailyMentalExercise />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Summary */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
              <CardHeader className="pb-4 relative">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5">
                    <Heart className="h-5 w-5 text-destructive" />
                  </div>
                  Meu Perfil AntiVício
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 relative">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Vícios Monitorados</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.addiction_types.map((type) => (
                      <Badge 
                        key={type} 
                        variant="secondary" 
                        className="px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-0 font-medium"
                      >
                        {addictionTypeLabels[type] || type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Nível de Dependência</p>
                    <div className="flex items-center gap-3">
                      <Progress value={(profile?.dependency_level || 0) * 10} className="h-2.5 flex-1" />
                      <span className="text-lg font-bold text-primary">{profile?.dependency_level}/10</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Impacto nos Estudos</p>
                    <div className="flex items-center gap-3">
                      <Progress value={(profile?.study_impact_level || 0) * 10} className="h-2.5 flex-1" />
                      <span className="text-lg font-bold text-warning">{profile?.study_impact_level}/10</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Horários Críticos</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.critical_hours.map((hour) => (
                      <Badge key={hour} variant="outline" className="px-3 py-1.5 bg-warning/5 border-warning/20 text-warning">
                        <Clock className="h-3 w-3 mr-1.5" />
                        {hour}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 group hover:border-primary/50"
                  onClick={() => setShowOnboarding(true)}
                >
                  Atualizar Perfil
                  <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Minimum Action Card - Anti-Procrastination */}
            <MinimumActionCard />
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning via-primary to-accent" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5">
                    <Zap className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                    <CardDescription className="text-xs">
                      Ferramentas para manter o controle
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col items-center gap-3 hover:bg-destructive/5 hover:border-destructive/30 transition-all group rounded-2xl"
                    onClick={() => setShowRelapseDialog(true)}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 group-hover:from-destructive/30 group-hover:to-destructive/10 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="text-xs font-medium">Registrar Recaída</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group rounded-2xl"
                    onClick={() => setShowGoalDialog(true)}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium">Nova Meta</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col items-center gap-3 hover:bg-warning/5 hover:border-warning/30 transition-all group rounded-2xl"
                    onClick={() => setShowEmergencyProtocol(true)}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 group-hover:from-warning/30 group-hover:to-warning/10 transition-colors">
                      <Shield className="h-5 w-5 text-warning" />
                    </div>
                    <span className="text-xs font-medium">Protocolo SOS</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col items-center gap-3 hover:bg-success/5 hover:border-success/30 transition-all group rounded-2xl"
                    onClick={() => toast.info('Respire fundo... Segure... Solte...', { duration: 5000 })}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-success/20 to-success/5 group-hover:from-success/30 group-hover:to-success/10 transition-colors">
                      <Heart className="h-5 w-5 text-success" />
                    </div>
                    <span className="text-xs font-medium">Respiração</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col items-center gap-3 hover:bg-accent/5 hover:border-accent/30 transition-all group rounded-2xl"
                    onClick={() => toast.success('"Eu sou alguém que protege meu foco e constrói meu futuro."')}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-colors">
                      <Brain className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-xs font-medium">Afirmação</span>
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {/* Advanced Statistics */}
          <AdvancedStatisticsCard />
          
          {/* Trigger Analysis */}
          <TriggerAnalysisCard />
          
          {/* Progress Charts */}
          <ProgressCharts />
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <MonthlyReport />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Smart Reminders */}
          <SmartRemindersCard />
          
          {/* Legacy Notification Settings */}
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="streaks" className="space-y-6">
          {/* Streak Milestone - Main Display */}
          <StreakMilestone 
            currentStreak={getTotalStreak()} 
            longestStreak={getLongestStreak()} 
          />

          {/* Individual Streaks */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {streaks.length === 0 ? (
              <Card className="col-span-full border-dashed border-2 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 w-fit mx-auto mb-4"
                  >
                    <Flame className="h-12 w-12 text-muted-foreground" />
                  </motion.div>
                  <p className="text-lg font-semibold text-muted-foreground">
                    Nenhuma sequência iniciada ainda
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Continue resistindo aos impulsos para começar sua jornada!
                  </p>
                </CardContent>
              </Card>
            ) : (
              streaks.map((streak, index) => (
                <motion.div
                  key={streak.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-muted/20 rounded-2xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary via-accent to-success" />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
                          {addictionTypeLabels[streak.addiction_type] || streak.addiction_type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Flame className="h-5 w-5 text-orange-500" />
                          <span className="text-2xl font-bold text-primary">{streak.current_streak}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground">Maior sequência</span>
                          <div className="flex items-center gap-1.5 text-success">
                            <Award className="h-4 w-4" />
                            <span className="text-sm font-bold">{streak.longest_streak} dias</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground">Último dia limpo</span>
                          <span className="text-sm font-medium">
                            {streak.last_clean_date
                              ? format(new Date(streak.last_clean_date), "dd/MM/yyyy", { locale: ptBR })
                              : 'Hoje'}
                          </span>
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Progresso até 30 dias</span>
                            <span className="font-medium">{Math.min(streak.current_streak, 30)}/30</span>
                          </div>
                          <Progress 
                            value={Math.min((streak.current_streak / 30) * 100, 100)} 
                            className="h-2.5"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Metas de Recuperação</h3>
              <p className="text-sm text-muted-foreground">Defina objetivos para sua jornada</p>
            </div>
            <Button onClick={() => setShowGoalDialog(true)} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.length === 0 ? (
              <Card className="col-span-full border-dashed border-2 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 w-fit mx-auto mb-4"
                  >
                    <Target className="h-12 w-12 text-muted-foreground" />
                  </motion.div>
                  <p className="text-lg font-semibold text-muted-foreground">
                    Nenhuma meta definida
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Crie metas para acompanhar seu progresso
                  </p>
                  <Button 
                    onClick={() => setShowGoalDialog(true)} 
                    className="mt-6 gap-2 rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                    Criar primeira meta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-muted/20 rounded-2xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-success to-primary" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{goal.title}</h4>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {goal.goal_type.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-bold">
                          {goal.current_value}/{goal.target_value}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Progress 
                          value={(goal.current_value / goal.target_value) * 100} 
                          className="h-3"
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Iniciado em {format(new Date(goal.start_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RecoveryGoalDialog 
        open={showGoalDialog} 
        onOpenChange={setShowGoalDialog}
        onSuccess={fetchData}
      />
      <RelapseDialog 
        open={showRelapseDialog} 
        onOpenChange={setShowRelapseDialog}
        onSuccess={fetchData}
        addictionTypes={profile?.addiction_types || []}
      />
      <EmergencyProtocol
        open={showEmergencyProtocol}
        onOpenChange={setShowEmergencyProtocol}
        onComplete={(resisted) => {
          fetchData();
          if (resisted) {
            toast.success('Parabéns! Você completou o protocolo de emergência!');
          }
        }}
      />
    </div>
  );
}
