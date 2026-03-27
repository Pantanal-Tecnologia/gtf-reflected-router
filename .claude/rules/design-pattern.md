# Design Patterns & UI/UX Rules

Este documento define os padrões de design, identidade visual e regras de UI/UX para o projeto **gtf-mapas**. Siga estas diretrizes ao criar novos componentes ou modificar telas existentes.

## Identidade Visual & Design System

### Filosofia de Design

- **Premium & Moderno**: Interface limpa, com foco em usabilidade e performance.

### Tipografia (Google Sans Flex)

- **Flexibilidade**: Utilize pesos intermediários (ex: `font-variation-settings: 'wght' 550`) para labels de campos de busca, fugindo do binário Regular/Bold.
- **Hierarquia**: Em títulos de seções, utilize `tracking-tight` para um visual mais denso e moderno de "aplicativo nativo".

### Glassmorphism (Especificação Avançada)

Deve ser aplicado em elementos que flutuam sobre o mapa para criar profundidade sem perder o contexto visual:

- **Sombra Difusa**: Use sombras profundas como `shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]` para aumentar a percepção de distância do mapa.
- **Blur & Transparência**: Use `backdrop-blur-xl` combinado com `bg-card/85` para um efeito de vidro premium.
- **Borda Lapidada**: Aplique bordas sutis com baixa opacidade para simular o corte do vidro.
- **Casos de Uso**:
  - **Componentes Flutuantes**: Painéis de busca, sidebars (como `SuppliersSidebar`) e controles de rota.
  - **Overlays Full-screen**: Como o `TripModeOverlay`, permitindo visualização desfocada do mapa ao fundo.
  - **Tooltips e Floating Cards**: Balões de informação e resumos de rota.

### Sistema de Cores (OKLCH)

O projeto utiliza o espaço de cores **OKLCH** para garantir uniformidade e brilho em diferentes dispositivos.

- **Base**: `oklch(0.98 0 0)` (Light) / `oklch(0.15 0 0)` (Dark).
- **Primary**: `oklch(0.52 0.14 210)` (Azul Premium).
- **Success**: `oklch(0.65 0.15 145)`.
- **Warning**: `oklch(0.75 0.15 85)`.
- **Destructive**: `oklch(0.55 0.22 25)`.
- **Severity Levels**: Cores específicas para Baixo, Médio, Alto e Crítico.

### Border Radius

- **Padrão (lg)**: `1rem` (16px).
- **Variações**: `sm`, `md`, `xl` baseadas no token `--radius`.

## Regras de Implementação (UI/UX)

### 1. Componentização

- **Foco Único**: Crie componentes pequenos e reutilizáveis em `src/components/`.
- **shadcn/ui First**: Utilize os componentes da biblioteca shadcn/ui antes de criar novos do zero.
- **Acessibilidade**: Sempre inclua atributos `aria-label`, `aria-hidden` e suporte a teclado.

### 2. Estilização

- **Tailwind v4 Inline Theme**: Use os tokens do @theme (`primary`, `border`, `card`, etc).
- **Dark Mode**: Suporte nativo via classe `.dark`. Use variantes `dark:` para ajustes específicos.
- **Scrollbars**: Use as utilidades `.custom-scrollbar` ou `.scrollbar-hide` definidas em `styles.css`.

### 3. Layout & Responsividade

- **Mobile First**: Garanta que as telas funcionem bem em dispositivos móveis.
- **Grids & Flexbox**: Use `grid` e `flex` para layouts dinâmicos. Evite tamanhos fixos desnecessários.
- **Sidebar**: O sistema possui uma sidebar integrada (`--sidebar`). Respeite seus tokens de cor e bordas.

### 4. Padrões de Interação & Micro-animações

- **Feedback Visual**:
  - Use animações de "Count-up" para valores numéricos em dashboards e resumos.
  - Em mapas, anime a linha da rota (`polyline`) para se desenhar progressivamente ao carregar.
- **Skeleton Screens**: Use esqueletos fluidos com `animate-pulse` que mimiquem a estrutura real do componente em vez de spinners genéricos.
- **Hover & Focus**: Todos os elementos interativos devem ter estados de `hover` e `focus-visible` claros, preferencialmente com transições suaves e pequenas variações de escala (`active:scale-95`).

### 5. Modo Viagem (HUD Style)

- **Estética HUD**: Para o `TripModeOverlay`, use uma estética de "Heads-Up Display".
- **Contraste**: Elementos grandes, ícones vibrantes com efeitos de brilho (Glow) e tipografia em negrito para facilitar a leitura rápida durante o deslocamento.
- **Interatividade Gráfico-Mapa**: Ao interagir com o gráfico de elevação, o marcador correspondente no mapa deve ser destacado em tempo real.

### 6. Visualização de Dados & Estados Vazios

- **Consistent Charts**: Use as cores dos tokens de gráfico (`--chart-1` a `--chart-8`).
- **Empty States**: Use ilustrações personalizadas que sigam a paleta OKLCH para manter o engajamento em listas vazias ou erros.
