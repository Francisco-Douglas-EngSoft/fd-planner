import { useState, useEffect, useCallback } from 'react';
import { 
  Palette, Save, RotateCcw, Trash2, Check, Sun, Moon, Sparkles, Droplets, 
  Download, Upload, Search, Wand2, Zap, Eye, EyeOff,
  Brush, Shuffle, Heart, Gem, ChevronDown, ChevronRight,
  Type, Square, CircleDot, Layers, PanelLeft, MousePointer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CustomThemeColors,
  CustomTheme,
  CustomThemeShadows,
  CustomThemeGradients,
  GradientConfig,
  ShadowConfig,
  SavedTheme,
  applyCustomTheme,
  clearCustomTheme,
  getActiveCustomTheme,
  saveSavedThemes,
  useHasActiveCustomTheme,
  useSavedThemes,
  generateShadowCSS,
  generateGradientCSS,
} from '@/hooks/useCustomTheme';

// ============ Color Utilities ============

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  const r = Number.parseInt(result[1], 16) / 255;
  const g = Number.parseInt(result[2], 16) / 255;
  const b = Number.parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ============ Collapsible Section ============

function CollapsibleSection({ 
  title, icon: Icon, children, defaultOpen = false, badge 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="font-semibold text-sm flex-1">{title}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{badge}</span>
        )}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">{children}</div>}
    </div>
  );
}

// ============ Color Picker Inline ============

function ColorPickerInline({ 
  label, value, onChange, description 
}: { 
  label: string; value: string; onChange: (v: string) => void; description?: string;
}) {
  const { h, s, l } = hexToHSL(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">{label}</Label>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          H:{h} S:{s}% L:{l}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value) || e.target.value === '') {
              onChange(e.target.value);
            }
          }}
          className="h-10 text-xs font-mono flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ============ Shadow Editor ============

function ShadowEditor({ 
  shadow, onChange, label 
}: { 
  shadow: ShadowConfig; onChange: (s: ShadowConfig) => void; label: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Switch checked={shadow.enabled} onCheckedChange={(enabled) => onChange({ ...shadow, enabled })} />
      </div>
      {shadow.enabled && (
        <div className="space-y-4 p-3 rounded-lg bg-muted/20 border border-border/30">
          {/* Preview */}
          <div className="flex items-center justify-center py-6 bg-background/50 rounded-lg">
            <div
              className="w-32 h-20 rounded-xl bg-card border border-border/30 flex items-center justify-center text-xs text-muted-foreground transition-all duration-200"
              style={{ boxShadow: generateShadowCSS(shadow) }}
            >
              Preview
            </div>
          </div>
          
          {/* Color */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <span className="text-[10px] font-mono text-muted-foreground">{shadow.color}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={shadow.color} onChange={(e) => onChange({ ...shadow, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border" />
              <Input value={shadow.color} onChange={(e) => onChange({ ...shadow, color: e.target.value })}
                className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <SliderControl label="Desfoque (Blur)" value={shadow.blur} min={0} max={80} 
              onChange={(v) => onChange({ ...shadow, blur: v })} unit="px" />
            <SliderControl label="Expansão (Spread)" value={shadow.spread} min={-30} max={30} 
              onChange={(v) => onChange({ ...shadow, spread: v })} unit="px" />
            <div className="grid grid-cols-2 gap-3">
              <SliderControl label="Offset X" value={shadow.offsetX} min={-40} max={40} 
                onChange={(v) => onChange({ ...shadow, offsetX: v })} unit="px" />
              <SliderControl label="Offset Y" value={shadow.offsetY} min={-40} max={40} 
                onChange={(v) => onChange({ ...shadow, offsetY: v })} unit="px" />
            </div>
          </div>

          {/* Inset */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <Label className="text-xs">Sombra Interna (Inset)</Label>
            <Switch checked={shadow.inset || false} onCheckedChange={(inset) => onChange({ ...shadow, inset })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Gradient Editor ============

function GradientEditor({ 
  gradient, onChange, label 
}: { 
  gradient: GradientConfig; onChange: (g: GradientConfig) => void; label: string;
}) {
  const directions = [
    { value: '0deg', label: '↑' },
    { value: '45deg', label: '↗' },
    { value: '90deg', label: '→' },
    { value: '135deg', label: '↘' },
    { value: '180deg', label: '↓' },
    { value: '225deg', label: '↙' },
    { value: '270deg', label: '←' },
    { value: '315deg', label: '↖' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Switch checked={gradient.enabled} onCheckedChange={(enabled) => onChange({ ...gradient, enabled })} />
      </div>
      {gradient.enabled && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-border/30">
          {/* Preview */}
          <div 
            className="h-10 rounded-lg border border-border/30"
            style={{ background: generateGradientCSS(gradient) }}
          />

          {/* Direction */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Direção</Label>
            <div className="flex gap-1">
              {directions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => onChange({ ...gradient, direction: d.value })}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-bold flex items-center justify-center transition-all",
                    gradient.direction === d.value 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cor Início</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={gradient.color1} onChange={(e) => onChange({ ...gradient, color1: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-border" />
                <Input value={gradient.color1} onChange={(e) => onChange({ ...gradient, color1: e.target.value })}
                  className="h-8 text-[10px] font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cor Fim</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={gradient.color2} onChange={(e) => onChange({ ...gradient, color2: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-border" />
                <Input value={gradient.color2} onChange={(e) => onChange({ ...gradient, color2: e.target.value })}
                  className="h-8 text-[10px] font-mono" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Slider Control ============

function SliderControl({ 
  label, value, min, max, onChange, unit = '', step = 1 
}: { 
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string; step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[10px] text-muted-foreground font-mono">{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="cursor-pointer" />
    </div>
  );
}

// ============ Mini App Preview ============

function MiniAppPreview({ theme }: { theme: CustomTheme }) {
  const { colors, gradients, shadows } = theme;
  
  const cardBg = gradients?.cardGradient?.enabled 
    ? generateGradientCSS(gradients.cardGradient) 
    : colors.card;
  const cardStyle: React.CSSProperties = {
    background: cardBg,
    color: colors.cardForeground,
    boxShadow: shadows?.cardShadow?.enabled ? generateShadowCSS(shadows.cardShadow) : undefined,
    borderColor: colors.border,
  };
  
  const primaryBg = gradients?.primaryGradient?.enabled
    ? generateGradientCSS(gradients.primaryGradient)
    : colors.primary;
  const btnStyle: React.CSSProperties = {
    background: primaryBg,
    color: colors.primaryForeground,
    boxShadow: shadows?.buttonShadow?.enabled ? generateShadowCSS(shadows.buttonShadow) : undefined,
  };

  const sidebarBg = gradients?.sidebarGradient?.enabled
    ? generateGradientCSS(gradients.sidebarGradient)
    : colors.sidebarBackground;

  return (
    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: colors.border }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: colors.sidebarBackground, borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
        </div>
        <span className="text-[10px] font-medium ml-1" style={{ color: colors.sidebarForeground }}>
          Preview — {theme.name || 'Sem nome'}
        </span>
      </div>

      <div className="flex" style={{ background: colors.background, minHeight: 220 }}>
        {/* Sidebar */}
        <div className="w-[72px] flex-shrink-0 p-2 space-y-1.5 border-r" style={{ background: sidebarBg, borderColor: colors.sidebarBorder, color: colors.sidebarForeground }}>
          {['Dashboard', 'Cursos', 'Foco', 'Notas'].map((item, i) => (
            <div
              key={item}
              className="px-2 py-1.5 rounded-md text-[9px] font-medium truncate transition-colors cursor-default"
              style={i === 0 
                ? { background: colors.sidebarAccent, color: colors.sidebarPrimary } 
                : { color: colors.sidebarForeground }
              }
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 space-y-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold" style={{ color: colors.foreground }}>Dashboard</h4>
              <p className="text-[10px]" style={{ color: colors.mutedForeground }}>Visão geral do sistema</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={btnStyle}>
              Novo
            </button>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Horas', value: '24h', color: colors.primary },
              { label: 'Cursos', value: '8', color: colors.success },
              { label: 'Streak', value: '12d', color: colors.warning },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border p-2" style={cardStyle}>
                <p className="text-[9px] font-medium" style={{ color: colors.mutedForeground }}>{stat.label}</p>
                <p className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Main card */}
          <div className="rounded-lg border p-3 space-y-2" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: colors.cardForeground }}>Progresso Semanal</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: colors.accent, color: colors.accentForeground }}>
                Ativo
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: colors.muted }}>
              <div className="h-full rounded-full transition-all" style={{ width: '68%', background: primaryBg }} />
            </div>
            <div className="flex gap-1.5">
              <button className="flex-1 px-2 py-1 rounded-md text-[9px] font-medium" style={btnStyle}>
                Detalhes
              </button>
              <button className="flex-1 px-2 py-1 rounded-md text-[9px] font-medium border" style={{ 
                background: colors.secondary, color: colors.secondaryForeground, borderColor: colors.border 
              }}>
                Exportar
              </button>
              <button className="px-2 py-1 rounded-md text-[9px] font-medium" style={{ 
                background: colors.destructive, color: '#fff' 
              }}>
                ✕
              </button>
            </div>
          </div>

          {/* Input preview */}
          <div className="rounded-lg border px-2.5 py-1.5 text-[10px]" style={{ 
            background: colors.background, borderColor: colors.border, color: colors.mutedForeground 
          }}>
            Pesquisar cursos...
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Premium Theme Presets ============

interface ThemePreset {
  id: string; name: string; emoji: string; primaryColor: string; accentColor?: string;
  isDark: boolean; gradient?: boolean; description: string;
}

const premiumThemes: ThemePreset[] = [
  { id: 'midnight-aurora', name: 'Aurora Boreal', emoji: '🌌', primaryColor: '#6366f1', accentColor: '#8b5cf6', isDark: true, gradient: true, description: 'Luzes do norte' },
  { id: 'cyber-neon', name: 'Cyber Neon', emoji: '⚡', primaryColor: '#06b6d4', accentColor: '#8b5cf6', isDark: true, gradient: true, description: 'Futuro cyberpunk' },
  { id: 'royal-purple', name: 'Púrpura Real', emoji: '👑', primaryColor: '#7c3aed', accentColor: '#c084fc', isDark: true, description: 'Elegância sofisticada' },
  { id: 'emerald-forest', name: 'Floresta Esmeralda', emoji: '🌲', primaryColor: '#059669', accentColor: '#34d399', isDark: true, description: 'Natureza profunda' },
  { id: 'crimson-fire', name: 'Fogo Carmesim', emoji: '🔥', primaryColor: '#dc2626', accentColor: '#f97316', isDark: true, gradient: true, description: 'Energia intensa' },
  { id: 'ocean-depths', name: 'Oceano Profundo', emoji: '🌊', primaryColor: '#0891b2', accentColor: '#0ea5e9', isDark: true, description: 'Águas profundas' },
  { id: 'sunrise-gold', name: 'Ouro do Amanhecer', emoji: '🌅', primaryColor: '#f59e0b', accentColor: '#fbbf24', isDark: false, gradient: true, description: 'Energia do dia' },
  { id: 'sakura-bloom', name: 'Flor de Cerejeira', emoji: '🌸', primaryColor: '#ec4899', accentColor: '#f472b6', isDark: false, description: 'Beleza oriental' },
  { id: 'arctic-crystal', name: 'Cristal Ártico', emoji: '❄️', primaryColor: '#0ea5e9', accentColor: '#38bdf8', isDark: false, description: 'Clareza glacial' },
  { id: 'lavender-dream', name: 'Sonho Lavanda', emoji: '💜', primaryColor: '#8b5cf6', accentColor: '#a78bfa', isDark: false, description: 'Serenidade' },
  { id: 'mint-fresh', name: 'Menta Fresca', emoji: '🍃', primaryColor: '#10b981', accentColor: '#34d399', isDark: false, description: 'Frescor vital' },
  { id: 'coral-sunset', name: 'Pôr do Sol Coral', emoji: '🌇', primaryColor: '#f97316', accentColor: '#fb923c', isDark: false, gradient: true, description: 'Calor do entardecer' },
];

// ============ Shadow Presets ============

const shadowPresets = [
  { id: 'subtle', name: 'Sutil', emoji: '✨', config: { type: 'subtle' as const, color: '#3b82f6', blur: 12, spread: 0, offsetX: 0, offsetY: 2 } },
  { id: 'neon', name: 'Neon', emoji: '🌟', config: { type: 'glow' as const, color: '#8b5cf6', blur: 24, spread: 4, offsetX: 0, offsetY: 0 } },
  { id: 'deep', name: 'Profunda', emoji: '🌑', config: { type: 'strong' as const, color: '#000000', blur: 32, spread: -8, offsetX: 0, offsetY: 16 } },
  { id: 'float', name: 'Flutuante', emoji: '☁️', config: { type: 'medium' as const, color: '#000000', blur: 20, spread: -4, offsetX: 0, offsetY: 8 } },
  { id: 'inner', name: 'Interna', emoji: '💎', config: { type: 'custom' as const, color: '#6366f1', blur: 16, spread: 2, offsetX: 0, offsetY: 0, inset: true } },
  { id: 'fire', name: 'Ardente', emoji: '🔥', config: { type: 'glow' as const, color: '#f97316', blur: 20, spread: 3, offsetX: 0, offsetY: 0 } },
];

// ============ Main Component ============

interface CustomThemeBuilderProps {
  isDarkMode: boolean;
}

export function CustomThemeBuilder({ isDarkMode }: CustomThemeBuilderProps) {
  const { toast } = useToast();
  const isThemeActive = useHasActiveCustomTheme();
  const savedThemes = useSavedThemes();

  const [activeTab, setActiveTab] = useState<'create' | 'gallery' | 'saved'>('create');
  
  const [themeName, setThemeName] = useState(() => {
    const t = getActiveCustomTheme(); return t?.name || '';
  });
  
  const [isDark, setIsDark] = useState(() => {
    const t = getActiveCustomTheme();
    if (t) { const { l } = hexToHSL(t.colors.background); return l < 50; }
    return isDarkMode;
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    const t = getActiveCustomTheme(); return t?.colors.primary || (isDarkMode ? '#6366f1' : '#0891b2');
  });

  const [accentColor, setAccentColor] = useState(() => {
    const t = getActiveCustomTheme(); return t?.colors.accent || (isDarkMode ? '#8b5cf6' : '#3b82f6');
  });
  
  const [colors, setColors] = useState<CustomThemeColors>(() => {
    const t = getActiveCustomTheme(); return t?.colors || generateAdvancedTheme(primaryColor, accentColor, isDark);
  });

  const defaultShadow: ShadowConfig = { enabled: false, type: 'subtle', color: primaryColor, blur: 12, spread: 0, offsetX: 0, offsetY: 2 };
  
  const [shadows, setShadows] = useState<CustomThemeShadows>(() => {
    const t = getActiveCustomTheme();
    return t?.shadows || { cardShadow: defaultShadow };
  });

  const [gradients, setGradients] = useState<CustomThemeGradients>(() => {
    const t = getActiveCustomTheme();
    return t?.gradients || {
      cardGradient: { enabled: false, direction: '135deg', color1: primaryColor, color2: accentColor },
      primaryGradient: { enabled: false, direction: '135deg', color1: primaryColor, color2: accentColor },
      sidebarGradient: { enabled: false, direction: '180deg', color1: primaryColor, color2: accentColor },
    };
  });

  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'light' | 'dark'>('all');

  // Sync with system theme when no custom active
  useEffect(() => {
    if (!isThemeActive) {
      setIsDark(isDarkMode);
      const defPrimary = isDarkMode ? '#6366f1' : '#0891b2';
      const defAccent = isDarkMode ? '#8b5cf6' : '#3b82f6';
      setPrimaryColor(defPrimary);
      setAccentColor(defAccent);
      setColors(generateAdvancedTheme(defPrimary, defAccent, isDarkMode));
    }
  }, [isDarkMode, isThemeActive]);

  // ============ Theme Application ============

  const applyLive = useCallback((c?: CustomThemeColors, s?: CustomThemeShadows, g?: CustomThemeGradients) => {
    const theme: CustomTheme = {
      name: themeName || 'Preview',
      colors: c || colors,
      shadows: s || shadows,
      gradients: g || gradients,
    };
    applyCustomTheme(theme);
  }, [colors, shadows, gradients, themeName]);

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    applyLive(updated);
  };

  const handlePrimaryChange = (newColor: string) => {
    setPrimaryColor(newColor);
    const generated = generateAdvancedTheme(newColor, accentColor, isDark);
    setColors(generated);
    applyLive(generated);
  };

  const handleAccentChange = (newColor: string) => {
    setAccentColor(newColor);
    const generated = generateAdvancedTheme(primaryColor, newColor, isDark);
    setColors(generated);
    applyLive(generated);
  };

  const handleDarkToggle = (dark: boolean) => {
    setIsDark(dark);
    const generated = generateAdvancedTheme(primaryColor, accentColor, dark);
    setColors(generated);
    applyLive(generated);
  };

  const handleShadowsChange = (updated: CustomThemeShadows) => {
    setShadows(updated);
    applyLive(colors, updated);
  };

  const handleGradientsChange = (updated: CustomThemeGradients) => {
    setGradients(updated);
    applyLive(colors, shadows, updated);
  };

  const handleRandomTheme = () => {
    const palette = ['#3b82f6','#8b5cf6','#f43f5e','#10b981','#f59e0b','#0891b2','#6366f1','#ec4899','#14b8a6','#ef4444','#84cc16','#06b6d4','#7c3aed','#dc2626','#059669'];
    const p = palette[Math.floor(Math.random() * palette.length)];
    const a = palette[Math.floor(Math.random() * palette.length)];
    handlePrimaryChange(p);
    handleAccentChange(a);
    toast({ title: '🎲 Tema Aleatório!', description: 'Cores geradas. Gostou? Salve!' });
  };

  const handleResetTheme = () => {
    clearCustomTheme();
    const defP = isDarkMode ? '#6366f1' : '#0891b2';
    const defA = isDarkMode ? '#8b5cf6' : '#3b82f6';
    setPrimaryColor(defP); setAccentColor(defA); setIsDark(isDarkMode);
    setColors(generateAdvancedTheme(defP, defA, isDarkMode));
    setShadows({ cardShadow: { ...defaultShadow, color: defP } });
    setGradients({
      cardGradient: { enabled: false, direction: '135deg', color1: defP, color2: defA },
      primaryGradient: { enabled: false, direction: '135deg', color1: defP, color2: defA },
      sidebarGradient: { enabled: false, direction: '180deg', color1: defP, color2: defA },
    });
    setThemeName(''); setEditingThemeId(null);
    toast({ title: '🔄 Tema resetado' });
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    setPrimaryColor(preset.primaryColor);
    setAccentColor(preset.accentColor || preset.primaryColor);
    setIsDark(preset.isDark);
    setThemeName(preset.name);
    
    const generated = generateAdvancedTheme(preset.primaryColor, preset.accentColor || preset.primaryColor, preset.isDark);
    setColors(generated);
    
    const newGradients = preset.gradient ? {
      cardGradient: { enabled: true, direction: '135deg', color1: preset.primaryColor, color2: preset.accentColor || preset.primaryColor },
      primaryGradient: { enabled: true, direction: '135deg', color1: preset.primaryColor, color2: preset.accentColor || preset.primaryColor },
      sidebarGradient: { enabled: false, direction: '180deg', color1: preset.primaryColor, color2: preset.accentColor || preset.primaryColor },
    } : gradients;
    setGradients(newGradients);
    
    const newShadows = preset.gradient ? {
      ...shadows,
      cardShadow: { enabled: true, type: 'glow' as const, color: preset.primaryColor, blur: 20, spread: 2, offsetX: 0, offsetY: 0 }
    } : shadows;
    setShadows(newShadows);
    
    applyCustomTheme({ name: preset.name, colors: generated, shadows: newShadows, gradients: newGradients });
    toast({ title: `${preset.emoji} ${preset.name}`, description: preset.description });
  };

  const handleSaveTheme = () => {
    if (!themeName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Dê um nome ao seu tema.', variant: 'destructive' });
      return;
    }
    
    const duplicate = savedThemes.find(t => t.name.toLowerCase() === themeName.trim().toLowerCase() && t.id !== editingThemeId);
    if (duplicate) {
      const ok = confirm(`Já existe "${themeName}". Sobrescrever?`);
      if (!ok) return;
      saveSavedThemes(savedThemes.filter(t => t.id !== duplicate.id));
    }
    
    const theme: CustomTheme = { name: themeName.trim(), colors, shadows, gradients };
    
    if (editingThemeId) {
      const updated = savedThemes.map(t => t.id === editingThemeId 
        ? { ...t, name: themeName.trim(), colors, shadows, gradients } : t);
      saveSavedThemes(updated);
      applyCustomTheme(theme);
      toast({ title: '✅ Tema atualizado!' });
      setEditingThemeId(null);
    } else {
      const newTheme: SavedTheme = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: themeName.trim(), colors, shadows, gradients,
        createdAt: new Date().toISOString(),
      };
      saveSavedThemes([...savedThemes, newTheme]);
      applyCustomTheme(theme);
      toast({ title: '🎨 Tema salvo!', description: `"${themeName}" adicionado à coleção.` });
    }
  };

  const handleLoadTheme = (theme: SavedTheme) => {
    setColors(theme.colors); setThemeName(theme.name);
    setPrimaryColor(theme.colors.primary); setAccentColor(theme.colors.accent);
    const { l } = hexToHSL(theme.colors.background); setIsDark(l < 50);
    if (theme.shadows) setShadows(theme.shadows);
    if (theme.gradients) setGradients(theme.gradients);
    setEditingThemeId(null);
    applyCustomTheme({ name: theme.name, colors: theme.colors, shadows: theme.shadows, gradients: theme.gradients });
    toast({ title: '🎨 Tema aplicado', description: `"${theme.name}" carregado.` });
  };

  const handleEditTheme = (theme: SavedTheme) => {
    handleLoadTheme(theme);
    setEditingThemeId(theme.id);
  };

  const handleDeleteTheme = (themeId: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    saveSavedThemes(savedThemes.filter(t => t.id !== themeId));
    if (editingThemeId === themeId) { setEditingThemeId(null); setThemeName(''); handleResetTheme(); }
    toast({ title: '🗑️ Tema excluído', description: `"${name}" removido.` });
  };

  const filteredSavedThemes = savedThemes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'all') return true;
    const { l } = hexToHSL(theme.colors.background);
    return filterMode === 'dark' ? l < 50 : l >= 50;
  });

  // ============ Build current theme for preview ============
  const currentPreviewTheme: CustomTheme = { name: themeName || 'Preview', colors, shadows, gradients };

  // ============ Color Groups ============

  const colorGroups = [
    {
      title: 'Cores Globais',
      icon: CircleDot,
      items: [
        { key: 'background' as const, label: 'Fundo', desc: 'Fundo principal do app' },
        { key: 'foreground' as const, label: 'Texto Principal', desc: 'Cor do texto padrão' },
        { key: 'primary' as const, label: 'Primária', desc: 'Cor de destaque principal' },
        { key: 'primaryForeground' as const, label: 'Texto sobre Primária', desc: 'Texto sobre botões primários' },
        { key: 'accent' as const, label: 'Destaque', desc: 'Cor de destaque secundária' },
        { key: 'accentForeground' as const, label: 'Texto sobre Destaque', desc: 'Texto sobre elementos accent' },
        { key: 'border' as const, label: 'Bordas', desc: 'Cor das bordas e divisores' },
      ]
    },
    {
      title: 'Cards',
      icon: Square,
      items: [
        { key: 'card' as const, label: 'Fundo do Card', desc: 'Background dos cards' },
        { key: 'cardForeground' as const, label: 'Texto do Card', desc: 'Texto dentro dos cards' },
      ]
    },
    {
      title: 'Secundárias & Muted',
      icon: Layers,
      items: [
        { key: 'secondary' as const, label: 'Secundária', desc: 'Elementos secundários' },
        { key: 'secondaryForeground' as const, label: 'Texto Secundário', desc: 'Texto sobre secundária' },
        { key: 'muted' as const, label: 'Muted (Suave)', desc: 'Fundos suaves' },
        { key: 'mutedForeground' as const, label: 'Texto Muted', desc: 'Texto discreto' },
      ]
    },
    {
      title: 'Status',
      icon: Zap,
      items: [
        { key: 'success' as const, label: 'Sucesso', desc: 'Ações positivas' },
        { key: 'warning' as const, label: 'Aviso', desc: 'Alertas e avisos' },
        { key: 'destructive' as const, label: 'Destrutiva', desc: 'Ações perigosas' },
      ]
    },
    {
      title: 'Barra Lateral (Sidebar)',
      icon: PanelLeft,
      items: [
        { key: 'sidebarBackground' as const, label: 'Fundo da Sidebar', desc: 'Background da barra lateral' },
        { key: 'sidebarForeground' as const, label: 'Texto da Sidebar', desc: 'Texto da barra lateral' },
        { key: 'sidebarPrimary' as const, label: 'Primária da Sidebar', desc: 'Destaque na sidebar' },
        { key: 'sidebarAccent' as const, label: 'Accent da Sidebar', desc: 'Hover na sidebar' },
        { key: 'sidebarBorder' as const, label: 'Borda da Sidebar', desc: 'Borda da sidebar' },
      ]
    },
  ];

  // ============ RENDER ============

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Criador de Temas Profissional</CardTitle>
                <CardDescription>Controle total sobre cores, gradientes, sombras e efeitos visuais</CardDescription>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mt-2">
            {([
              { key: 'create', icon: Brush, label: 'Criar' },
              { key: 'gallery', icon: Gem, label: 'Galeria' },
              { key: 'saved', icon: Heart, label: `Salvos (${savedThemes.length})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === tab.key 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* ============ CREATE TAB ============ */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Base Mode + Quick Colors */}
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-5">
              {/* Light/Dark Toggle */}
              <div className="flex items-center justify-center gap-1 p-1 bg-muted/50 rounded-lg">
                <button onClick={() => handleDarkToggle(false)}
                  className={cn("flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all",
                    !isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/80")}>
                  <Sun className="h-4 w-4" /> Claro
                </button>
                <button onClick={() => handleDarkToggle(true)}
                  className={cn("flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all",
                    isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/80")}>
                  <Moon className="h-4 w-4" /> Escuro
                </button>
              </div>

              {/* Primary + Accent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ColorPickerInline label="Cor Primária" value={primaryColor} onChange={handlePrimaryChange} description="Principal destaque do sistema" />
                <ColorPickerInline label="Cor de Destaque" value={accentColor} onChange={handleAccentChange} description="Segunda cor de destaque" />
              </div>

              {/* Quick palette */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Paleta Rápida</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['#3b82f6','#8b5cf6','#f43f5e','#10b981','#f59e0b','#0891b2','#6366f1','#ec4899','#14b8a6','#ef4444','#84cc16','#06b6d4','#7c3aed','#dc2626','#059669'].map((c) => (
                    <button key={c} onClick={() => handlePrimaryChange(c)}
                      className={cn("w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 relative",
                        primaryColor === c ? "border-foreground ring-2 ring-primary/30 scale-110" : "border-border/50 hover:border-primary/50")}
                      style={{ backgroundColor: c }} title={c}>
                      {primaryColor === c && <Check className="h-3 w-3 text-white absolute inset-0 m-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Harmony */}
              <div className="space-y-2 pt-3 border-t border-border/30">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Wand2 className="h-3 w-3" /> Harmonização</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Complementar', offset: 180 },
                    { label: 'Análoga', offset: 30 },
                    { label: 'Triádica', offset: 120 },
                    { label: 'Mono', offset: 0 },
                  ].map((harmony) => (
                    <Button key={harmony.label} variant="outline" size="sm" className="text-[10px] h-8"
                      onClick={() => {
                        const { h, s } = hexToHSL(primaryColor);
                        const newH = harmony.offset === 0 ? h : (h + harmony.offset) % 360;
                        const newS = harmony.offset === 0 ? Math.max(s - 20, 30) : 70;
                        handleAccentChange(hslToHex(newH, newS, isDark ? 60 : 50));
                        toast({ title: `🎨 ${harmony.label}` });
                      }}>
                      {harmony.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleRandomTheme} variant="outline" size="sm" className="gap-2">
                  <Shuffle className="h-4 w-4" /> Aleatório
                </Button>
                <Button onClick={handleResetTheme} variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Resetar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ============ LIVE PREVIEW ============ */}
          <CollapsibleSection title="Preview em Tempo Real" icon={Eye} defaultOpen={true} badge="Mini App">
            <MiniAppPreview theme={currentPreviewTheme} />
          </CollapsibleSection>

          {/* ============ ALL COLORS (Collapsible) ============ */}
          <CollapsibleSection title="Editar Todas as Cores" icon={Palette} badge={`${Object.keys(colors).length} cores`}>
            <div className="space-y-5">
              {colorGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                    <group.icon className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.items.map((item) => (
                      <ColorPickerInline
                        key={item.key}
                        label={item.label}
                        value={colors[item.key]}
                        onChange={(v) => handleColorChange(item.key, v)}
                        description={item.desc}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ============ GRADIENTS ============ */}
          <CollapsibleSection title="Gradientes" icon={Sparkles} badge={
            [gradients.cardGradient, gradients.primaryGradient, gradients.sidebarGradient].filter(g => g.enabled).length > 0
              ? `${[gradients.cardGradient, gradients.primaryGradient, gradients.sidebarGradient].filter(g => g.enabled).length} ativos`
              : undefined
          }>
            <div className="space-y-5">
              <GradientEditor label="Gradiente dos Cards" gradient={gradients.cardGradient}
                onChange={(g) => handleGradientsChange({ ...gradients, cardGradient: g })} />
              <GradientEditor label="Gradiente Primário (Botões)" gradient={gradients.primaryGradient}
                onChange={(g) => handleGradientsChange({ ...gradients, primaryGradient: g })} />
              <GradientEditor label="Gradiente da Sidebar" gradient={gradients.sidebarGradient}
                onChange={(g) => handleGradientsChange({ ...gradients, sidebarGradient: g })} />
              
              {/* Quick presets */}
              <div className="space-y-2 pt-3 border-t border-border/30">
                <Label className="text-xs text-muted-foreground">Presets de Gradiente</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Aurora', c1: '#6366f1', c2: '#8b5cf6' },
                    { name: 'Sunset', c1: '#f97316', c2: '#ec4899' },
                    { name: 'Ocean', c1: '#06b6d4', c2: '#3b82f6' },
                    { name: 'Forest', c1: '#059669', c2: '#10b981' },
                    { name: 'Fire', c1: '#dc2626', c2: '#f97316' },
                    { name: 'Ice', c1: '#0ea5e9', c2: '#a78bfa' },
                  ].map((p) => (
                    <button key={p.name} onClick={() => {
                      const g: CustomThemeGradients = {
                        cardGradient: { enabled: true, direction: '135deg', color1: p.c1, color2: p.c2 },
                        primaryGradient: { enabled: true, direction: '135deg', color1: p.c1, color2: p.c2 },
                        sidebarGradient: gradients.sidebarGradient,
                      };
                      handleGradientsChange(g);
                      toast({ title: `🎨 ${p.name}` });
                    }}
                      className="h-10 rounded-lg border border-border/30 hover:border-primary/50 transition-all relative overflow-hidden group"
                      style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============ SHADOWS ============ */}
          <CollapsibleSection title="Sombras" icon={Droplets} badge={
            [shadows.cardShadow, shadows.buttonShadow].filter(s => s?.enabled).length > 0
              ? `${[shadows.cardShadow, shadows.buttonShadow].filter(s => s?.enabled).length} ativas`
              : undefined
          }>
            <div className="space-y-5">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Presets Rápidos</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {shadowPresets.map((p) => (
                    <button key={p.id} onClick={() => {
                      handleShadowsChange({ ...shadows, cardShadow: { ...p.config, enabled: true } });
                      toast({ title: `${p.emoji} ${p.name}` });
                    }}
                      className="p-2 rounded-lg border border-border/50 hover:border-primary/50 transition-all text-center">
                      <div className="text-lg mb-0.5">{p.emoji}</div>
                      <div className="text-[10px] font-medium">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <ShadowEditor label="Sombra dos Cards" shadow={shadows.cardShadow}
                onChange={(s) => handleShadowsChange({ ...shadows, cardShadow: s })} />
              
              <ShadowEditor label="Sombra dos Botões" 
                shadow={shadows.buttonShadow || { ...defaultShadow, enabled: false }}
                onChange={(s) => handleShadowsChange({ ...shadows, buttonShadow: s })} />
            </div>
          </CollapsibleSection>

          {/* ============ EXPORT / IMPORT ============ */}
          <CollapsibleSection title="Compartilhamento" icon={Download}>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                const theme: CustomTheme = { name: themeName || 'Exported', colors, shadows, gradients };
                navigator.clipboard.writeText(btoa(JSON.stringify(theme)));
                toast({ title: '📋 Copiado!' });
              }}>
                <Download className="h-4 w-4" /> Exportar Código
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                const code = prompt('Cole o código do tema:');
                if (!code) return;
                try {
                  const theme = JSON.parse(atob(code));
                  if (!theme.colors || !theme.name) throw new Error();
                  setColors(theme.colors); setThemeName(theme.name + ' (Importado)');
                  setPrimaryColor(theme.colors.primary); setAccentColor(theme.colors.accent);
                  if (theme.shadows) setShadows(theme.shadows);
                  if (theme.gradients) setGradients(theme.gradients);
                  const { l } = hexToHSL(theme.colors.background); setIsDark(l < 50);
                  applyCustomTheme(theme);
                  toast({ title: '✅ Importado!' });
                } catch { toast({ title: 'Código inválido', variant: 'destructive' }); }
              }}>
                <Upload className="h-4 w-4" /> Importar Código
              </Button>
            </div>
          </CollapsibleSection>

          {/* ============ SAVE ============ */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Save className="h-5 w-5 text-primary" />
                <Label className="font-semibold">{editingThemeId ? 'Atualizar Tema' : 'Salvar Tema'}</Label>
              </div>
              <Input placeholder="Nome do tema (ex: Meu Tema Favorito)" value={themeName} onChange={(e) => setThemeName(e.target.value)} />
              
              {/* Color bar preview */}
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden border border-border/30">
                {[colors.background, colors.card, colors.primary, colors.accent, colors.success, colors.warning, colors.destructive, colors.sidebarBackground].map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveTheme} disabled={!themeName.trim()} className="flex-1 gap-2">
                  <Save className="h-4 w-4" /> {editingThemeId ? 'Atualizar' : 'Salvar'}
                </Button>
                {editingThemeId && (
                  <Button variant="outline" onClick={() => { setEditingThemeId(null); setThemeName(''); handleResetTheme(); }} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ GALLERY TAB ============ */}
      {activeTab === 'gallery' && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gem className="h-5 w-5 text-primary" /> Galeria Premium</CardTitle>
            <CardDescription>Temas profissionais prontos para usar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dark themes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Temas Escuros</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {premiumThemes.filter(p => p.isDark).map((preset) => {
                  const preview = generateAdvancedTheme(preset.primaryColor, preset.accentColor || preset.primaryColor, true);
                  return (
                    <button key={preset.id} onClick={() => handleApplyPreset(preset)}
                      className="group p-3 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg text-left">
                      <div className="relative mb-3 h-16 rounded-lg overflow-hidden border border-border/30"
                        style={{ background: `linear-gradient(135deg, ${preview.background}, ${preview.card})` }}>
                        <div className="absolute inset-0 flex items-center justify-center gap-1">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.primaryColor }} />
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.accentColor || preset.primaryColor }} />
                        </div>
                        {preset.gradient && <Sparkles className="h-3 w-3 text-white/50 absolute top-2 right-2" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{preset.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Light themes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Temas Claros</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {premiumThemes.filter(p => !p.isDark).map((preset) => {
                  const preview = generateAdvancedTheme(preset.primaryColor, preset.accentColor || preset.primaryColor, false);
                  return (
                    <button key={preset.id} onClick={() => handleApplyPreset(preset)}
                      className="group p-3 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg text-left">
                      <div className="relative mb-3 h-16 rounded-lg overflow-hidden border border-border/30"
                        style={{ background: `linear-gradient(135deg, ${preview.background}, ${preview.card})` }}>
                        <div className="absolute inset-0 flex items-center justify-center gap-1">
                          <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primaryColor }} />
                          <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accentColor || preset.primaryColor }} />
                        </div>
                        {preset.gradient && <Sparkles className="h-3 w-3 text-black/30 absolute top-2 right-2" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{preset.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ SAVED TAB ============ */}
      {activeTab === 'saved' && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Meus Temas ({savedThemes.length})</CardTitle>
                <CardDescription>Gerencie sua coleção de temas</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                  const blob = new Blob([JSON.stringify(savedThemes, null, 2)], { type: 'application/json' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `temas-${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  toast({ title: '💾 Exportado!' });
                }}>
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => document.getElementById('import-themes')?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Importar
                </Button>
                <input id="import-themes" type="file" accept=".json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const imported = JSON.parse(ev.target?.result as string);
                      if (!Array.isArray(imported)) throw new Error();
                      const valid = imported.filter((t: any) => t?.colors && t?.name);
                      if (!valid.length) throw new Error();
                      const newThemes = valid.map((t: any) => ({ ...t, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, createdAt: new Date().toISOString() }));
                      saveSavedThemes([...savedThemes, ...newThemes]);
                      toast({ title: '✅ Importado!', description: `${newThemes.length} tema(s).` });
                    } catch { toast({ title: 'Arquivo inválido', variant: 'destructive' }); }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedThemes.length === 0 ? (
              <div className="text-center py-10">
                <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-semibold mb-1">Nenhum tema salvo</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro tema na aba "Criar"</p>
                <Button onClick={() => setActiveTab('create')} className="gap-2"><Brush className="h-4 w-4" /> Criar Tema</Button>
              </div>
            ) : (
              <>
                {/* Search + Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                  </div>
                  <div className="flex gap-0.5 border rounded-lg p-0.5">
                    {(['all', 'light', 'dark'] as const).map((f) => (
                      <button key={f} onClick={() => setFilterMode(f)}
                        className={cn("px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                          filterMode === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                        {f === 'all' ? 'Todos' : f === 'light' ? <><Sun className="h-3 w-3" /> Claros</> : <><Moon className="h-3 w-3" /> Escuros</>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                {filteredSavedThemes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum tema encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSavedThemes.map((theme) => (
                      <div key={theme.id} className={cn(
                        "p-3 rounded-xl border-2 transition-all",
                        editingThemeId === theme.id ? "border-primary shadow-lg" : "border-border/50 hover:border-primary/30 hover:shadow-md")}>
                        <div className="relative mb-3 h-14 rounded-lg overflow-hidden border border-border/30"
                          style={{ background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.card})` }}>
                          <div className="absolute inset-0 flex items-center justify-center gap-1">
                            {[theme.colors.primary, theme.colors.accent, theme.colors.success].map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                        <p className="font-semibold text-sm truncate">{theme.name}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          {new Date(theme.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => handleLoadTheme(theme)}>
                            <Check className="h-3 w-3 mr-1" /> Aplicar
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5" onClick={() => handleEditTheme(theme)}>
                            <Palette className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteTheme(theme.id, theme.name)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Theme Generation ============

function generateAdvancedTheme(primary: string, accent: string, isDarkTheme: boolean): CustomThemeColors {
  const { h: primaryH, s: primaryS } = hexToHSL(primary);
  
  if (isDarkTheme) {
    return {
      background: hslToHex(primaryH, Math.min(primaryS, 12), 8),
      foreground: hslToHex(primaryH, 8, 95),
      card: hslToHex(primaryH, Math.min(primaryS, 15), 12),
      cardForeground: hslToHex(primaryH, 8, 92),
      primary: primary,
      primaryForeground: '#ffffff',
      secondary: hslToHex(primaryH, Math.min(primaryS, 18), 18),
      secondaryForeground: hslToHex(primaryH, 8, 88),
      muted: hslToHex(primaryH, Math.min(primaryS, 10), 16),
      mutedForeground: hslToHex(primaryH, 6, 65),
      accent: accent,
      accentForeground: '#ffffff',
      success: '#22c55e',
      warning: '#f59e0b',
      destructive: '#ef4444',
      border: hslToHex(primaryH, Math.min(primaryS, 12), 22),
      sidebarBackground: hslToHex(primaryH, Math.min(primaryS, 15), 6),
      sidebarForeground: hslToHex(primaryH, 8, 92),
      sidebarPrimary: primary,
      sidebarAccent: hslToHex(primaryH, Math.min(primaryS, 12), 14),
      sidebarBorder: hslToHex(primaryH, Math.min(primaryS, 10), 18),
    };
  }
  
  return {
    background: hslToHex(primaryH, Math.min(primaryS, 25), 98),
    foreground: hslToHex(primaryH, Math.min(primaryS, 20), 12),
    card: '#ffffff',
    cardForeground: hslToHex(primaryH, Math.min(primaryS, 20), 12),
    primary: primary,
    primaryForeground: '#ffffff',
    secondary: hslToHex(primaryH, Math.min(primaryS, 20), 95),
    secondaryForeground: hslToHex(primaryH, Math.min(primaryS, 20), 12),
    muted: hslToHex(primaryH, Math.min(primaryS, 12), 92),
    mutedForeground: hslToHex(primaryH, 6, 48),
    accent: accent,
    accentForeground: '#ffffff',
    success: '#16a34a',
    warning: '#d97706',
    destructive: '#dc2626',
    border: hslToHex(primaryH, Math.min(primaryS, 15), 90),
    sidebarBackground: '#ffffff',
    sidebarForeground: hslToHex(primaryH, Math.min(primaryS, 20), 12),
    sidebarPrimary: primary,
    sidebarAccent: hslToHex(primaryH, Math.min(primaryS, 20), 97),
    sidebarBorder: hslToHex(primaryH, Math.min(primaryS, 12), 92),
  };
}
