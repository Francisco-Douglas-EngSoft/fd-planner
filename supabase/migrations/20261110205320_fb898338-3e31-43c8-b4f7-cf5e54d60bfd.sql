ALTER TABLE public.rotina_tarefas
  ADD COLUMN IF NOT EXISTS lembrete_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lembrete_min_antes integer NOT NULL DEFAULT 0;

ALTER TABLE public.rotina_tarefas
  ADD CONSTRAINT rotina_tarefas_lembrete_min_antes_faixa
  CHECK (lembrete_min_antes >= 0 AND lembrete_min_antes <= 240);