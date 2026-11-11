/**
 * GDPR/LGPD Service
 * Implementa direitos do titular de dados
 * LGPD Art. 18 - Direitos do titular
 */

import { supabase } from '@/integrations/supabase/client';
import { AuditService } from './auditService';

export interface UserDataExport {
  profile: any;
  courses: any[];
  tasks: any[];
  notes: any[];
  focusSessions: any[];
  studyPlans: any[];
  achievements: any[];
  auditLogs: any[];
  exportDate: string;
  dataRetentionPolicy: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: 'privacy_policy' | 'terms_of_service' | 'marketing' | 'analytics';
  consent_given: boolean;
  consent_date: string;
  privacy_policy_version: string;
  ip_address?: string | null;
}

export class GDPRService {
  /**
   * Exporta TODOS os dados do usuário (LGPD Art. 18, III)
   * Direito de acesso aos dados
   */
  static async exportUserData(): Promise<UserDataExport> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    try {
      // Busca todos os dados do usuário em paralelo
      const [
        profile,
        courses,
        tasks,
        notes,
        focusSessions,
        studyPlans,
        studyPlanCourses,
        achievements,
        auditLogs,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('courses').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('study_notes').select('*').eq('user_id', user.id),
        supabase.from('focus_sessions').select('*').eq('user_id', user.id),
        supabase.from('study_plans').select('*').eq('user_id', user.id),
        supabase.from('study_plan_courses').select('*'),
        supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id),
        (supabase.from as any)('audit_logs').select('*').eq('user_id', user.id),
      ]);

      // Log da exportação
      await AuditService.log({
        action: 'EXPORT_DATA',
        resourceType: 'user_data',
        success: true,
      });

      return {
        profile: profile.data,
        courses: courses.data || [],
        tasks: tasks.data || [],
        notes: notes.data || [],
        focusSessions: focusSessions.data || [],
        studyPlans: studyPlans.data || [],
        achievements: achievements.data || [],
        auditLogs: auditLogs.data || [],
        exportDate: new Date().toISOString(),
        dataRetentionPolicy: 'Data is retained for 2 years after last activity. You can request deletion at any time.',
      };
    } catch (error) {
      await AuditService.log({
        action: 'EXPORT_DATA',
        resourceType: 'user_data',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Deleta TODOS os dados do usuário (LGPD Art. 18, VI)
   * Direito de eliminação dos dados
   */
  static async deleteUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    try {
      // Log antes de deletar
      await AuditService.log({
        action: 'DELETE_ACCOUNT',
        resourceType: 'user_data',
        success: true,
        metadata: { userId: user.id },
      });

      // Estas tabelas filhas não possuem user_id: o vínculo com o usuário
      // acontece por meio dos planejamentos e cursos aos quais pertencem.
      const [
        { data: userPlans, error: plansError },
        { data: userCourses, error: coursesError },
      ] = await Promise.all([
        supabase.from('study_plans').select('id').eq('user_id', user.id),
        supabase.from('courses').select('id').eq('user_id', user.id),
      ]);

      if (plansError) throw plansError;
      if (coursesError) throw coursesError;

      const planIds = (userPlans || []).map((plan) => plan.id);
      const courseIds = (userCourses || []).map((course) => course.id);

      // Deleta dados em cascata (ordem correta respeitando foreign keys)
      // 1. Primeiro: tabelas filhas (que referenciam outras)
      if (planIds.length > 0) {
        await (supabase.from('study_plan_courses') as any).delete().in('study_plan_id', planIds);
        await (supabase.from as any)('study_plan_modules').delete().in('study_plan_id', planIds);
      }
      if (courseIds.length > 0) {
        await (supabase.from as any)('course_modules').delete().in('course_id', courseIds);
      }
      await supabase.from('user_achievements').delete().eq('user_id', user.id);
      await supabase.from('focus_sessions').delete().eq('user_id', user.id);
      await supabase.from('study_notes').delete().eq('user_id', user.id);
      await supabase.from('tasks').delete().eq('user_id', user.id);
      
      // 2. Depois: tabelas pai
      await supabase.from('study_plans').delete().eq('user_id', user.id);
      await supabase.from('courses').delete().eq('user_id', user.id);
      await supabase.from('weekly_goals').delete().eq('user_id', user.id);
      
      // 3. Por último: logs e perfil
      await (supabase.from as any)('audit_logs').delete().eq('user_id', user.id);

      // Deleta perfil
      await supabase.from('profiles').delete().eq('id', user.id);

      // Deleta conta de autenticação
      await supabase.auth.admin.deleteUser(user.id);

    } catch (error) {
      console.error('[GDPR] Failed to delete user data:', error);
      throw new Error('Failed to delete user data. Please contact support.');
    }
  }

  /**
   * Registra consentimento do usuário
   */
  static async recordConsent(params: {
    consentType: ConsentRecord['consent_type'];
    consentGiven: boolean;
    privacyPolicyVersion: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await (supabase.from as any)('user_consents').insert({
      user_id: user.id,
      consent_type: params.consentType,
      consent_given: params.consentGiven,
      privacy_policy_version: params.privacyPolicyVersion,
      consent_date: new Date().toISOString(),
    });
  }

  /**
   * Verifica se usuário deu consentimento
   */
  static async hasConsent(consentType: ConsentRecord['consent_type']): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await (supabase.from as any)('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .eq('consent_type', consentType)
      .eq('consent_given', true)
      .order('consent_date', { ascending: false })
      .limit(1)
      .single();

    return !!data;
  }

  /**
   * Anonimiza dados do usuário (alternativa à exclusão)
   */
  static async anonymizeUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Anonimiza dados pessoais mantendo dados estatísticos
    await supabase.from('profiles').update({
      full_name: 'Anonymous User',
      avatar_url: null,
      bio: null,
    }).eq('id', user.id);

    // Remove conteúdo sensível de notas
    await supabase.from('study_notes').update({
      content: '[Content removed by user request]',
    }).eq('user_id', user.id);

    await AuditService.log({
      action: 'DELETE_ACCOUNT',
      resourceType: 'user_data',
      success: true,
      metadata: { action: 'anonymize' },
    });
  }

  /**
   * Gera relatório de privacidade
   */
  static async generatePrivacyReport(): Promise<{
    dataCollected: string[];
    dataShared: string[];
    retentionPeriod: string;
    rights: string[];
  }> {
    return {
      dataCollected: [
        'Nome completo',
        'Email',
        'Cursos e progresso de estudos',
        'Notas e anotações',
        'Sessões de foco',
        'Tarefas e planejamentos',
        'Logs de auditoria',
      ],
      dataShared: [
        'Nenhum dado é compartilhado com terceiros',
        'Dados armazenados em servidores Supabase (AWS)',
      ],
      retentionPeriod: '2 anos após última atividade',
      rights: [
        'Direito de acesso aos dados (Art. 18, II)',
        'Direito de correção (Art. 18, III)',
        'Direito de eliminação (Art. 18, VI)',
        'Direito de portabilidade (Art. 18, V)',
        'Direito de revogação do consentimento (Art. 18, IX)',
      ],
    };
  }
}
