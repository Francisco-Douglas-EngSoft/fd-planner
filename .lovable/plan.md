# Plano de evolução — Biblioteca e Leitor FD-Planner

## Objetivo

Criar uma experiência profissional e confiável para organizar e estudar PDFs e EPUBs, consistente entre dispositivos e preparada para offline — sem reintroduzir Flashcards ou Mapas Mentais.

## Base atual aproveitada

- **Biblioteca:** upload múltiplo, capas/metadados PDF, categorias, status, busca, ordenação, visualizações, edição, relatórios, metas, plano com IA e limpeza de arquivos.
- **PDF:** sumário, miniaturas, busca, zoom, rotação, tela cheia, atalhos, marcadores, notas, destaques, resumo e indexação com IA.
- **EPUB:** renderização, navegação e sumário.
- **Visual:** Slate & Platinum, Space Grotesk + Inter, tokens semânticos e cantos de 5 px.

## Problemas prioritários encontrados

1. **Progresso com unidades misturadas:** PDF salva página; EPUB salva percentual em `last_read_page`. Isso contamina cards, relatórios e previsões.
2. **EPUB incompleto:** sempre abre com CFI nulo e não possui a mesma experiência de retomada, preferências, busca, marcadores e destaques do PDF.
3. **Sessões imprecisas:** o tempo considera o período total com o leitor aberto, inclusive em segundo plano; avanços e retornos de página podem distorcer páginas lidas.
4. **Divergência de status:** coexistem valores como `to-read` e `to_read`, além de conclusão automática ao simplesmente abrir a última página.
5. **Operações frágeis:** falha após o upload pode deixar arquivo órfão; a sincronização pode apagar registros durante uma simples listagem.
6. **Complexidade concentrada:** `Reader.tsx` e `LibraryReports.tsx` acumulam muitas responsabilidades, dificultando evolução e testes.
7. **Desempenho:** busca percorre o PDF inteiro no fluxo principal e miniaturas criam um item por página, sem virtualização.

---

## Etapa 1 — Fundação confiável de dados e progresso (P0)

### Entregas

- Criar uma fonte única para progresso, status e formato, usada por Biblioteca, Leitor, Marcadores e Relatórios.
- Padronizar os status para `to-read`, `reading`, `completed` e `abandoned`, com migração dos dados divergentes.
- Separar claramente:
  - PDF: página atual, posição de rolagem e percentual derivado das páginas.
  - EPUB: CFI atual e percentual próprio, nunca tratado como número de página.
- Salvar `last_read_at` para ordenar “Continuar lendo” por atividade real.
- Concluir um livro somente por ação explícita ou regra de leitura consistente, não apenas por abrir a última página/localização.
- Medir sessões por tempo ativo, pausando quando a aba ficar oculta; registrar início/fim e evitar duplicidade no encerramento.
- Preservar páginas lidas como métrica de PDF; EPUB contribui com tempo, conclusão e evolução percentual, sem conversões artificiais.
- Mover para o Supabase as metas e configurações hoje dependentes de `localStorage`, mantendo preferências visuais locais quando fizer sentido.

### Critérios de aceite

- Recarregar ou trocar de dispositivo retoma PDF na página/rolagem e EPUB na posição CFI corretos.
- Nenhum relatório interpreta percentual de EPUB como página.
- Tempo em segundo plano não aumenta horas de leitura.
- Testes automatizados cobrem conversão de progresso, status, tempo ativo e compatibilidade dos dados antigos.

## Etapa 2 — Biblioteca profissional e organização (P1)

### Nova experiência

- Reorganizar a página em **Visão geral**, **Todos os livros**, **Coleções**, **Relatórios** e **Plano de leitura**.
- Criar “Continuar lendo”, “Adicionados recentemente” e atalhos para metas, sem duplicar indicadores.
- Adicionar página/detalhes do livro com capa, metadados, progresso, última leitura, notas, destaques, marcadores e ações.
- Ativar as coleções já previstas no banco: criar, renomear, organizar e adicionar/remover livros em lote.
- Adicionar filtros combináveis por status, categoria, formato e coleção; persistir ordenação e modo de visualização.
- Implementar seleção múltipla para alterar categoria/status, organizar coleção e excluir com confirmação clara.
- Melhorar metadados com descrição, editora, ano, idioma e ISBN quando disponíveis, sem exigir preenchimento manual.
- Detectar possíveis duplicidades por arquivo/título antes do envio e permitir decidir entre manter ou cancelar.

### Upload, capas e armazenamento

- Mostrar progresso real por arquivo, permitir retry individual e cancelar itens ainda não enviados.
- Extrair também metadados e capa de EPUB.
- Se o cadastro falhar após o upload, remover automaticamente os arquivos recém-criados ou oferecer recuperação explícita.
- Substituir o `confirm()` nativo por diálogo com nome do livro e consequências da exclusão.
- Manter a sincronização Banco ↔ Storage, mas apresentar divergências em uma central de revisão; nenhuma exclusão em massa silenciosa durante a listagem.
- Transformar “Arquivos grandes/Órfãos” em **Gerenciador de armazenamento**, com espaço ocupado, vínculo com livros e exclusão segura.

### Relatórios

- Separar “progresso do acervo”, “atividade de leitura” e “metas”.
- Manter as fórmulas já consolidadas em `libraryGoals.ts`, agora alimentadas pelo progresso correto por formato.
- Reduzir gráficos redundantes e permitir filtros por período, categoria, coleção e livro.

## Etapa 3 — Leitor unificado, confortável e rápido (P1)

### Estrutura comum para PDF e EPUB

- Criar um shell único com barra superior enxuta, painel lateral recolhível e área de leitura sem distrações.
- Disponibilizar Sumário, Busca, Notas, Destaques e Marcadores em ambos os formatos, com contadores e navegação direta ao trecho.
- No celular, usar painéis em gaveta, controles com área de toque adequada e navegação por gestos sem conflito com seleção de texto.
- Adicionar modo foco, tela cheia, retomada clara e indicador discreto de salvamento/sincronização.
- Substituir prompts nativos por editores próprios para notas e confirmações.

### PDF

- Manter os recursos atuais e adicionar modos **página única** e **rolagem contínua**.
- Cancelar renderizações e buscas antigas ao trocar rapidamente de página/livro.
- Virtualizar miniaturas e resultados; indexar texto progressivamente em worker, com cache por livro e busca cancelável.
- Melhorar seleção em toque e fidelidade dos destaques após zoom, rotação e redimensionamento.

### EPUB

- Implementar retomada por CFI e geração estável de localizações/percentual.
- Adicionar fonte, tamanho, espaçamento entre linhas, margens, largura do texto, temas claro/escuro/sépia e modos paginado/rolagem.
- Adicionar busca por capítulo/livro, marcadores por CFI, seleção de texto, destaques e notas ancoradas no trecho.
- Mostrar capítulo atual e progresso sem inventar paginação equivalente ao PDF.

### Arquitetura

- Dividir o leitor em adaptadores `PdfReader` e `EpubReader` sob uma interface comum de posição, navegação, seleção e preferências.
- Isolar hooks para progresso, sessão ativa, preferências, anotações e atalhos; remover tipagens `any` das integrações críticas gradualmente.

## Etapa 4 — Caderno de estudo e IA útil (P2)

- Unificar notas soltas e comentários de destaques em um caderno pesquisável por livro, capítulo/página, cor e data.
- Permitir editar, excluir, filtrar e saltar para qualquer anotação; abrir marcadores diretamente na posição salva.
- Exportar notas, destaques e marcadores em Markdown e PDF, preservando referências ao livro e à localização.
- Evoluir a IA para resumir página ou capítulo, explicar trecho selecionado e responder com citações navegáveis à fonte.
- Permitir salvar uma resposta da IA como nota, sempre identificada como conteúdo gerado.
- Exibir progresso/estado da indexação e limites de texto; nunca bloquear a leitura por indisponibilidade da IA.
- Conectar o plano de leitura por IA a coleções/trilhas reais, com ação para aplicar a ordem sugerida sem apagar a organização atual.

## Etapa 5 — Offline, acessibilidade e qualidade (P2)

- Permitir download explícito de livros para o PWA, com estado “Disponível offline”, espaço usado e remoção individual.
- Guardar arquivos e fila de alterações em IndexedDB; sincronizar progresso, notas e marcadores ao reconectar, com regra de conflito pela atualização mais recente.
- Cachear capas e metadados; não baixar automaticamente todo o acervo.
- Garantir navegação por teclado, foco visível, rótulos acessíveis, contraste, `prefers-reduced-motion` e leitura ampliada sem perda de controles.
- Adicionar estados vazios, erro e retry específicos para arquivo ausente, formato inválido, PDF protegido/corrompido e EPUB incompatível.

### Matriz mínima de testes

- **Unitários:** progresso por formato, status, metas, tempo ativo, normalização de CFI/página e deduplicação.
- **Integração:** upload com rollback, exclusão Banco + Storage, anotações e permissões por usuário.
- **E2E:** enviar → abrir → ler → anotar/marcar → recarregar → retomar; pesquisar; concluir; filtrar; exportar; excluir.
- Executar os fluxos em PDF e EPUB, desktop e mobile, online e offline, com arquivos pequenos de teste.

## Ordem recomendada de entrega

1. **Base de progresso, sessões e segurança das operações.**
2. **Redesign da Biblioteca + coleções + detalhes do livro.**
3. **Shell unificado do Leitor + desempenho do PDF.**
4. **Paridade completa do EPUB + caderno de estudo.**
5. **IA contextual, exportações e offline avançado.**

Cada etapa será publicável separadamente, preservando os recursos atuais e evitando uma reescrita única de alto risco.

## Detalhes técnicos previstos

- Reconciliar primeiro o schema real do Supabase com `types.ts`; novas colunas/tabelas seguirão GRANTs, RLS por proprietário, timestamps e migração de dados compatível.
- Prováveis extensões: posição EPUB/CFI e última atividade em `books`; localizador por formato em `annotations` e `bookmarks`; campos de sessão ativa em `reading_sessions`; metas de plano hoje locais em `reading_goals` ou tabela própria.
- Manter a identidade Slate & Platinum e tokens semânticos, sem cores fixas nos componentes.
- Não incluir neste ciclo: Flashcards, Mapas Mentais, loja/social, MOBI/AZW3 ou edição do conteúdo dos livros.
