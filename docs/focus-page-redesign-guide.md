# Guia de Redesign da Página de Foco

## Análise da Imagem de Referência

### Características Principais do Design

1. **Dark Theme Profissional**
   - Fundo: Gradiente escuro (slate-950 → slate-900)
   - Cards: Fundo semi-transparente com bordas sutis
   - Texto: Hierarquia clara com cores contrastantes

2. **Layout em Grid Moderno**
   ```
   ┌─────────────────────────────────────────────────┐
   │  Top Bar (Streak + Controls)                    │
   ├──────────────────┬──────────────────────────────┤
   │                  │                              │
   │  Timer Principal │  Sidebar (Curso/Hoje/Config) │
   │  (Grande, Centro)│  - Seleção de Planejamento   │
   │                  │  - Lista de Cursos           │
   │                  │  - Progresso                 │
   │                  │  - Configurações             │
   ├──────────────────┴──────────────────────────────┤
   │  Metas (Diária + Semanal) - Cards Horizontais   │
   ├──────────────────────────────────────────────────┤
   │  Stats Row (Sessões + Tempo + P/Meta)           │
   └──────────────────────────────────────────────────┘
   ```

3. **Timer Central Minimalista**
   - Círculo grande e limpo
   - Fundo verde vibrante (#10b981 / emerald-500)
   - Texto grande e legível
   - Controles simples e diretos
   - Badge do curso no topo

4. **Sidebar Organizada**
   - Tabs para navegação (Curso / Hoje / Ajustes)
   - Cards com fundo escuro
   - Informações hierarquizadas
   - Espaçamento generoso

5. **Metas Visuais**
   - Cards horizontais lado a lado
   - Ícones coloridos (verde para diária, roxo para semanal)
   - Progress bars destacadas
   - Percentuais grandes e visíveis

## Melhorias Recomendadas

### 1. Estrutura de Cores

```css
/* Background */
bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950

/* Cards */
bg-slate-900/50 border-slate-800/50

/* Timer (Foco) */
bg-gradient-to-br from-emerald-500 to-emerald-600

/* Timer (Pausa) */
bg-gradient-to-br from-amber-500 to-amber-600

/* Accent Colors */
- Primary (Foco): emerald-500
- Secondary (Pausa): amber-500
- Meta Diária: emerald-500
- Meta Semanal: purple-500
- Sessões: blue-500
- Tempo: emerald-500
- P/Meta: amber-500
```

### 2. Tipografia

```css
/* Timer */
font-size: 4rem (64px)
font-weight: 700
font-family: 'Inter', sans-serif
letter-spacing: -0.02em

/* Títulos de Cards */
font-size: 0.875rem (14px)
font-weight: 600
text-transform: uppercase
letter-spacing: 0.05em

/* Valores de Stats */
font-size: 2rem (32px)
font-weight: 700
```

### 3. Espaçamento

```css
/* Container Principal */
max-width: 1400px
padding: 1.5rem

/* Gap entre elementos */
gap: 1.5rem (24px)

/* Padding interno de cards */
padding: 1.5rem (24px)

/* Border radius */
border-radius: 1rem (16px)
```

### 4. Componentes Específicos

#### Timer Card
- Remover gradientes complexos
- Fundo sólido verde (#10b981)
- Círculo de progresso mais fino (stroke-width: 3)
- Remover efeitos de glow excessivos
- Controles maiores e mais espaçados

#### Metas (Diária/Semanal)
- Layout horizontal (grid-cols-2)
- Ícones maiores (h-5 w-5)
- Progress bar mais grossa (h-2.5)
- Percentual em destaque

#### Stats Row
- 3 colunas iguais
- Ícones coloridos por categoria
- Valores grandes e centralizados
- Labels pequenas embaixo

#### Sidebar
- Tabs com fundo escuro
- Seletor de planejamento destacado
- Lista de cursos com checkboxes
- Scroll suave

### 5. Animações

```css
/* Reduzir animações excessivas */
- Remover múltiplos glows pulsantes
- Manter apenas transições suaves
- Fade in/out simples
- Scale sutil em hover (1.02)
```

### 6. Responsividade

```css
/* Desktop (>1024px) */
- Grid 2 colunas (timer + sidebar)
- Metas em linha
- Stats em linha

/* Tablet (768-1024px) */
- Grid 1 coluna
- Metas em linha
- Stats em linha

/* Mobile (<768px) */
- Stack vertical
- Metas empilhadas
- Stats empilhadas
```

## Implementação Sugerida

### Fase 1: Estrutura Base
1. Atualizar container principal com dark theme
2. Reorganizar grid layout
3. Ajustar espaçamentos

### Fase 2: Timer
1. Simplificar design do timer
2. Remover gradientes complexos
3. Melhorar controles
4. Ajustar tipografia

### Fase 3: Sidebar
1. Melhorar tabs
2. Redesenhar seletor de planejamento
3. Otimizar lista de cursos
4. Adicionar scroll suave

### Fase 4: Metas e Stats
1. Redesenhar cards de metas
2. Melhorar visualização de progresso
3. Atualizar stats row
4. Adicionar ícones coloridos

### Fase 5: Polimento
1. Ajustar cores finais
2. Otimizar animações
3. Testar responsividade
4. Melhorar acessibilidade

## Componentes a Criar/Modificar

### Novos Componentes
- `FocusTimerMinimal.tsx` - Timer simplificado
- `GoalCard.tsx` - Card de meta reutilizável
- `StatCard.tsx` - Card de estatística reutilizável

### Componentes a Modificar
- `Focus.tsx` - Layout principal
- `FocusMode.tsx` - Lógica do timer
- `FocusGoalsPanel.tsx` - Painel de metas

### Componentes a Remover/Simplificar
- Efeitos visuais excessivos
- Animações complexas
- Gradientes múltiplos

## Checklist de Implementação

- [ ] Atualizar tema de cores (dark theme)
- [ ] Reorganizar layout em grid
- [ ] Simplificar timer principal
- [ ] Redesenhar sidebar com tabs
- [ ] Melhorar cards de metas
- [ ] Atualizar stats row
- [ ] Remover animações excessivas
- [ ] Ajustar tipografia
- [ ] Otimizar espaçamentos
- [ ] Testar responsividade
- [ ] Validar acessibilidade
- [ ] Documentar mudanças

## Referências de Código

### Timer Simplificado
```tsx
<div className="relative w-full max-w-md mx-auto">
  <div className="aspect-square rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 shadow-2xl">
    <div className="h-full flex flex-col items-center justify-center text-white">
      <div className="text-6xl font-bold tabular-nums">
        {formatSecondsToHMS(timeLeft)}
      </div>
      <div className="text-sm opacity-80 mt-2">
        {formatMinutesToHMS(studiedMinutes)} / {formatMinutesToHMS(goalMinutes)}
      </div>
    </div>
  </div>
</div>
```

### Meta Card
```tsx
<Card className="bg-slate-900/50 border-slate-800/50">
  <CardContent className="p-6">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-500" />
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Meta Diária
        </span>
      </div>
      <span className="text-2xl font-bold text-emerald-500">
        {Math.round(progressPercent)}%
      </span>
    </div>
    <Progress value={progressPercent} className="h-2.5 mb-3" />
    <div className="flex justify-between text-sm text-slate-400">
      <span>{formatMinutesToHMS(studiedMinutes)}</span>
      <span>{formatMinutesToHMS(goalMinutes)}</span>
    </div>
  </CardContent>
</Card>
```

### Stat Card
```tsx
<Card className="bg-slate-900/50 border-slate-800/50 text-center">
  <CardContent className="p-6">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mb-3">
      <Target className="h-6 w-6 text-blue-500" />
    </div>
    <div className="text-3xl font-bold text-white mb-1">
      {value}
    </div>
    <div className="text-xs text-slate-400 uppercase tracking-wide">
      {label}
    </div>
  </CardContent>
</Card>
```

## Próximos Passos

1. Revisar e aprovar o design proposto
2. Criar branch para redesign
3. Implementar mudanças incrementalmente
4. Testar em diferentes dispositivos
5. Coletar feedback
6. Iterar e refinar
7. Merge para produção
