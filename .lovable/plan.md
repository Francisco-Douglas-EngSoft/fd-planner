# Plano: FD-Planner funcionando offline + melhorias de desempenho

## Objetivo
Abrir e usar o sistema sem internet: ver cursos, planejamentos, metas, usar o Foco (Pomodoro), ler livros já baixados e registrar progresso. Tudo é sincronizado automaticamente com o Supabase quando a internet volta. Também reduz a lentidão e os erros 504 de hoje, porque o sistema passa a abrir com dados locais em vez de esperar o servidor.

## Etapa 1 — Abrir sem internet
- O app instalado (celular/PC) abre mesmo offline, com telas e ícones guardados no aparelho.
- Aviso discreto no topo: "Você está offline — alterações serão sincronizadas".
- Login: se o usuário já entrou antes, a sessão fica guardada e o sistema abre direto, sem precisar do servidor de login.

## Etapa 2 — Dados guardados no aparelho
- Cursos, módulos, planejamentos, metas, conquistas, eventos e lista da Biblioteca ficam guardados no aparelho.
- As telas abrem na hora com os dados locais e se atualizam em segundo plano quando há internet. Isso resolve a demora para carregar.

## Etapa 3 — Usar e editar offline
- Concluir módulos, sessões de Foco, criar/editar planejamentos e notas, progresso de leitura: tudo é salvo no aparelho numa "fila de envio".
- Quando a internet volta, a fila é enviada em ordem. Se houver conflito, vale a alteração mais recente, sem perder nada.
- Indicador "X alterações pendentes" com botão "Sincronizar agora".

## Etapa 4 — Livros offline
- Botão "Disponível offline" em cada livro (PDF/EPUB), que guarda o arquivo e a capa no aparelho.
- Tela de armazenamento mostra quanto espaço os livros ocupam e permite remover os baixados.

## Etapa 5 — Desempenho e resiliência
- Carregamento das telas por partes, para abrir mais rápido.
- Tempo limite nas chamadas ao Supabase: se ele não responder (504), o app usa os dados locais em vez de travar.
- Menos chamadas repetidas ao abrir o Dashboard.

## Limitações
- O Assistente IA, o Plano de Leitura com IA, as notificações e o primeiro login precisam de internet.
- O modo offline funciona no app publicado/instalado, não na pré-visualização do editor.

## Detalhes técnicos
- `vite-plugin-pwa` (generateSW), registro só pelo `src/pwa/registerServiceWorker.ts` com proteções de preview, `/sw.js`, navegação NetworkFirst, assets com hash CacheFirst, exclusão de `/~oauth`; `firebase-messaging-sw.js` continua intacto.
- Cache de dados: persister do React Query em IndexedDB (`idb`), com `networkMode: "offlineFirst"`.
- Fila de mutações em IndexedDB (tabela, operação, payload, timestamp), processada no evento `online`, com last-write-wins por `updated_at`.
- Livros: blobs no IndexedDB com chave pelo `book.id`; o leitor tenta o local antes do Storage.
- Wrapper de fetch com timeout (~10 s) e fallback para o cache.
- Testes: fila de sincronização (ordem, conflito, retry) e fallback de timeout.
