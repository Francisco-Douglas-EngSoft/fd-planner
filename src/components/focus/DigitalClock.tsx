import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DigitalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/50">
      <span className="text-sm font-bold font-mono tabular-nums text-foreground tracking-wider">
        {hours}
        <span className="animate-pulse text-primary">:</span>
        {minutes}
      </span>
      <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline">
        {format(currentTime, 'EEE', { locale: ptBR })}
      </span>
    </div>
  );
}
