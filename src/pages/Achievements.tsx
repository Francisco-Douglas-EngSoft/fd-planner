import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Flame, Target, Clock, BookOpen, CheckSquare, Zap, Award, Play, CheckCircle, ListChecks, Shield, Heart, Sparkles, TrendingUp, Crown, Medal, Gem } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { XPProgressBar, getLevelTier } from '@/components/gamification/XPProgressBar';
import { DailyXPSummary } from '@/components/gamification/DailyXPSummary';
import { PeriodRewards } from '@/components/gamification/PeriodRewards';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  experience_reward: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface Profile {
  level: number;
  experience_points: number;
  total_study_hours: number;
  streak_days: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'play': Play, 'target': Target, 'zap': Zap, 'clock': Clock, 'award': Award,
  'star': Star, 'flame': Flame, 'trophy': Trophy, 'book-open': BookOpen,
  'check-circle': CheckCircle, 'check-square': CheckSquare, 'list-checks': ListChecks,
  'shield': Shield, 'heart': Heart,
};

const categoryLabels: Record<string, string> = {
  focus: 'Foco', hours: 'Horas de Estudo', streak: 'Sequência',
  courses: 'Cursos', tasks: 'Tarefas', antivicio: 'AntiVício',
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  focus: Target, hours: Clock, streak: Flame,
  courses: BookOpen, tasks: CheckSquare, antivicio: Shield,
};

const categoryGradients: Record<string, string> = {
  focus: 'from-primary to-accent',
  hours: 'from-accent to-primary',
  streak: 'from-warning to-destructive',
  courses: 'from-success to-accent',
  tasks: 'from-primary to-primary/70',
  antivicio: 'from-destructive to-destructive/70',
};

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stats, setStats] = useState({
    focusSessions: 0, totalHours: 0, streakDays: 0, coursesCreated: 0,
    coursesCompleted: 0, tasksCompleted: 0, cleanDays: 0, impulsesResisted: 0,
    checkins: 0, recoveryGoals: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: achievementsData } = await supabase
        .from('achievements').select('*').order('requirement_value');
      if (achievementsData) setAchievements(achievementsData);

      const { data: userAchievementsData } = await supabase
        .from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id);
      if (userAchievementsData) setUserAchievements(userAchievementsData);

      const { data: profileData } = await supabase
        .from('profiles').select('level, experience_points, total_study_hours, streak_days')
        .eq('id', user.id).single();
      if (profileData) setProfile(profileData);

      const [focusResult, coursesResult, tasksResult, streaksResult, impulsesResult, checkinsResult, goalsResult] = await Promise.all([
        supabase.from('focus_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).eq('session_type', 'work'),
        supabase.from('courses').select('id, status').eq('user_id', user.id),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('clean_streaks').select('current_streak').eq('user_id', user.id),
        supabase.from('impulse_logs').select('resisted').eq('user_id', user.id),
        supabase.from('addiction_checkins').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('recovery_goals').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_completed', true),
      ]);

      const maxCleanDays = Math.max(0, ...(streaksResult.data?.map(s => s.current_streak || 0) || [0]));
      const impulsesResisted = impulsesResult.data?.filter(i => i.resisted).length || 0;

      setStats({
        focusSessions: focusResult.count || 0,
        totalHours: profileData?.total_study_hours || 0,
        streakDays: profileData?.streak_days || 0,
        coursesCreated: coursesResult.data?.length || 0,
        coursesCompleted: coursesResult.data?.filter(c => c.status === 'completed').length || 0,
        tasksCompleted: tasksResult.count || 0,
        cleanDays: maxCleanDays, impulsesResisted,
        checkins: checkinsResult.count || 0,
        recoveryGoals: goalsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const getProgress = (achievement: Achievement) => {
    let current = 0;
    switch (achievement.requirement_type) {
      case 'focus_sessions': current = stats.focusSessions; break;
      case 'total_hours': current = stats.totalHours; break;
      case 'streak_days': current = stats.streakDays; break;
      case 'courses_created': current = stats.coursesCreated; break;
      case 'courses_completed': current = stats.coursesCompleted; break;
      case 'tasks_completed': current = stats.tasksCompleted; break;
      case 'clean_days': current = stats.cleanDays; break;
      case 'impulses_resisted': current = stats.impulsesResisted; break;
      case 'checkins': current = stats.checkins; break;
      case 'recovery_goals': current = stats.recoveryGoals; break;
    }
    return { current, percent: Math.min((current / achievement.requirement_value) * 100, 100) };
  };

  const isUnlocked = (achievementId: string) =>
    userAchievements.some(ua => ua.achievement_id === achievementId);

  const expForNextLevel = (level: number) => level * 500;
  const currentLevelExp = profile ? profile.experience_points % expForNextLevel(profile.level) : 0;

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const groupedAchievements = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) acc[achievement.category] = [];
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categories = Object.keys(groupedAchievements);
  const filteredCategories = selectedCategory === 'all' ? categories : categories.filter(c => c === selectedCategory);

  const tier = getLevelTier(profile?.level || 1);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Header */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-primary/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Trophy className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display">Conquistas & Progresso</h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="gap-1">
                    <Medal className="h-3 w-3" />
                    {unlockedCount}/{totalCount}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Nível {profile?.level || 1}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5">
                    <Gem className="h-3 w-3" />
                    {completionPercent}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Completion ring */}
            <motion.div
              className="hidden sm:flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <motion.path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${completionPercent}, 100` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{completionPercent}%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* XP & Daily Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full overflow-hidden border-primary/10">
            <CardContent className="p-5 sm:p-6">
              <XPProgressBar
                level={profile?.level || 1}
                currentXP={currentLevelExp}
                requiredXP={expForNextLevel(profile?.level || 1)}
                totalXP={profile?.experience_points || 0}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full overflow-hidden border-primary/10">
            <CardContent className="p-5 sm:p-6">
              <DailyXPSummary
                todayXP={0}
                dailyGoal={200}
                streakDays={stats.streakDays}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Target, value: stats.focusSessions, label: 'Sessões', gradient: 'from-primary to-accent' },
          { icon: Clock, value: `${Math.round(stats.totalHours)}h`, label: 'Estudadas', gradient: 'from-accent to-primary' },
          { icon: Flame, value: stats.streakDays, label: 'Sequência', gradient: 'from-warning to-destructive' },
          { icon: BookOpen, value: stats.coursesCreated, label: 'Cursos', gradient: 'from-success to-accent' },
          { icon: CheckCircle, value: stats.coursesCompleted, label: 'Completos', gradient: 'from-success to-success/70' },
          { icon: CheckSquare, value: stats.tasksCompleted, label: 'Tarefas', gradient: 'from-primary to-primary/70' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", stat.gradient)} />
              <CardContent className="relative p-3 sm:p-4 text-center text-white">
                <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: 'spring' }}>
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 drop-shadow" />
                </motion.div>
                <p className="text-xl sm:text-2xl font-bold drop-shadow">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-white/80 font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Category Filter */}
      <motion.div
        className="flex gap-2 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
            selectedCategory === 'all'
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Todas ({totalCount})
          </span>
        </button>
        {categories.map((cat) => {
          const CatIcon = categoryIcons[cat] || Star;
          const catAchievements = groupedAchievements[cat];
          const catUnlocked = catAchievements.filter(a => isUnlocked(a.id)).length;
          const isComplete = catUnlocked === catAchievements.length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : isComplete
                    ? "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <CatIcon className="h-3.5 w-3.5" />
              {categoryLabels[cat] || cat}
              <span className="opacity-70">{catUnlocked}/{catAchievements.length}</span>
              {isComplete && <CheckCircle className="h-3 w-3" />}
            </button>
          );
        })}
      </motion.div>

      {/* Achievements by Category */}
      <AnimatePresence mode="wait">
        {filteredCategories.map((category) => {
          const categoryAchievements = groupedAchievements[category];
          const CatIcon = categoryIcons[category] || Star;
          const catUnlocked = categoryAchievements.filter(a => isUnlocked(a.id)).length;
          const catGradient = categoryGradients[category] || 'from-primary to-accent';
          const isComplete = catUnlocked === categoryAchievements.length;

          return (
            <motion.div
              key={category}
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", catGradient)}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold">{categoryLabels[category] || category}</h3>
                <Badge variant="secondary" className="font-mono">{catUnlocked}/{categoryAchievements.length}</Badge>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <Badge className="bg-success/10 text-success border-success/20 gap-1">
                      <Sparkles className="h-3 w-3" /> Completo!
                    </Badge>
                  </motion.div>
                )}
                {/* Category progress bar */}
                <div className="flex-1 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full bg-gradient-to-r", catGradient)}
                      initial={{ width: 0 }}
                      animate={{ width: `${(catUnlocked / categoryAchievements.length) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>
              </div>

              {/* Achievement Cards */}
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryAchievements.map((achievement, i) => {
                  const Icon = iconMap[achievement.icon] || Star;
                  const unlocked = isUnlocked(achievement.id);
                  const { current, percent } = getProgress(achievement);
                  const unlockedData = userAchievements.find(ua => ua.achievement_id === achievement.id);

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      <Card className={cn(
                        "relative overflow-hidden transition-all duration-300 group",
                        unlocked
                          ? "border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
                          : "opacity-75 hover:opacity-100 hover:shadow-md"
                      )}>
                        {/* Unlocked glow */}
                        {unlocked && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                        )}
                        
                        <CardContent className="relative p-4">
                          <div className="flex items-start gap-3.5">
                            <motion.div
                              className={cn(
                                "shrink-0 p-3 rounded-xl relative",
                                unlocked
                                  ? cn("bg-gradient-to-br text-white shadow-lg", catGradient)
                                  : "bg-muted text-muted-foreground"
                              )}
                              whileHover={{ scale: 1.1, rotate: unlocked ? 8 : 0 }}
                              transition={{ type: 'spring' }}
                            >
                              <Icon className="h-5 w-5" />
                              {unlocked && (
                                <motion.div
                                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-success flex items-center justify-center shadow-sm"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', delay: 0.3 }}
                                >
                                  <CheckCircle className="h-3 w-3 text-white" />
                                </motion.div>
                              )}
                            </motion.div>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{achievement.name}</h4>
                                <Badge
                                  variant={unlocked ? "default" : "secondary"}
                                  className={cn(
                                    "shrink-0 text-[10px] font-mono",
                                    unlocked && "bg-primary/90"
                                  )}
                                >
                                  +{achievement.experience_reward} XP
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{achievement.description}</p>

                              {!unlocked && (
                                <div className="space-y-1.5">
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                      className={cn("h-full rounded-full bg-gradient-to-r", catGradient)}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percent}%` }}
                                      transition={{ duration: 0.8, delay: 0.2 }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {current}/{achievement.requirement_value}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{Math.round(percent)}%</p>
                                  </div>
                                </div>
                              )}

                              {unlocked && unlockedData && (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-[10px] gap-1">
                                    <CheckCircle className="h-2.5 w-2.5" />
                                    Desbloqueada em {new Date(unlockedData.unlocked_at).toLocaleDateString('pt-BR')}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {achievements.length === 0 && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma conquista disponível</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Continue estudando para desbloquear conquistas!</p>
        </motion.div>
      )}
    </div>
  );
}
