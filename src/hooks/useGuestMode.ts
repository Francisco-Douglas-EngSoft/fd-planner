import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  demoProfile,
  demoCourses,
  demoCourseModules,
  demoTasks,
  demoFocusSessions,
  demoWeeklyGoals,
  demoMonthlyGoals,
  demoStudyPlans,
  demoStudyNotes,
  demoAchievements,
  demoUserAchievements,
  demoAddictionProfile,
  demoCleanStreaks,
  demoImpulseLogs,
  demoProjects,
  demoCertificates,
  demoSocialLinks,
  getDemoStats,
} from '@/data/demoData';

export function useGuestMode() {
  const { isGuest, user } = useAuth();
  const { toast } = useToast();

  const isReadOnly = isGuest && !user;

  const blockGuestAction = (actionName?: string) => {
    if (isReadOnly) {
      toast({
        title: "Modo Visitante",
        description: actionName 
          ? `Não é possível ${actionName} no modo visitante. Crie uma conta para ter acesso completo.`
          : "Esta ação não está disponível no modo visitante. Crie uma conta para ter acesso completo.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const checkGuestAccess = () => {
    return !isReadOnly;
  };

  // Demo data getters
  const getDemoData = () => ({
    profile: demoProfile,
    courses: demoCourses,
    courseModules: demoCourseModules,
    tasks: demoTasks,
    focusSessions: demoFocusSessions,
    weeklyGoals: demoWeeklyGoals,
    monthlyGoals: demoMonthlyGoals,
    studyPlans: demoStudyPlans,
    studyNotes: demoStudyNotes,
    achievements: demoAchievements,
    userAchievements: demoUserAchievements,
    addictionProfile: demoAddictionProfile,
    cleanStreaks: demoCleanStreaks,
    impulseLogs: demoImpulseLogs,
    projects: demoProjects,
    certificates: demoCertificates,
    socialLinks: demoSocialLinks,
    stats: getDemoStats(),
  });

  return {
    isGuest,
    isReadOnly,
    blockGuestAction,
    checkGuestAccess,
    getDemoData,
  };
}
