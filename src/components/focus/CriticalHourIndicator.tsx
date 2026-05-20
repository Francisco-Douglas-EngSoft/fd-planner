import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CriticalHourIndicatorProps {
  className?: string;
}

export function CriticalHourIndicator({ className }: CriticalHourIndicatorProps) {
  const [isCriticalHour, setIsCriticalHour] = useState(false);
  const [criticalHours, setCriticalHours] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCriticalHours();
    }
  }, [user]);

  useEffect(() => {
    if (criticalHours.length === 0) return;

    const checkCriticalHour = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
      setIsCriticalHour(criticalHours.includes(currentHour));
    };

    checkCriticalHour();
    const interval = setInterval(checkCriticalHour, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [criticalHours]);

  const fetchCriticalHours = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('addiction_profiles')
      .select('critical_hours')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setHasProfile(true);
      setCriticalHours(data.critical_hours || []);
    }
  };

  if (!hasProfile || criticalHours.length === 0) return null;

  return (
    <Badge
      variant={isCriticalHour ? "destructive" : "secondary"}
      className={cn(
        "transition-all gap-1.5",
        isCriticalHour && "animate-pulse",
        className
      )}
    >
      {isCriticalHour ? (
        <>
          <AlertTriangle className="h-3 w-3" />
          Horário Crítico
        </>
      ) : (
        <>
          <Shield className="h-3 w-3" />
          Horário Seguro
        </>
      )}
    </Badge>
  );
}
