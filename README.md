<div align="center">

# 📚 FD-Planner

**Plataforma completa de gestão de estudos, produtividade e desenvolvimento pessoal**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## Visão Geral

O **FD-Planner** é uma aplicação web progressiva (PWA) focada em estudantes e profissionais que querem organizar sua rotina de aprendizado com propósito. O sistema centraliza gestão de cursos, planejamentos semanais, sessões de foco (Pomodoro), anotações ricas, biblioteca digital e um assistente de IA — tudo em uma única plataforma.

Com suporte a modo offline, notificações push via Firebase, gamificação com conquistas e XP, e um módulo dedicado ao controle de comportamentos compulsivos (AntiVício), o FD-Planner vai além de um simples organizador: é um ambiente de desenvolvimento pessoal completo.

O backend é 100% gerenciado pelo Supabase (PostgreSQL + Auth + Storage + Edge Functions), garantindo segurança por Row Level Security em todas as tabelas e escalabilidade sem infraestrutura própria.

---

## Funcionalidades

### 📊 Dashboard
- Visão geral do progresso diário, streaks e métricas de horas estudadas
- Gráficos de evolução com Recharts
- Acesso rápido às seções mais usadas

### 📖 Cursos e Módulos
- Cadastro de cursos com categorias, capa e status (`pendente → em andamento → concluído`)
- Gerenciamento de módulos e submódulos com horas alocadas
- Controle de revisão por módulo (flags de revisão + datas)
- Marcação como favorito e acompanhamento de horas completadas

### 🗓️ Planejamentos de Estudo
- Criação de planos por curso ou módulo com datas de início/fim
- Alocação de horas diárias e dias da semana
- Blocos de tempo por dia da semana (estudo/pausa)
- Progresso diário registrado com notas
- Metas semanais e mensais com acompanhamento automático

### ⏱️ Foco (Pomodoro)
- Timer configurável com sessões de trabalho e pausas
- Vinculação de sessão a curso/módulo
- Histórico de sessões registrado no banco

### ✅ Tarefas
- Gestão de tarefas com prioridade, status e prazo
- Vinculação a cursos
- Fluxo: `pendente → em andamento → concluído`

### 📝 Notas
- Editor rico com Tiptap (formatação, tabelas, listas, links, imagens, blocos de código)
- Tags, mood e vinculação a cursos
- Suporte a markdown

### 📚 Biblioteca e Leitor
- Upload de livros em PDF/ePub com armazenamento no Supabase Storage
- Leitor integrado com suporte a ePub (epubjs) e PDF (pdfjs-dist)
- Indexação de páginas por IA para busca semântica
- Bookmarks por livro

### 🤖 Assistente de IA
- Chat com IA (Gemini via AI SDK) para resumos, questões, explicações e planos de estudo
- Geração de flashcards a partir de conteúdo de texto
- Geração de mapas mentais persistidos no banco
- Edge Functions serverless no Supabase com rate limiting

### 🏆 Conquistas e Gamificação
- Sistema de XP e níveis
- Conquistas desbloqueáveis por metas (horas, streaks, módulos concluídos)

### 🚫 AntiVício
- Perfil de dependências configurável
- Check-ins diários com humor, impulsos e autocontrole
- Metas de recuperação com rastreamento de dias sem recaída

### 🌐 Redes e Perfil
- Perfil público com currículo, projetos, certificados e links sociais
- Página de instalação PWA com instruções por dispositivo

### 🔔 Notificações e PWA
- Notificações push via Firebase Cloud Messaging
- Instalável como app nativo em Android, iOS e Windows
- Funciona offline com Workbox (cache-first + sync de mutações em fila)

### 🔒 Segurança
- Autenticação via Supabase Auth (email/senha + OAuth)
- Row Level Security em 100% das tabelas
- CSP restritivo via meta tags, LGPD-compliant
- Rate limiting nas Edge Functions

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework UI | React 18 + TypeScript 5 |
| Bundler | Vite 6 + @vitejs/plugin-react-swc |
| Estilização | Tailwind CSS 3 + tailwindcss-animate |
| Componentes | shadcn/ui (Radix UI primitives) |
| Roteamento | React Router DOM v6 |
| Estado assíncrono | TanStack Query v5 |
| Formulários | React Hook Form + Zod |
| Editor de texto | Tiptap v3 (extensível, rico) |
| Gráficos | Recharts |
| Animações | Framer Motion |
| Drag & Drop | @dnd-kit |
| AI / LLM | Vercel AI SDK (`ai` + `@ai-sdk/react`) |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Edge Functions | Deno (deploy no Supabase) |
| Push Notifications | Firebase Cloud Messaging |
| PDF / ePub | pdfjs-dist + epubjs |
| PWA | vite-plugin-pwa + Workbox |
| Testes unitários | Vitest + Testing Library |
| Testes E2E | Playwright |
| Monitoramento | Sentry |
| PDF Export | jsPDF + jspdf-autotable |
| Markdown | react-markdown + turndown |

---

## Estrutura do Projeto

```
fd-planner/
├── src/
│   ├── pages/           # Rotas da aplicação (Dashboard, Courses, Focus, etc.)
│   ├── components/      # Componentes reutilizáveis e de layout
│   │   ├── ui/          # Primitivos shadcn/ui
│   │   ├── layout/      # MainLayout, sidebar, header
│   │   ├── pwa/         # InstallPrompt, banners
│   │   ├── security/    # CookieConsentBanner
│   │   └── notifications/
│   ├── contexts/        # ThemeContext, AuthContext
│   ├── hooks/           # Hooks customizados (useUserRole, etc.)
│   ├── integrations/
│   │   └── supabase/    # Client Supabase + tipos gerados
│   ├── services/        # Serviços de negócio (Firebase, etc.)
│   ├── pwa/             # Registro do service worker
│   ├── lib/             # Utilitários (cn, formatters)
│   ├── types/           # Tipos TypeScript globais
│   └── assets/          # Imagens e recursos estáticos
├── supabase/
│   ├── functions/       # Edge Functions (ai-assistant, generate-flashcards, etc.)
│   ├── migrations/      # Migrations SQL do banco
│   └── tests/           # Testes das Edge Functions
├── docs/                # Scripts SQL de migração e documentação técnica
├── e2e/                 # Testes end-to-end com Playwright
├── public/              # Assets públicos (icons, manifest implícito via PWA plugin)
└── vite.config.ts       # Configuração do Vite + PWA
```

---

## Banco de Dados

O banco é PostgreSQL gerenciado pelo Supabase com RLS habilitado em todas as tabelas.

| Tabela | Descrição |
|---|---|
| `profiles` | Perfil do usuário (XP, nível, streak, meta de horas) |
| `courses` | Cursos cadastrados pelo usuário |
| `course_modules` | Módulos de cada curso (horas, ordem, revisão) |
| `course_submodules` | Submódulos aninhados |
| `study_plans` | Planos de estudo com período e dias de estudo |
| `study_plan_courses` | Cursos alocados a um plano |
| `study_plan_modules` | Módulos alocados a um plano |
| `study_plan_time_blocks` | Blocos de tempo por dia da semana |
| `daily_study_progress` | Horas estudadas por dia por curso/plano |
| `focus_sessions` | Sessões Pomodoro concluídas |
| `tasks` | Tarefas com prioridade, status e prazo |
| `study_notes` | Notas ricas vinculadas a cursos |
| `study_reminders` | Lembretes de estudo configuráveis |
| `weekly_goals` / `monthly_goals` | Metas periódicas com progresso |
| `achievements` / `user_achievements` | Sistema de conquistas e desbloqueios |
| `addiction_profiles` / `addiction_checkins` | Módulo AntiVício |
| `recovery_goals` | Metas de recuperação comportamental |
| `books` | Biblioteca de livros PDF/ePub |
| `pdf_pages` | Páginas indexadas por IA |
| `bookmarks` | Marcadores de livros |
| `mind_maps` / `mind_map_nodes` | Mapas mentais gerados por IA |
| `flashcards` | Flashcards gerados por IA |
| `user_resume` / `user_projects` / `user_certificates` | Perfil profissional |
| `user_social_links` | Links sociais do perfil |

**Funções RPC / Stored Procedures:**
- `update_updated_at_column()` — atualiza `updated_at` via trigger
- `handle_new_user()` — cria perfil automaticamente no cadastro
- `validate_study_plan_time_block()` — valida blocos de tempo
- `update_course_hours()` — recalcula horas do curso ao alterar módulos

---

## Início Rápido

### Pré-requisitos

- Node.js 20+ e npm 10+
- Conta no [Supabase](https://supabase.com) (projeto criado)
- Conta no [Firebase](https://firebase.google.com) (opcional, para notificações push)

### Instalação

```bash
git clone https://github.com/Francisco-Douglas-EngSoft/fd-planner.git
cd fd-planner
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz com base no `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Firebase (opcional)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=

# Sentry (opcional)
VITE_SENTRY_DSN=
```

### Banco de Dados

Execute o script `docs/migration-schema.sql` no SQL Editor do seu projeto Supabase para criar todas as tabelas, políticas RLS e funções.

### Rodando em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`.

---

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development (com sourcemaps) |
| `npm run preview` | Pré-visualiza o build de produção localmente |
| `npm run lint` | Executa o ESLint em todos os arquivos |
| `npm run test` | Executa os testes unitários com Vitest (modo run) |
| `npm run test:watch` | Executa os testes em modo watch |
| `npm run e2e` | Executa os testes end-to-end com Playwright |
| `npm run audit:prod` | Auditoria de segurança apenas das deps de produção |

---

## Deploy

O FD-Planner é uma SPA estática com PWA — compatível com qualquer plataforma de hospedagem estática:

| Plataforma | Comando / Configuração |
|---|---|
| **Vercel** | Conecte o repositório e defina as variáveis de ambiente no painel |
| **Netlify** | Build command: `npm run build` · Publish directory: `dist` |
| **Cloudflare Pages** | Build command: `npm run build` · Output directory: `dist` |

> Configure as variáveis de ambiente `VITE_*` no painel da plataforma escolhida antes do primeiro deploy.

---

## Contribuindo

1. Faça um fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feat/nome-da-feature`
3. Faça commits seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` nova funcionalidade
   - `fix:` correção de bug
   - `refactor:` refatoração sem mudança de comportamento
   - `docs:` atualização de documentação
4. Abra um Pull Request descrevendo o que foi feito e como foi testado

---

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

## Desenvolvedor

<div align="center">

<img src="https://avatars.githubusercontent.com/Francisco-Douglas-EngSoft" width="96" style="border-radius:50%" alt="Francisco Douglas" />

### Francisco Douglas

**Full Stack Developer · Java, Spring Boot & AI Solutions**  
Engenharia de Software · Campinas, SP 🇧🇷

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Francisco-Douglas-EngSoft)

</div>

Estudante de Engenharia de Software (Descomplica/UniAmerica, conclusão em 2028) com histórico
em gestão educacional, logística e manutenção técnica. Essa trajetória multidisciplinar moldou
uma visão analítica voltada para entender as dores reais dos usuários e transformá-las em
software funcional e escalável.

**Linguagens**

![Java](https://img.shields.io/badge/Java-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

**Frameworks & Bibliotecas**

![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![SASS](https://img.shields.io/badge/SASS-CC6699?style=flat-square&logo=sass&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white)

**Banco de Dados**

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white)

**Ferramentas & Plataformas**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)
![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=flat-square&logo=postman&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)

---

<div align="center">
  <sub>Desenvolvido por <strong>Francisco Douglas</strong>.</sub>
</div>
