import { useMemo, useState } from 'react';
import { ClipboardPaste, Wand2, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseModulesText, ParsedModule } from '@/lib/moduleParser';

export interface PastedModule {
  name: string;
  hours: number;
  subModules: { name: string; hours: number }[];
}

interface PasteModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (modules: PastedModule[], mode: 'replace' | 'append') => void;
  hasExistingModules?: boolean;
}

const formatHours = (hours: number) => {
  const total = Math.round(hours * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const EXAMPLE = `Módulo 1 - Introdução (2h)
  1.1 Boas-vindas 10 min
  1.2 Configurando o ambiente 25 min
Módulo 2 - Fundamentos
  - Variáveis e tipos 00:35:00
  - Funções 1h15`;

export function PasteModulesDialog({
  open,
  onOpenChange,
  onConfirm,
  hasExistingModules,
}: PasteModulesDialogProps) {
  const [text, setText] = useState('');
  const [flat, setFlat] = useState(false);
  const [defaultModuleHours, setDefaultModuleHours] = useState('01:00:00');
  const [defaultSubHours, setDefaultSubHours] = useState('00:30:00');

  const toHours = (value: string) => {
    const p = value.split(':').map(Number);
    if (p.length === 3) return (p[0] || 0) + (p[1] || 0) / 60 + (p[2] || 0) / 3600;
    if (p.length === 2) return (p[0] || 0) + (p[1] || 0) / 60;
    return parseFloat(value) || 1;
  };

  const parsed: ParsedModule[] = useMemo(
    () =>
      parseModulesText(text, {
        flat,
        defaultModuleHours: toHours(defaultModuleHours),
        defaultSubHours: toHours(defaultSubHours),
      }),
    [text, flat, defaultModuleHours, defaultSubHours],
  );

  const totalHours = parsed.reduce((sum, m) => sum + m.hours, 0);
  const totalSubs = parsed.reduce((sum, m) => sum + m.subModules.length, 0);

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText((prev) => (prev ? `${prev}\n${clip}` : clip));
    } catch {
      /* usuário pode colar manualmente */
    }
  };

  const confirm = (mode: 'replace' | 'append') => {
    onConfirm(parsed, mode);
    setText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[92vw] md:!max-w-[760px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Colar módulos
          </DialogTitle>
          <DialogDescription className="text-sm">
            Cole a lista de módulos/aulas copiada de qualquer site. O sistema separa automaticamente
            módulos, submódulos e a carga horária.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Conteúdo colado</Label>
              <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                <ClipboardPaste className="h-4 w-4 mr-2" />
                Colar da área de transferência
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              rows={9}
              className="text-sm font-mono resize-y"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Carga padrão do módulo</Label>
              <Input
                value={defaultModuleHours}
                onChange={(e) => setDefaultModuleHours(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Carga padrão do submódulo</Label>
              <Input
                value={defaultSubHours}
                onChange={(e) => setDefaultSubHours(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch id="flat" checked={flat} onCheckedChange={setFlat} />
              <Label htmlFor="flat" className="text-xs leading-tight">
                Tudo como módulo (sem submódulos)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Prévia
              </Label>
              <span className="text-xs text-muted-foreground">
                {parsed.length} módulo(s) · {totalSubs} submódulo(s) · {formatHours(totalHours)}
              </span>
            </div>
            <ScrollArea className="h-56 border bg-muted/20 p-3">
              {parsed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Cole o conteúdo acima para ver a separação automática.
                </p>
              ) : (
                <div className="space-y-2">
                  {parsed.map((m, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium truncate">
                          {i + 1}. {m.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {formatHours(m.hours)}
                        </span>
                      </div>
                      {m.subModules.map((s, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between gap-2 pl-5 text-xs text-muted-foreground"
                        >
                          <span className="truncate">— {s.name}</span>
                          <span className="font-mono shrink-0">{formatHours(s.hours)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
              Cancelar
            </Button>
            {hasExistingModules && (
              <Button
                type="button"
                variant="secondary"
                disabled={parsed.length === 0}
                onClick={() => confirm('append')}
                className="h-10 text-sm"
              >
                Adicionar aos existentes
              </Button>
            )}
            <Button
              type="button"
              disabled={parsed.length === 0}
              onClick={() => confirm('replace')}
              className="h-10 text-sm"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Usar {parsed.length} módulo(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}