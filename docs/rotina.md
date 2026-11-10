# Módulo Rotina Diária

Rastreador de hábitos e tarefas diárias (checklist + painel), em `/rotina`.

## Arquivos criados
- `src/rotina/RotinaPage.tsx` — tela com as abas Hoje, Tarefas e Painel
- `src/rotina/tipos.ts`, `datas.ts`, `calculos.ts` (regras puras), `api.ts` (acesso aos dados + validação), `hooks.ts` (estado/otimismo), `confete.ts`
- `src/rotina/components/` — `TelaHoje`, `LinhaDoTempo`, `FaixaSemana`, `AnelProgresso`, `GerenciarTarefas`, `GerenciarCategorias`, `Painel`, `MapaCalor`
- `src/rotina/__tests__/calculos.test.ts` (streak, percentuais, estatísticas, CSV) e `marcarTarefa.test.tsx` (integração marcar/desmarcar)
- Migração: tabelas `rotina_categorias`, `rotina_tarefas`, `rotina_conclusoes`, `rotina_config` e a função `rotina_inicializar()`

## Arquivos modificados (mínimo)
- `src/App.tsx` — rota `/rotina`
- `src/components/layout/AppSidebar.tsx` e `BottomNavigation.tsx` — item "Rotina" no menu
- `src/hooks/usePageSwipeNavigation.ts` — `/rotina` na ordem de deslize

## Correspondência com a API pedida
| Pedido | Implementação (`src/rotina/api.ts`) |
| --- | --- |
| GET/POST /rotina/tarefas, PUT/DELETE /rotina/tarefas/{id} | `listarTarefas`, `criarTarefa`, `atualizarTarefa`, `removerTarefa` |
| GET /rotina/dias/{data} | `listarConclusoes` + `resumoDoDia` |
| PUT /rotina/dias/{data}/tarefas/{id} | `marcarTarefa` |
| POST /rotina/dias/{data}/concluir-tudo | `concluirTudo` |
| DELETE /rotina/dias/{data}/conclusoes | `limparDia` |
| GET /rotina/estatisticas/semana, mes, calor, streak | `estatisticasDoPeriodo`, `resumosDoIntervalo`, `calcularStreak`, `maiorSequencia` |
| GET /rotina/exportar?formato=csv | `gerarCsv` (botão no Painel) |

## Rodar testes
`npm test` (ou `npx vitest run src/rotina`).

## Desfazer o módulo por completo
1. Apague a pasta `src/rotina/` e este arquivo.
2. Remova a rota `/rotina` de `App.tsx`, o item "Rotina" do menu lateral e do menu do celular, e `/rotina` de `usePageSwipeNavigation.ts`.
3. Rode no banco:
```sql
DROP FUNCTION IF EXISTS public.rotina_inicializar();
DROP TABLE IF EXISTS public.rotina_conclusoes;
DROP TABLE IF EXISTS public.rotina_tarefas;
DROP TABLE IF EXISTS public.rotina_categorias;
DROP TABLE IF EXISTS public.rotina_config;
```

## Lembretes

- Cada tarefa tem `lembrete_ativo` e `lembrete_min_antes` (0–240 min) em `rotina_tarefas`.
- Regras puras em `src/rotina/lembretes.ts` (só avisa em tarefa ativa, com lembrete ligado e no dia da semana marcado; não repete; aviso atrasado até 10 min).
- `components/LembretesRotina.tsx` roda em qualquer tela enquanto o app está aberto; `components/Lembretes.tsx` tem o sino de cada tarefa e o cartão de resumo.
- `public/sw-avisos.js` (carregado pelo service worker) abre a Rotina ao tocar no aviso.
- Para remover: apague esses arquivos, o `<AuthenticatedRotinaReminders />` em `src/App.tsx` e o `importScripts` em `vite.config.ts`.
