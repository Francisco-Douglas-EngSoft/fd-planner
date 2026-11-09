import { Palette, Rows3, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MODE_LABELS, pageFilter, type ReaderAppearance, type ReaderMode } from "./readerAppearance";

interface Props {
  value: ReaderAppearance;
  onChange: (patch: Partial<ReaderAppearance>) => void;
  className?: string;
}

const MODES: ReaderMode[] = ["normal", "sepia", "dim", "night"];

/** Aparência da página: modo de cor, brilho e rolagem contínua. */
export function AppearancePopover({ value, onChange, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-9 w-9 sm:h-8 sm:w-8", className)} title="Aparência e leitura" aria-label="Aparência e leitura">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4" align="end">
        <div className="space-y-2">
          <p className="text-xs font-semibold">Cor da página</p>
          <div className="grid grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ mode: m })}
                className={cn(
                  "flex flex-col items-center gap-1 text-[10px] p-1 border transition-colors",
                  value.mode === m ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={value.mode === m}
              >
                {/* Amostra: uma "página" branca com o mesmo filtro aplicado */}
                <span
                  className="h-8 w-full border border-border flex items-center justify-center text-[9px]"
                  style={{ filter: pageFilter({ mode: m, brightness: 100 }), background: "hsl(0 0% 100%)", color: "hsl(0 0% 10%)" }}
                >
                  Aa
                </span>
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> Brilho</span>
            <span className="tabular-nums text-muted-foreground">{value.brightness}%</span>
          </div>
          <Slider
            min={50}
            max={110}
            step={5}
            value={[value.brightness]}
            onValueChange={([b]) => onChange({ brightness: b })}
            aria-label="Brilho da página"
          />
        </div>

        <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
          <span className="flex items-center gap-1.5">
            <Rows3 className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold block">Rolagem contínua</span>
              <span className="text-muted-foreground">Role as páginas em vez de virar uma a uma</span>
            </span>
          </span>
          <Switch checked={value.continuous} onCheckedChange={(c) => onChange({ continuous: c })} />
        </label>
      </PopoverContent>
    </Popover>
  );
}
