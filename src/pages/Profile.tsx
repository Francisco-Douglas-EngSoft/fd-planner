import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { XPProgressBar, getLevelTier } from '@/components/gamification/XPProgressBar';
import { 
  User, Camera, Clock, Flame, Trophy, BookOpen, CheckCircle2, Target,
  Star, Zap, Crown, TrendingUp, Calendar, Edit2, Mail, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  experience_points: number;
  level: number;
  streak_days: number;
  total_study_hours: number;
  study_hours_goal: number;
}

interface Stats {
  totalCourses: number;
  completedCourses: number;
  completedTasks: number;
  totalTasks: number;
  focusSessions: number;
  totalAchievements: number;
  unlockedAchievements: number;
  todayStudyMinutes: number;
  totalNotes: number;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0, completedCourses: 0, completedTasks: 0, totalTasks: 0,
    focusSessions: 0, totalAchievements: 0, unlockedAchievements: 0,
    todayStudyMinutes: 0, totalNotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, experience_points, level, streak_days, total_study_hours, study_hours_goal')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      setProfile(data);
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [coursesRes, tasksRes, focusRes, achievementsRes, userAchievementsRes, todayFocusRes, notesRes] = await Promise.all([
        supabase.from('courses').select('id, status').eq('user_id', user?.id),
        supabase.from('tasks').select('id, status').eq('user_id', user?.id),
        supabase.from('focus_sessions').select('id', { count: 'exact' }).eq('user_id', user?.id),
        supabase.from('achievements').select('id', { count: 'exact' }),
        supabase.from('user_achievements').select('id', { count: 'exact' }).eq('user_id', user?.id),
        supabase.from('focus_sessions').select('duration_minutes').eq('user_id', user?.id).gte('completed_at', startOfDay).lt('completed_at', endOfDay),
        supabase.from('study_notes').select('id', { count: 'exact' }).eq('user_id', user?.id),
      ]);

      const completedTasks = tasksRes.data?.filter(t => t.status === 'completed').length || 0;
      const todayStudyMinutes = todayFocusRes.data?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

      setStats({
        totalCourses: coursesRes.data?.length || 0,
        completedCourses: coursesRes.data?.filter(c => c.status === 'completed').length || 0,
        completedTasks,
        totalTasks: tasksRes.data?.length || 0,
        focusSessions: focusRes.count || 0,
        totalAchievements: achievementsRes.count || 0,
        unlockedAchievements: userAchievementsRes.count || 0,
        todayStudyMinutes,
        totalNotes: notesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Tipo inválido", description: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) await supabase.storage.from('course-covers').remove([`avatars/${oldPath}`]);
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('course-covers').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('course-covers').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Foto atualizada!" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
      setEditing(false);
      toast({ title: "Nome atualizado!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatStudyTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}min`;
  };

  const expForNextLevel = (level: number) => level * 500;
  const currentLevelExp = profile ? profile.experience_points % expForNextLevel(profile.level) : 0;
  const tier = getLevelTier(profile?.level || 1);
  const dailyGoalMinutes = (profile?.study_hours_goal || 3) * 60;
  const dailyPercent = Math.min(100, (stats.todayStudyMinutes / dailyGoalMinutes) * 100);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statItems = [
    { icon: Clock, value: formatStudyTime(profile?.total_study_hours || 0), label: 'Horas Estudadas', gradient: 'from-accent to-primary' },
    { icon: Target, value: stats.focusSessions, label: 'Sessões de Foco', gradient: 'from-primary to-accent' },
    { icon: BookOpen, value: stats.totalCourses, label: 'Cursos', gradient: 'from-success to-accent' },
    { icon: CheckCircle2, value: `${stats.completedTasks}/${stats.totalTasks}`, label: 'Tarefas', gradient: 'from-primary to-primary/70' },
    { icon: Trophy, value: stats.unlockedAchievements, label: 'Conquistas', gradient: 'from-warning to-warning/70' },
    { icon: Flame, value: `${profile?.streak_days || 0}d`, label: 'Sequência', gradient: 'from-warning to-destructive' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Profile Hero */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-primary/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring' }}
            >
              <div className="relative">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-primary/20 shadow-xl shadow-primary/10">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuário'} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-1 right-1 p-2.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Camera className="h-4 w-4" />
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>
              {/* Level badge */}
              <motion.div
                className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                <div className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Nv.{profile?.level || 1}
                </div>
              </motion.div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              {editing ? (
                <div className="flex items-center gap-2 max-w-xs mx-auto sm:mx-0">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10" autoFocus />
                  <Button size="sm" onClick={handleUpdateName}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold font-display">{profile?.full_name || 'Usuário'}</h1>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user?.email}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {tier.title}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  {profile?.experience_points || 0} XP
                </Badge>
                <Badge variant="secondary" className="gap-1 text-primary border-primary/20 bg-primary/5">
                  <Flame className="h-3 w-3" />
                  {profile?.streak_days || 0} dias
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* XP Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-primary/10">
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

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", stat.gradient)} />
              <CardContent className="relative p-3 sm:p-4 text-center text-white">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring' }}>
                  <stat.icon className="h-5 w-5 mx-auto mb-1.5 drop-shadow" />
                </motion.div>
                <p className="text-xl sm:text-2xl font-bold drop-shadow">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-white/80 font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Goal */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-primary" />
                Meta Diária de Estudo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hoje: {Math.round(stats.todayStudyMinutes)}min</span>
                <span className="font-medium">Meta: {formatStudyTime(profile?.study_hours_goal || 3)}</span>
              </div>
              <div className="relative">
                <Progress value={dailyPercent} className="h-3" />
                {dailyPercent >= 100 && (
                  <motion.div
                    className="absolute -right-1 -top-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {dailyPercent >= 100 ? '🎉 Meta diária atingida!' : `${Math.round(dailyPercent)}% da meta diária`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-primary" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring' }}
                >
                  <Star className="h-8 w-8 text-white" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-3xl font-bold">{stats.unlockedAchievements}</p>
                  <p className="text-sm text-muted-foreground">de {stats.totalAchievements} conquistas</p>
                </div>
              </div>
              <Progress
                value={stats.totalAchievements > 0 ? (stats.unlockedAchievements / stats.totalAchievements) * 100 : 0}
                className="h-2"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {stats.totalAchievements > 0 ? Math.round((stats.unlockedAchievements / stats.totalAchievements) * 100) : 0}% desbloqueadas
                </p>
                <Link to="/conquistas">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Ver todas <TrendingUp className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Member Since */}
      <motion.div
        className="text-center py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
          <Calendar className="h-3.5 w-3.5" />
          Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '...'}
        </p>
      </motion.div>
    </div>
  );
}
