# Auto-Ocultar Planejamentos Completados

## Funcionalidade Implementada

A página de Foco agora oculta automaticamente os planejamentos que já completaram a meta de estudo do dia, mantendo visíveis apenas os planejamentos pendentes.

## Como Funciona

### 1. Cálculo de Progresso Diário
- O sistema calcula o total de minutos estudados hoje para cada curso do planejamento
- Compara com a meta diária configurada (`daily_hours` do plano)
- Se o total estudado >= meta diária, o planejamento é ocultado da lista "Ativos Hoje"

### 2. Filtragem Automática
Os planejamentos são filtrados considerando:
- ✅ Está dentro do período (start_date <= hoje <= end_date)
- ✅ Hoje é um dia de estudo configurado (study_days)
- ✅ Tem cursos ativos (não todos marcados como concluídos)
- ✅ **NOVO:** Não completou a meta diária de estudo

### 3. Atualização em Tempo Real
- A lista é atualizada automaticamente quando:
  - Uma sessão de foco é completada
  - Um curso é atualizado
  - O timer é pausado/retomado
- Usa o hook `useRealtimeFocusSessions` para detectar mudanças

### 4. Reset Diário Automático
- No dia seguinte (00:00), todos os planejamentos aparecem novamente
- Não requer nenhuma ação manual do usuário
- O cálculo é baseado na data atual (hoje)

## Interface do Usuário

### Lista de Planejamentos
```
📅 Ativos Hoje
├─ Planejamento A (pendente)
├─ Planejamento B (pendente)
└─ [Planejamento C oculto - meta completada]

📚 Todos os Planejamentos
├─ Planejamento A
├─ Planejamento B
└─ Planejamento C
```

### Mensagem de Conclusão
Quando todos os planejamentos do dia são completados:
```
✅ Parabéns! 🎉
Você completou todas as metas de estudo do dia!
Os planejamentos aparecerão novamente amanhã.
```

### Dropdown de Seleção
- **Seção "Ativos Hoje"**: Mostra apenas planejamentos pendentes
- **Seção "Todos os Planejamentos"**: Mostra todos, incluindo os completados (com opacidade reduzida)

## Lógica de Implementação

### Código Principal (Focus.tsx)

```typescript
// Buscar sessões de foco de hoje
const { data: todaySessions } = await supabase
  .from('focus_sessions')
  .select('course_id, duration_minutes')
  .eq('user_id', user.id)
  .gte('completed_at', startOfDay.toISOString())
  .lte('completed_at', endOfDay.toISOString());

// Criar mapa de minutos estudados por curso
const studiedMinutesByCourse: Record<string, number> = {};
todaySessions?.forEach(session => {
  if (session.course_id) {
    studiedMinutesByCourse[session.course_id] = 
      (studiedMinutesByCourse[session.course_id] || 0) + 
      (session.duration_minutes || 0);
  }
});

// Filtrar planos ativos
const activePlans = data.filter(plan => {
  // ... verificações de período, dia de estudo, cursos ativos
  
  // Calcular total estudado nos cursos deste plano
  let totalStudiedMinutes = 0;
  plan.study_plan_courses?.forEach(pc => {
    if (pc.course_id && studiedMinutesByCourse[pc.course_id]) {
      totalStudiedMinutes += studiedMinutesByCourse[pc.course_id];
    }
  });
  
  // Ocultar se completou a meta
  const dailyGoalMinutes = (plan.daily_hours || 0) * 60;
  const hasCompletedDailyGoal = totalStudiedMinutes >= dailyGoalMinutes;
  return !hasCompletedDailyGoal;
});
```

## Benefícios

1. **Foco no que importa**: Usuário vê apenas o que ainda precisa estudar
2. **Motivação visual**: Ver a lista diminuir conforme completa as metas
3. **Automático**: Não requer ação manual para ocultar/mostrar
4. **Transparente**: Todos os planos ainda acessíveis na seção "Todos"
5. **Feedback positivo**: Mensagem de parabéns quando tudo é completado

## Casos de Uso

### Cenário 1: Início do Dia
- Usuário abre a página de Foco às 8h
- Vê 3 planejamentos ativos para hoje
- Começa a estudar o primeiro

### Cenário 2: Durante o Dia
- Completa a meta do primeiro planejamento (2h)
- O planejamento desaparece da lista "Ativos Hoje"
- Restam 2 planejamentos visíveis
- Continua com o próximo

### Cenário 3: Fim do Dia
- Completa todos os planejamentos
- Vê mensagem de parabéns
- Lista "Ativos Hoje" fica vazia
- Pode ainda acessar qualquer plano pela seção "Todos"

### Cenário 4: Dia Seguinte
- Abre a página às 8h do dia seguinte
- Todos os 3 planejamentos aparecem novamente
- Ciclo recomeça

## Configuração

Não há configuração necessária. A funcionalidade é automática e baseada em:
- `study_plans.daily_hours`: Meta diária em horas
- `focus_sessions.duration_minutes`: Tempo estudado
- Data atual do sistema

## Observações Técnicas

- A verificação é feita no lado do cliente (React)
- Usa queries do Supabase para buscar sessões do dia
- Performance otimizada: apenas uma query adicional por atualização
- Compatível com realtime updates do Supabase
- Não modifica dados no banco (apenas filtragem visual)
