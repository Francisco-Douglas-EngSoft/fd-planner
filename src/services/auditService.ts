/**
 * Audit Service
 * Logging de segurança e auditoria de ações críticas
 * LGPD Art. 37 - Registro de operações
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_COURSE'
  | 'UPDATE_COURSE'
  | 'DELETE_COURSE'
  | 'CREATE_PLAN'
  | 'UPDATE_PLAN'
  | 'DELETE_PLAN'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'CREATE_NOTE'
  | 'UPDATE_NOTE'
  | 'DELETE_NOTE'
  | 'CREATE_FOCUS_SESSION'
  | 'UNLOCK_ACHIEVEMENT'
  | 'EXPORT_DATA'
  | 'DELETE_ACCOUNT'
  | 'UNAUTHORIZED_ACCESS'
  | 'FAILED_LOGIN';

export class AuditService {
  /**
   * Registra ação de auditoria
   */
  static async log(params: {
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Obtém usuário da sessão
      const { data: { user } } = await supabase.auth.getUser();
      
      // Obtém informações do navegador
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      await (supabase.from as any)('audit_logs').insert({
        user_id: user?.id || 'anonymous',
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: params.success,
        error_message: params.errorMessage || null,
        metadata: params.metadata || null,
      });
    } catch (error) {
      // Não falhar a operação principal se logging falhar
      console.error('[AUDIT] Failed to log action:', error);
    }
  }

  /**
   * Registra tentativa de acesso não autorizado
   */
  static async logUnauthorizedAccess(params: {
    resourceType: string;
    resourceId?: string;
    attemptedAction: string;
  }): Promise<void> {
    await this.log({
      action: 'UNAUTHORIZED_ACCESS',
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      success: false,
      errorMessage: `Attempted ${params.attemptedAction} without authorization`,
    });
  }

  /**
   * Registra login bem-sucedido
   */
  static async logLogin(): Promise<void> {
    await this.log({
      action: 'LOGIN',
      resourceType: 'auth',
      success: true,
    });
  }

  /**
   * Registra tentativa de login falhada
   */
  static async logFailedLogin(email: string): Promise<void> {
    await this.log({
      action: 'FAILED_LOGIN',
      resourceType: 'auth',
      success: false,
      metadata: { email },
    });
  }

  /**
   * Busca logs de auditoria do usuário
   */
  static async getUserLogs(limit: number = 100): Promise<AuditLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await (supabase.from as any)('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT] Failed to fetch logs:', error);
      throw new Error('Unable to fetch audit logs');
    }

    return (data || []) as AuditLog[];
  }

  /**
   * Obtém IP do cliente (melhor esforço)
   */
  private static async getClientIP(): Promise<string | null> {
    try {
      // Em produção, usar header X-Forwarded-For do servidor
      // Por enquanto, retorna null (será preenchido pelo backend)
      return null;
    } catch {
      return null;
    }
  }
}
