# Plano de Melhoria: Metas de Estudo e Sincronização com Foco

Este plano visa aprimorar a configuração de metas diárias nos planejamentos e garantir que essas metas sejam refletidas de forma inteligente na página de Foco, com suporte a ritmos mínimo, ideal e máximo.

## 1. Melhorias no Formulário de Planejamento (`PlanningFormDialog.tsx`)
- Adicionar campos explícitos para **Horas Mínimas Diárias** e **Horas Máximas Diárias**.
- Melhorar a seção "Meta de Estudos por Dia" para tornar esses limites mais visíveis.
- Garantir que esses valores sejam salvos nas colunas correspondentes (`min_daily_hours`, `max_daily_hours`) na tabela `study_plans`.

## 2. Refinamento da Lógica de Ritmo (`studyPaceCalculator.ts`)
- Ajustar `derivePaceConfig` para usar os novos valores salvos no banco.
- Refinar `evaluatePace` e `computeWeeklyExpectation` para garantir consistência total entre o que foi planejado e o que é exibido no Foco.

## 3. Página de Foco e Painel de Metas (`Focus.tsx`, `FocusGoalsPanel.tsx`, `PaceIndicatorCard.tsx`)
- Atualizar o `PaceIndicatorCard` para mostrar claramente os limites (Mínimo, Ideal, Máximo) baseados no planejamento.
- No `FocusGoalsPanel`, incluir a visualização da meta diária específica do planejamento ativo, não apenas metas genéricas.
- Ajustar a `DailyAgenda` para refletir o status de conclusão baseado no tempo estudado real vs planejado.

## 4. Metas de Módulos
- Melhorar a visualização do progresso dos módulos nos diálogos de detalhes.
- Sincronizar a carga horária dos módulos selecionados com as metas de horas totais do planejamento.

## Detalhes Técnicos
- **Frontend**: React, Tailwind CSS, Lucide icons.
- **Backend**: Supabase (tabela `study_plans`, `study_plan_courses`).
- **Lógica**: Date-fns para cálculos de tempo e prazos.
