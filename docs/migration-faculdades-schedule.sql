-- Migration: Adicionar suporte para agendamento de disciplinas por dia da semana
-- Data: 2026-02-22
-- Descrição: Permite que usuários selecionem quais disciplinas estudar em cada dia da semana

-- Adicionar campos na tabela study_plan_modules para suportar agendamento por dia
ALTER TABLE study_plan_modules 
ADD COLUMN IF NOT EXISTS study_days TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon', 'evening', NULL)),
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_hours NUMERIC DEFAULT 2;

-- Adicionar comentários para documentação
COMMENT ON COLUMN study_plan_modules.study_days IS 'Dias da semana em que a disciplina será estudada (monday, tuesday, etc)';
COMMENT ON COLUMN study_plan_modules.time_slot IS 'Período do dia (morning, afternoon, evening) - opcional';
COMMENT ON COLUMN study_plan_modules.sequence_order IS 'Ordem de estudo no dia (1 = primeiro, 2 = segundo, etc)';
COMMENT ON COLUMN study_plan_modules.daily_hours IS 'Horas de estudo por dia para esta disciplina';

-- Criar índice para melhorar performance de queries por dia
CREATE INDEX IF NOT EXISTS idx_study_plan_modules_days 
ON study_plan_modules USING GIN (study_days);

-- Criar índice para ordenação
CREATE INDEX IF NOT EXISTS idx_study_plan_modules_sequence 
ON study_plan_modules(study_plan_id, sequence_order);

-- Verificar integridade dos dados
DO $$
BEGIN
  -- Atualizar registros existentes com valores padrão se necessário
  UPDATE study_plan_modules
  SET study_days = '{}'
  WHERE study_days IS NULL;
  
  UPDATE study_plan_modules
  SET sequence_order = 1
  WHERE sequence_order IS NULL;
  
  UPDATE study_plan_modules
  SET daily_hours = 2
  WHERE daily_hours IS NULL OR daily_hours = 0;
  
  RAISE NOTICE 'Migration concluída com sucesso!';
END $$;
