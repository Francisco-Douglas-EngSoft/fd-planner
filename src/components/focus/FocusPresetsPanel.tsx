import { useState } from 'react';
import { Zap, Wand2, Minus, Plus, Trash2, Save, Play, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Preset } from '@/hooks/usePomodoroTimer';
import { useI18n } from '@/i18n';

export type TimerSource = 'plan' | 'preset';

interface FocusPresetsPanelProps {
  activePreset: Preset;
  builtInPresets: Preset[];
  customPresets: Preset[];
  timerSource: TimerSource;
  /** Minutos por ciclo calculados pelo planejamento (quando existe meta diária). */
  planCycleMinutes: number | null;
  hasCourse: boolean;
  /** Há uma sessão de foco em andamento (rodando ou pausada). */
  sessionInProgress: boolean;
  cyclesUntilLongBreak: number;
  onSelectPlan: () => void;
  onSelectPreset: (preset: Preset) => void;
  onSaveCustom: (preset: Preset) => void;
  onRemoveCustom: (index: number) => void;
}

const LIMITS = {
  work: { min: 5, max: 180, step: 5 },
  break: { min: 1, max: 60, step: 1 },
  longBreak: { min: 5, max: 90, step: 5 },
} as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

function Stepper({
  label,
  value,
  onChange,
  limits,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  limits: { min: number; max: number; step: number };
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-lg shrink-0"
          onClick={() => onChange(clamp(value - limits.step, limits.min, limits.max))}
          disabled={value <= limits.min}
          aria-label={t(`Diminuir ${label}`, `Decrease ${label}`)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            min={limits.min}
            max={limits.max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n, limits.min, limits.max));
            }}
            className="h-7 px-1 pr-6 text-center text-xs font-semibold tabular-nums rounded-lg"
            aria-label={label}
          />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">min</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-lg shrink-0"
          onClick={() => onChange(clamp(value + limits.step, limits.min, limits.max))}
          disabled={value >= limits.max}
          aria-label={t(`Aumentar ${label}`, `Increase ${label}`)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PresetRow({
  preset,
  active,
  disabled,
  onClick,
  onRemove,
}: {
  preset: Preset;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const { t, lang } = useI18n();
  const displayName = lang === 'en' && preset.nameEn ? preset.nameEn : preset.name === 'Personalizado' ? t('Personalizado', 'Custom') : preset.name;
  const displayDesc = lang === 'en' && preset.descriptionEn ? preset.descriptionEn : preset.description === 'Ajustado agora' ? t('Ajustado agora', 'Adjusted now') : preset.description;
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-xl border transition-all',
        active ? 'border-primary/40 bg-primary/[0.07] shadow-sm' : 'border-border/50 hover:border-primary/25 hover:bg-muted/30',
        disabled && !active && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex flex-1 min-w-0 items-center gap-3 p-2.5 text-left disabled:cursor-not-allowed"
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg tabular-nums leading-none',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          <span className="text-sm font-bold">{preset.work}</span>
          <span className="text-[8px] opacity-80">min</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{displayName}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {displayDesc ?? t('Seu preset', 'Your preset')}
          </p>
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            {t(`${preset.break}m pausa · ${preset.longBreak}m longa`, `${preset.break}m break · ${preset.longBreak}m long`)}
          </p>
        </div>
        {active && (
          <Badge variant="default" className="shrink-0 rounded-full px-2 text-[9px]">
            {t('Ativo', 'Active')}
          </Badge>
        )}
      </button>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="mr-1 h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
          aria-label={t(`Excluir preset ${preset.name}`, `Delete preset ${preset.name}`)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function FocusPresetsPanel({
  activePreset,
  builtInPresets,
  customPresets,
  timerSource,
  planCycleMinutes,
  hasCourse,
  sessionInProgress,
  cyclesUntilLongBreak,
  onSelectPlan,
  onSelectPreset,
  onSaveCustom,
  onRemoveCustom,
}: FocusPresetsPanelProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState({ work: activePreset.work, break: activePreset.break, longBreak: activePreset.longBreak });
  const [draftName, setDraftName] = useState('');
  const { t } = useI18n();

  const isActive = (p: Preset) =>
    timerSource === 'preset' &&
    activePreset.name === p.name &&
    activePreset.work === p.work &&
    activePreset.break === p.break &&
    activePreset.longBreak === p.longBreak;

  const cycleTotal = draft.work * cyclesUntilLongBreak + draft.break * (cyclesUntilLongBreak - 1) + draft.longBreak;

  const applyDraft = () => {
    onSelectPreset({ name: 'Personalizado', ...draft, description: 'Ajustado agora' });
  };

  const saveDraft = () => {
    const name = draftName.trim() || t(`Meu ritmo ${draft.work}/${draft.break}`, `My rhythm ${draft.work}/${draft.break}`);
    const p: Preset = { name, ...draft };
    onSaveCustom(p);
    onSelectPreset(p);
    setDraftName('');
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="rounded-lg bg-primary/10 p-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          {t('Presets de Foco', 'Focus Presets')}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {t('Todo o tempo cronometrado conta para suas metas diária, semanal e para o Dashboard.', 'All timed focus counts toward your daily and weekly goals and the Dashboard.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {!hasCourse && (
          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {t('Selecione um curso para que o tempo do preset seja registrado.', 'Select a course so preset time gets recorded.')}
          </div>
        )}
        {sessionInProgress && hasCourse && (
          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('Ao trocar de ritmo, o tempo já cronometrado nesta sessão é salvo antes — nenhum minuto é perdido.', 'Switching rhythm saves the time already timed in this session first — no minute is lost.')}
          </div>
        )}

        {/* Automático pelo planejamento */}
        {planCycleMinutes !== null && (
          <button
            type="button"
            onClick={onSelectPlan}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
              timerSource === 'plan'
                ? 'border-primary/40 bg-primary/[0.07] shadow-sm'
                : 'border-dashed border-border hover:border-primary/25 hover:bg-muted/30',
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                timerSource === 'plan' ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{t('Automático pelo plano', 'Automatic from plan')}</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {t('Divide o que falta da meta de hoje', "Splits what's left of today's goal")} · ~{Math.max(1, Math.round(planCycleMinutes))} {t('min por ciclo', 'min per cycle')}
              </p>
            </div>
            {timerSource === 'plan' && (
              <Badge variant="default" className="shrink-0 rounded-full px-2 text-[9px]">
                {t('Ativo', 'Active')}
              </Badge>
            )}
          </button>
        )}

        {/* Prontos */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('Ritmos prontos', 'Ready-made rhythms')}</p>
          {builtInPresets.map((p) => (
            <PresetRow
              key={p.name}
              preset={p}
              active={isActive(p)}
              onClick={() => onSelectPreset(p)}
            />
          ))}
        </div>

        {/* Do usuário */}
        {(customPresets.length > 0 || (timerSource === 'preset' && activePreset.name === 'Personalizado')) && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('Meus presets', 'My presets')}</p>
            {timerSource === 'preset' && activePreset.name === 'Personalizado' && (
              <PresetRow preset={activePreset} active onClick={() => undefined} />
            )}
            {customPresets.map((p, i) => (
              <PresetRow
                key={`${p.name}-${i}`}
                preset={p}
                active={isActive(p)}
                onClick={() => onSelectPreset(p)}
                onRemove={() => onRemoveCustom(i)}
              />
            ))}
          </div>
        )}

        {/* Personalizar */}
        <div className="rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => {
              if (!showCustom) setDraft({ work: activePreset.work, break: activePreset.break, longBreak: activePreset.longBreak });
              setShowCustom((v) => !v);
            }}
            className="flex w-full items-center justify-between p-2.5 text-xs font-semibold"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-primary" />
              {t('Criar ritmo personalizado', 'Create custom rhythm')}
            </span>
            {showCustom ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showCustom && (
            <div className="space-y-3 border-t border-border/60 p-2.5">
              <div className="grid grid-cols-1 gap-2">
                <Stepper label={t('Foco', 'Focus')} value={draft.work} limits={LIMITS.work} onChange={(v) => setDraft((d) => ({ ...d, work: v }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Stepper label={t('Pausa', 'Break')} value={draft.break} limits={LIMITS.break} onChange={(v) => setDraft((d) => ({ ...d, break: v }))} />
                  <Stepper label={t('Pausa longa', 'Long break')} value={draft.longBreak} limits={LIMITS.longBreak} onChange={(v) => setDraft((d) => ({ ...d, longBreak: v }))} />
                </div>
              </div>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {cyclesUntilLongBreak} {t('ciclos', 'cycles')} = {Math.floor(cycleTotal / 60)}h {cycleTotal % 60}min · {draft.work * cyclesUntilLongBreak} {t('min de foco', 'focus min')}
              </p>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.slice(0, 30))}
                placeholder={t('Nome (opcional) — ex.: Revisão noturna', 'Name (optional) — e.g. Night review')}
                className="h-8 rounded-lg text-xs"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={applyDraft}>
                  <Play className="mr-1 h-3 w-3" />
                  {t('Usar agora', 'Use now')}
                </Button>
                <Button type="button" size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={saveDraft}>
                  <Save className="mr-1 h-3 w-3" />
                  {t('Salvar', 'Save')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
