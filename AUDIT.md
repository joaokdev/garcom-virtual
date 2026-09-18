# Auditoria — Redesign Apple-inspired do Comanda

## 1. Estrutura atual
Next.js 16 App Router, Tailwind v4 (config CSS-first via `@theme` em `globals.css`,
sem `tailwind.config.js`), Framer Motion, Zustand, PostgreSQL. Seis contextos de
tela bem separados: Cliente (`/m`), Cozinha (`/cozinha`), Garçom (`/garcom`),
Admin (`/admin`), Financeiro (`/financeiro`), Hub/login (`/hub`, `/login`).
`src/components/ui/` já é um pequeno design system interno (Button, Badge, Sheet,
IconButton, Dialog, Skeleton, Switch, QuantityStepper...).

## 2. O que já existe (e é bom)
- **Sistema de marca por restaurante já é dado real, não mockup**: `--brand` e
  `--accent` são injetados em runtime por tenant, com `getReadableForeground()`
  calculando contraste automaticamente. Isso é a peça mais crítica do produto —
  qualquer redesign tem que continuar passando por essas duas variáveis, nunca
  hardcodar cor de marca em componente.
- Sheets já usam spring físico com drag 1:1 e rubber-band no fechar (`Sheet.tsx`)
  — já segue o princípio de interruptibilidade do design fluido da Apple, só
  faltava nomear.
- Telas de operação (Cozinha/Garçom/Financeiro/Admin) já são conceitualmente
  separadas do tema claro/escuro do Cliente via `--color-well-*` — exatamente a
  distinção "content vs. control room" que o redesign pede.
- `.ticket-edge-bottom` (borda picotada) é uma assinatura visual própria do
  domínio (comanda de cozinha) que vale a pena preservar — é identidade, não
  ruído genérico.

## 3. Inconsistências visuais encontradas
- Raio de borda usa só dois valores (`--radius-card`, `--radius-sheet`) sem
  hierarquia — card de produto e sheet inteira têm o mesmo raio.
- Sombra (`--shadow-card/lift/floating`) já existe mas é aplicada de forma
  binária (tem ou não tem), sem relação com o "peso" real da superfície.
- Nenhum material translúcido no projeto hoje — toolbars/headers são sólidos
  (`bg-paper`), então navegação e conteúdo competem por atenção da mesma forma.
- Tipografia tem só a fonte (Fraunces/Jakarta), não uma escala com
  tracking/leading por tamanho — títulos grandes usam o mesmo letter-spacing
  que corpo de texto.

## 4. Decisão em aberto (não decidi por você)
O prompt-mestre pede system font estilo SF Pro. `Fraunces` (display, serifada)
já é usada para títulos hoje e **não é** uma fonte "extravagante" no sentido que
o prompt quer evitar (Poppins/Montserrat/decorativa) — é uma escolha editorial
deliberada que já funciona com a identidade "cozinha premium" do produto.
Troquei a escala de tamanho/tracking/leading para seguir a disciplina da Apple,
mas mantive Fraunces no `--font-display`. Se você quiser ir 100% system-font
(sem serifa nenhuma), é uma troca de uma linha em `globals.css`
(`--font-display`) — mas isso muda a personalidade do produto, então preferi
sinalizar em vez de decidir sozinho.

## 5. O que foi entregue nesta rodada (Fases 1–2 do roadmap de 19 fases)
- `globals.css`: sistema de materiais (`--material-*` → `.material-ultra-thin`
  `.material-thin` `.material-regular` `.material-thick`, + variantes `-well-*`
  para as telas de operação), hierarquia de raio (`--radius-xs` a `--radius-xl`),
  sombra em 4 níveis, escala tipográfica completa (`.text-display` a
  `.text-caption`) com tracking/leading por tamanho, luz ambiente sutil
  (`.ambient-light`), e fallback automático para `prefers-reduced-transparency`.
  **Tudo aditivo** — nenhuma classe existente foi removida, nenhuma tela quebra.
- `src/components/ui/Material.tsx`: primitivo novo — a peça que todo componente
  funcional (navbar, sheet, toolbar, menu) vai usar daqui pra frente.
- `Button.tsx`: variante `glass` adicionada (usa a camada 3), sem alterar as
  variantes existentes.

## 5b. Fase 3 — feito nesta rodada
- `Header.tsx`: era `bg-stone/75 backdrop-blur-xl` solto (blur sem sistema) →
  agora `.material-thin` (camada 3 de verdade, com o fallback de acessibilidade
  já embutido).
- `Sheet.tsx`: era `bg-paper` sólido com `shadow-floating` → agora
  `.material-thick` (é literalmente o elemento flutuante mais comum do
  produto). Título trocado de `font-display` para `.text-title` — chrome
  funcional usa a fonte de corpo, não a de identidade editorial. Removi o
  `bg-paper` duplicado do footer para não empilhar dois materiais.
- `IconButton.tsx` (variant `ghost`): era `bg-paper/80` + borda →
  `.material-ultra-thin`, o nível mais discreto (ação pequena sobre um header
  que já é material).
- **Varredura de raio em ~30 arquivos**: todo `rounded-2xl` → `rounded-[var(--radius-lg)]`,
  `rounded-xl` → `rounded-[var(--radius-md)]`, `rounded-3xl` → `rounded-[var(--radius-xl)]`.
  Troca mecânica e de baixo risco (valores a poucos pixels de diferença do
  Tailwind padrão), mas agora **uma decisão de raio muda o produto inteiro
  de um lugar só** — exatamente o critério do §41 do prompt-mestre.
- Não toquei: cores de conteúdo (produtos, cards de cardápio, tabelas do
  financeiro) nem nenhuma tela de fluxo (Cliente/Cozinha/Garçom/Admin/Financeiro)
  — essas dependem de ver renderizado para não quebrar legibilidade real.

## 5c. Fase 4/8 — feito nesta rodada (overlays + financeiro)
- `Dialog.tsx` e `Toaster.tsx`: eram `bg-paper` sólido + `shadow-floating`/borda
  → `.material-thick` e `.material-thick` respectivamente — são exatamente os
  dois casos que o prompt cita em §33/§34 (toast discreto e flutuante, modal
  como overlay contextual).
- `MetricCard.tsx` (Financeiro): era a caixa "ícone + label + valor" que o
  próprio prompt usa como **exemplo do que não fazer** em §28. Removi a
  moldura por métrica; a hierarquia agora vem do tamanho do número
  (`text-[2rem] font-mono font-bold`), não de uma caixa ao redor. As 4
  métricas do topo do Financeiro passaram a viver numa composição única
  (`FinancialApp.tsx`), com divisores sutis entre elas em vez de 4 cards
  soltos.
- Continua pendente ver isso renderizado — divisores em grid responsivo são
  um dos pontos mais fáceis de sair sutilmente errados sem visual real.

## 5d. Fase 6/7 — feito nesta rodada (varredura de headers/nav em todos os módulos)
- Revisei `Switch`, `QuantityStepper`, `StarRating`, `Skeleton`, `SearchBar`,
  `CategoryNav`: já estavam corretos — são controles de camada 1/2 (conteúdo),
  não devem virar vidro, e o `CategoryNav` já usa `layoutId` compartilhado pra
  pílula "deslizar" entre categorias, que é exatamente a indicação sofisticada
  de item ativo que o §26/27 pede. Nenhuma mudança forçada onde não precisava.
- Achei (via grep) **7 headers/navs duplicados fora do `Header.tsx` genérico**,
  cada um com seu próprio `bg-x/85 backdrop-blur-xl` solto — sinal de que o
  material nunca tinha sido centralizado de verdade. Migrados todos:
  - `AdminApp.tsx`, `RestaurantHubClient.tsx`, `admin/dashboard/page.tsx`,
    `CustomerApp.tsx` (barra de categorias fixa) → `.material-thin` (vocabulário
    claro do Cliente/Admin).
  - `KitchenApp.tsx` (header) → `.material-well-regular` — cozinha prioriza
    legibilidade a distância (§22), por isso o nível mais opaco, não o mais fino.
  - `WaiterApp.tsx` (header + bottom nav) → `.material-well-thin` /
    `.material-well-regular` — vocabulário escuro da "sala de controle".
- Não toquei: `ImageDropzone` (botão pequeno sobre imagem, já correto) e os
  scrims de `Dialog`/`Sheet` (blur de fundo, não é o material da superfície).

## 5e. Fase 8/9/21 — feito nesta rodada
- Revisei `MenuItemCard.tsx`, `KitchenOrderCard.tsx`, `CategoryNav.tsx`: já
  seguem a regra do redesign (conteúdo fica claro, sem vidro; cozinha prioriza
  contraste sólido, não decoração). Não mudei nada aqui pra não fazer efeito
  "porque dá", que o próprio prompt proíbe em §15/§49.
- `FinancialApp.tsx` / `AdminApp.tsx`: títulos de seção e cabeçalho migrados
  pra escala tipográfica (`.text-headline`, `.text-title`) por consistência.
- **`OrderProgressTrack.tsx` — o alvo real que faltava.** Era só uma cor de
  fundo trocando (`transition-colors`), sem nenhum motion; o prompt pede
  explicitamente "sensação de acompanhamento em tempo real" em §21, não texto
  estático. Reescrito com Framer Motion: o estágio atual pulsa sutilmente
  (com `useReducedMotion` desligando o pulso pra quem pede menos animação —
  §38), a linha de progresso preenche com spring em vez de cortar seco, e o
  rótulo do estágio troca com um slide pequeno em vez de substituição abrupta.
  Lógica de estágios (`STAGES`, índice atual) não foi tocada — só a camada
  visual por cima dela.

## 5f. Correções e feature nova — nesta rodada
- **Bug real corrigido**: `next.config.ts` bloqueava `eval()` via CSP mesmo em
  dev, quebrando o overlay de erro do Next/Turbopack. `unsafe-eval` agora só
  é liberado quando `NODE_ENV !== "production"` — build de produção continua
  tão restrito quanto antes.
- **Gap real achado e corrigido**: a aba "Módulos" do painel (`/r/[slug]`)
  tinha Produtos, Cozinha e Financeiro, mas faltava o Painel do Garçom.
- **Feature nova**: antes não existia nenhuma forma de criar/remover mesa
  pela interface — todo restaurante nascia travado nas 4 mesas padrão do
  onboarding. Adicionado: `createTable`/`deactivateTable` (repositório,
  `restaurants.ts`), rota `api/tables` (POST/DELETE, mesmo padrão de
  autorização do `waiter-management` — só manager do próprio restaurante ou
  superadmin), e a aba "Mesas" do hub ganhou botão "+ Mesa" e remoção
  (soft delete — mantém histórico de pedidos da mesa removida).
- Login do cliente **já existia** — vive em `/r/[slug]` → aba "Mesas" → toca
  numa mesa → abre `/m/{slug}/{token}`. Não confundir com `/hub`, que é o
  formulário de *criar* um restaurante novo, não o painel dele.

## 5g. Fase 10/17 — carrinho + acessibilidade de motion
- `CartSheet.tsx`: itens do carrinho não tinham nenhuma transição — sumiam
  instantaneamente ao remover. Agora entram/saem com spring e `layout`
  (a lista reacomoda suavemente em vez de pular), e o **total rola
  verticalmente** quando muda, então o usuário vê o valor reagir à ação dele.
  Cálculo de subtotal/taxa/total não foi tocado.
- `CartFab.tsx`: revisado, **não mexido** — já pulsa ao adicionar item e tem
  badge com spring. Estava certo.
- **Lacuna real de acessibilidade corrigida**: o `@media (prefers-reduced-motion)`
  do `globals.css` só afeta animações CSS — o Framer Motion anima via JS e
  ignorava a preferência completamente. Ou seja, quem ligava "reduzir
  movimento" no sistema continuava recebendo todas as transições de sheet,
  carrinho e status. Adicionado `MotionProvider` (`MotionConfig
  reducedMotion="user"`) no `layout.tsx`, cobrindo o app inteiro de uma vez.
  O `useReducedMotion` explícito do `OrderProgressTrack` continua necessário
  porque `MotionConfig` não desliga animações em loop infinito.

## 5h. Fases finais (11–19) — última rodada
- **Fase 16 (responsividade)** — lacuna real: o cardápio do cliente não tinha
  largura máxima. Em tablet paisagem/TV as linhas esticavam sem limite (nome de
  um lado, preço do outro, muito longe). Agora `max-w-3xl`, e a partir de `lg`
  duas colunas — aproveita a largura sem virar "desktop encolhido" (§36).
- **Cozinha** (`grid-cols-3` kanban) e **Garçom**: revisados, **não mexidos**.
  O kanban de 3 colunas é decisão operacional, não descuido visual — mudar
  quebraria o modelo de trabalho da cozinha.
- `.ambient-light` estava criada na Fase 2 e **nunca usada** (token morto =
  a inconsistência que o §45 manda caçar). Aplicada no cardápio do cliente, que
  é a tela de apresentação, e corrigida: virou `position: fixed` (a luz é do
  ambiente — em `absolute` ela ficava pra trás ao rolar um cardápio longo) e
  `inset: 0` em vez de `-20%`, que estourava a largura e criava scroll
  horizontal no tablet.

## 7. Validação executada (finalmente de verdade)
Instalei as dependências no ambiente e rodei as verificações reais:
- `npx tsc --noEmit` → **passou**. Pegou um erro real no meu próprio código:
  `createTable` assumia que o INSERT sempre devolve linha (`rows[0]` podia ser
  `undefined`). Corrigido com verificação explícita.
- `npm run build` → **passou**, todas as rotas compilando, incluindo a
  `/api/tables` nova.
- `npx eslint .` → 3 erros **pré-existentes** (`setState` dentro de efeito em
  `AdminApp`, `ProductFormSheet`, `FinancialApp`) e 2 avisos de diretiva
  eslint-disable sem uso. Não foram introduzidos por este redesign e não
  bloqueiam o build — deixei intactos porque corrigir envolveria mexer na
  lógica de carregamento de dados desses painéis, fora do escopo visual.

## 8. O que ainda exige olho humano
Compila e tipa, mas compilar não é o mesmo que estar visualmente certo. Falta
conferir renderizado: o carrinho em uso real (item entrando/saindo), a luz
ambiente no tablet (se ficou sutil mesmo ou aparece demais), as duas colunas do
cardápio em `lg`, e principalmente **o fluxo novo de criar/remover mesa**, que é
a única mudança aqui que toca banco e autorização.

## 5i. Polimento final (§45) — consolidação de tokens
Última passada caçando inconsistências, incluindo as que **este redesign
introduziu**: as Fases 1–2 deixaram dois sistemas paralelos rodando lado a
lado — `--radius-card/sheet` + `--radius-xs..xl`, e `--shadow-card/lift/
floating` + `--shadow-xs..lg`, cada par com valores próprios, e o dark mode
duplicando tudo de novo. Isso é exatamente a duplicação que o §41 diz que não
pode existir ("não quero editar 70 arquivos").
Consolidado: os nomes legados agora são **aliases** (`--shadow-card:
var(--shadow-sm)`), não valores próprios. Uma escala só, definida uma vez por
tema; os ~30 arquivos que usam os nomes antigos continuam funcionando e passam
a herdar qualquer mudança futura automaticamente.

Revalidado depois da consolidação: `npm run build` e `tsc --noEmit` passando.

## 6. Roadmap restante (Fases 9–19, o que ainda falta de verdade)
Fases 3–8 (cores refinadas, controles, navegação, cards/listas/tabelas) tocam
~15 componentes de `ui/` e `layout/` — seguras de migrar em uma sessão dedicada
porque são isoladas. Fases 9–14 (Cliente, Carrinho, Cozinha, Garçom, Admin,
Financeiro) tocam **os fluxos reais do produto** — cada uma precisa rodar a
aplicação, testar o fluxo (pedido de ponta a ponta, mesa a mesa) e comparar
visualmente antes/depois, tela por tela, não só ler o código.

Isso é trabalho de sessão longa com execução real (rodar `npm run dev`, ver o
resultado renderizado, iterar) — não cabe com qualidade num único turno de
chat. Recomendo continuar as Fases 3–19 no **Claude Code**, que consegue rodar
o projeto, navegar as telas e iterar fase a fase mantendo o app funcional o
tempo todo. Posso seguir migrando componente por componente por aqui também,
mas sem rodar o dev server real o risco de regressão visual não detectada é
maior.
