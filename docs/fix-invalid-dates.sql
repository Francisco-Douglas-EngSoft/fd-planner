-- Script para corrigir datas inválidas em study_plans
-- Data: 2026-02-22
-- Descrição: Corrige datas com anos inválidos (< 1900 ou > 2100)

-- 1. Fazer backup dos dados antes de corrigir
CREATE TABLE IF NOT EXISTS study_plans_backup_20260222 AS 
SELECT * FROM study_plans;

-- 2. Verificar quais planos têm datas inválidas
SELECT 
  id,
  name,
  start_date,
  end_date,
  EXTRACT(YEAR FROM start_date) as start_year,
  EXTRACT(YEAR FROM end_date) as end_year,
  created_at
FROM study_plans
WHERE 
  start_date IS NULL 
  OR end_date IS NULL
  OR EXTRACT(YEAR FROM start_date) < 1900
  OR EXTRACT(YEAR FROM end_date) < 1900
  OR EXTRACT(YEAR FROM start_date) > 2100
  OR EXTRACT(YEAR FROM end_date) > 2100
  OR end_date <= start_date
ORDER BY created_at DESC;

-- 3. Corrigir datas inválidas
-- Opção A: Definir para data atual + 30 dias
UPDATE study_plans
SET 
  start_date = CURRENT_DATE,
  end_date = CURRENT_DATE + INTERVAL '30 days'
WHERE 
  start_date IS NULL 
  OR end_date IS NULL
  OR EXTRACT(YEAR FROM start_date) < 1900
  OR EXTRACT(YEAR FROM end_date) < 1900
  OR EXTRACT(YEAR FROM start_date) > 2100
  OR EXTRACT(YEAR FROM end_date) > 2100
  OR end_date <= start_date;

-- 4. Verificar se as correções foram aplicadas
SELECT 
  id,
  name,
  start_date,
  end_date,
  EXTRACT(YEAR FROM start_date) as start_year,
  EXTRACT(YEAR FROM end_date) as end_year,
  (end_date - start_date) as duration_days
FROM study_plans
ORDER BY created_at DESC
LIMIT 20;

-- 5. Verificar se ainda há datas problemáticas
SELECT COUNT(*) as problematic_plans
FROM study_plans
WHERE 
  start_date IS NULL 
  OR end_date IS NULL
  OR EXTRACT(YEAR FROM start_date) < 1900
  OR EXTRACT(YEAR FROM end_date) < 1900
  OR EXTRACT(YEAR FROM start_date) > 2100
  OR EXTRACT(YEAR FROM end_date) > 2100
  OR end_date <= start_date;

-- 6. (Opcional) Se quiser restaurar do backup:
-- DROP TABLE study_plans;
-- ALTER TABLE study_plans_backup_20260222 RENAME TO study_plans;

COMMENT ON TABLE study_plans_backup_20260222 IS 'Backup antes de corrigir datas inválidas em 2026-02-22';
