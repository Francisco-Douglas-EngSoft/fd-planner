-- ============================================================
-- Migração: adiciona cor de identificação livre (HEX) a cursos
-- e libera weight_color de módulos para aceitar HEX livre.
-- Executar uma única vez no Supabase SQL editor.
-- ============================================================

-- 1) Coluna de cor de identificação no curso (opcional, HEX como #rrggbb)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS color text;

COMMENT ON COLUMN public.courses.color IS
  'Cor de identificação do curso em formato HEX (#rrggbb). NULL = sem cor.';

-- 2) weight_color em course_modules já é text e aceita qualquer string
--    (atualmente armazena ''green''/''yellow''/''red''). A partir de agora pode
--    armazenar também HEX (#rrggbb). Não é necessário ALTER, apenas garantir
--    que valores existentes continuam válidos (retrocompatibilidade no front).
COMMENT ON COLUMN public.course_modules.weight_color IS
  'Cor do módulo: aceita os valores legados ''green''/''yellow''/''red'' (dificuldade) ou um HEX livre #rrggbb.';
