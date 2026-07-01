import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'moderator' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      // user_roles may not be in generated types yet; cast to keep build green.
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => Promise<{ data: { role: AppRole }[] | null; error: unknown }>;
          };
        };
      })
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!active) return;
      setRoles(error || !data ? [] : data.map((r) => r.role));
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [user]);

  return {
    roles,
    loading,
    isAdmin: roles.includes('admin'),
    hasRole: (role: AppRole) => roles.includes(role),
  };
}