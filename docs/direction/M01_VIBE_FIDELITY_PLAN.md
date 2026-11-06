# Plano — M01 com a intensidade de WaW / WWII, sem fugir da história

## Contexto

O proprietário jogou a M01 no Vercel (#80 @ `bfae565c`) e não sentiu a "vibe" de CoD WaW / WWII. Pediu cinco coisas:
1. **Muitos soldados à volta**, a leste e a oeste.
2. **Ver alemães ao longe** (blindados, viaturas, artilharia), se historicamente plausível.
3. **IA aliada menos burra.**
4. **Objetivos sem espera**: acabar uma tarefa e ter logo a seguinte, sem ficar à espera da hora.
5. **Mundo vivo**: a batalha acontece em todo o lado, não só à volta do jogador.

Limite: não fugir muito do contexto histórico.

O que a exploração mostrou:
- **Ritmo:** os objetivos já se encadeiam por ações. As esperas vêm de gatilhos `battleClock` e da escala dos segmentos (`mission.json` `clock.segments`, `src/game/m01-pacing.js`). Esperas maiores:
  - retirada 06:10–06:44, ≈ 240 s reais (presa à regra B4, em que a carga oeste espera pela entrega do Bąk);
  - espera pelo comboio 04:42–04:45, ≈ 49 s;
  - ataque aéreo 05:30–05:34, ≈ 32 s;
  - aproximação dos aviões 04:33–04:34, ≈ 50 s;
  - portão oeste 06:44–06:45, ≈ 30 s.

  Já existem mecanismos para comprimir: `compress`/`when` (`m01-pacing.js:24–48`), `readyScale` e `gate` (`m01-simulation.js:570–595`).
- **Aliados:**
  - a guarnição oeste é `displayOnly` (`src/game/m01-garrison.js:34`): não reage, não dispara, não se abriga;
  - o fogo da secção é só apresentação antes das 06:05 (`src/game/m01-section.js:2–57`);
  - os postos são fixos (`m01-squad.js:17–19`) e a secção não acompanha o jogador;
  - um homem suprimido bloqueia a fila (`m01-simulation.js:1224–1229`).
- **Presença:** 24 homens do pelotão leste, a secção, os sapadores, a guarnição da ckm e 6 da guarnição oeste. Orçamento de soldados com skin 18/24/48; impostores 64/96/128 por nação (`src/render/m01-impostors.js:16–19`), mais baratos.
- **Longe:**
  - existe: paisagem distante, impostores, os três Ju 87, o Panzerzug e o comboio 963 (`renderState.panzerzug`/`train963`), os clarões do leste (`m01-display-fire.js`) e setores sonoros distantes (`battlefield-audio.js:651–659`, `DISTANT_SECTORS`);
  - não existe: artilharia, blindados, viaturas ou movimento alemão simulado fora do leste;
  - o "mundo vivo" de hoje é quase só som.
- **Fontes que permitem mostrar:**
  - Panzerzug 7 (existência DOCUMENTED; armamento de fonte única);
  - artilharia contra os dois acessos (H01 p.133, PARCIAL);
  - Ju 87 da 3./StG 1;
  - comboio 963;
  - SS-Heimwehr Danzig a norte, com artilharia, morteiros e blindados às ~07:00 (fonte única, tipo do blindado desconhecido).

  O padrão reutilizável para setores distantes vivos (setores com promoção impostor ↔ ator e eventos com atraso `d/343`) está em `src/world/m02-horizon-system.js`.

## Regras que valem para todos os pacotes

- As **horas dos eventos históricos não mudam** (bombardeamento 04:34, comboio 04:45, Panzerzug 04:52, demolições 06:10 e 06:45, ~07:00 a norte). A compressão só encurta o tempo real entre eles.
- **Nada de modelos, insígnias ou números inventados no ecrã.** Os blindados são cascos genéricos. Cada elemento novo fica classificado nos dados como DOCUMENTED, RECONSTRUCTED ou GAMEPLAY_DRAMATIZATION, com fonte.
- **Simulação e renderer:** a simulação guarda dados e é determinística. O renderer só desenha. Cada mudança no Ato I passa por uma nova emenda do golden e pela auditoria. Os saves antigos continuam a carregar.
- **Processo:** cada pacote é feito em worktree, com testes focados, revisão crítica independente (simulação e saves), integração na #80 (já autorizada) e pré-visualização no Vercel para o proprietário jogar.

## Princípio que governa tudo: o jogo é um relato simulado do que aconteceu — pelo menos 80 % fiel à história

Decisão do proprietário: a M01 é uma simulação do que aconteceu em Tczew a 1/9/1939, e no mínimo 80 % do que o jogador vive tem de ser fiel à história. A intensidade de WaW/WWII vem de mostrar bem o que aconteceu, e não de inventar.

- **Medida da fidelidade:**
  - cada elemento do jogo é classificado em `history-context.json`:
    - **DOCUMENTED** (com fonte);
    - **RECONSTRUCTED** (deduzido de fontes: posições, formas, tarefas plausíveis);
    - **GAMEPLAY_DRAMATIZATION** (inventado);
  - elementos classificados: eventos, objetivos, falas, grupos e efetivos, veículos, horas mostradas, cenas dos atos;
  - a ferramenta `tools/verification/m01-fidelity-audit.mjs` calcula a fidelidade como (DOCUMENTED + RECONSTRUCTED) / total, ponderada pelo tempo de jogo de cada elemento;
  - o alvo é ≥ 80 % por ato e no total, e um teste falha se ficar abaixo.
- **V-1, primeira auditoria do jogo atual:** mede a fidelidade de hoje no Ato I e nos atos VII-a, VII-b e VII-c. Lista o que é dramatização. Partes que podem passar do limite:
  - o efetivo e as duas investidas do VII-b;
  - a luta de infantaria do VII-a (D45);
  - o mensageiro do VII-c;
  - a escolta.

  Propõe o que reduzir ou trocar por versões com base histórica. O proprietário decide caso a caso.
- **Regras para conteúdo novo:**
  - **Soldados e efetivos:** proporcionais às fontes (2.º Batalhão de Atiradores, pelotões e guarnições de T03/T08/H01).
  - **Alemães ao longe:** só os que as fontes registam: Gruppe Medem com o comboio 963 e o Panzerzug 7; os Ju 87 da 3./StG 1; a artilharia contra os acessos (H01 p.133); a SS-Heimwehr Danzig a norte às ~07:00, com artilharia, morteiros e blindados (T08/T16). Nada de viaturas ou colunas sem fonte na margem leste.
  - **Microtarefas do jogador:** reconstruções de tarefas reais da defesa (munições, cabos de detonação, feridos, ligação a pé).
  - **Horas:** só as horas com fonte.
- **Dependência crítica, as fontes:** sem as fontes completas a fidelidade não se consegue provar. Faltam:
  - o H01-PDF (artigo de Kłodziński), T03, T08, T16 e o mapa de 1939;
  - os domínios muzeum1939.pl e wikipedia.org não abrem nesta sessão cloud.

  O proprietário fornece os PDFs, ou autoriza esses domínios nas definições de rede do ambiente. Até lá, o que depender delas fica BLOQUEADO e não entra como facto.

## Contexto histórico dentro do jogo (pedido do proprietário: «adicionar, mas com contexto histórico»)

Cada novidade dos pacotes abaixo entra ancorada no que aconteceu em Tczew a 1/9/1939, e o jogo passa a mostrar esse contexto ao jogador sem quebrar a ação.

- **Base de cada elemento:** uma tabela única `missions/m01-tczew/history-context.json` liga cada novidade ao seu facto histórico, com fonte (IDs de `research/SOURCES.md`) e classificação. Um teste recusa elementos novos sem entrada. O que cada pacote usa:
  - **Defesa polaca:** 2.º Batalhão de Atiradores (T03), pelotão de sapadores do subtenente Juchtman (H §4), pelotão leste, guarnição da ckm e ferroviários polacos (T07/T08).
  - **Lado alemão:** Gruppe Medem com o comboio 963 e o Panzerzug 7 (T07/T08/T14), 3./StG 1 com os Ju 87 (T12), SS-Heimwehr Danzig a norte (T08/T16).
- **Cartões de contexto curtos** (2–3 linhas, com a fonte) no momento em que o jogador vê pela primeira vez cada coisa histórica. Exemplos: «Comboio blindado alemão (Panzerzug 7), vindo de Marienwerder — fonte T14»; «Ju 87 da 3./StG 1 atacam os cabos de detonação — T12». Aparecem sem pausar o jogo, uma vez por elemento, e podem ser desligados nas opções.
- **Arquivo histórico no menu e no debrief:** desbloqueia uma entrada por elemento visto, com o facto, a certeza (alta, média ou baixa) e a fonte. Separa claramente o que é histórico do que é dramatização do jogo, para o jogador saber o que foi real.
- **Briefing de abertura** com mapa simples de Tczew (pontes, estação, margens, Lisewo, Kozliny) e a situação às 04:30, a partir de `HISTORICAL_RESEARCH.md`.
- **Falas dos aliados** a referirem factos reais da batalha (o comboio que chega, os aviões sobre os cabos, a ordem de demolição) em vez de frases genéricas, em PT-PT, com o polaco por rever por nativo.
- **Sem fonte não entra como facto:** o que não tem fonte ou entra como dramatização assumida e marcada no arquivo, ou fica de fora (D-5, insígnias SS).

## Pacotes (por ordem)

### V-1 — Auditoria de fidelidade do jogo atual (antes de tudo)
- **Dados e ferramenta:** `history-context.json` com todos os elementos atuais classificados, e `tools/verification/m01-fidelity-audit.mjs` com o teste de ≥ 80 %.
- **Relatório** em `docs/verification/m01-runtime/fidelity-audit-*`:
  - fidelidade por ato;
  - lista das dramatizações, por peso;
  - propostas de correção, que o proprietário aprova antes de se mudar o que já existe.
- **Pedido de fontes:** pedir os PDFs ou a autorização dos domínios.

### V0 — Contexto histórico no jogo (primeiro, porque os outros pacotes o usam)
- **Dados:** `history-context.json` com validador e teste.
- **Novos módulos:**
  - `src/ui/m01-history-card.js`: cartões de contexto, reutilizando o padrão `actCardFrame` de `src/ui/m01-hud.js`;
  - `src/ui/m01-archive.js`: arquivo no menu e no debrief;
  - briefing de abertura com mapa.
- **Registo dos elementos vistos:** a simulação regista o facto «visto pela primeira vez» por evento (dados, guardados no save); a UI mostra.
- **Primeiros cartões:** só para elementos que já existem hoje: Ju 87, comboio 963, Panzerzug, demolições, ordem de retirada.

### V1 — Ritmo por objetivos (Ato I e atos VII), emenda 23
O problema principal relatado e o mais barato de resolver.
- **Novas condições `when` em `m01-pacing.js` (`COMPRESS_WHEN`) e `compress` nos segmentos de `mission.json`:**
  1. **04:42–04:45:** comprimir quando o bombardeamento acabou e não há objetivo pendente.
  2. **05:30–05:34:** comprimir com o jogador abrigado.
  3. **06:10–06:44:** comprimir assim que o Bąk é entregue ou o Dudek o leva.

  Para 3, a decisão B4 fica tomada pelo pedido do proprietário: a carga espera pela entrega, mas o tempo morto depois dela é comprimido.
- **Micro-objetivos em vez de esperas** (sem mudar horas), com marcador, todos GAMEPLAY_DRAMATIZATION:
  - reabastecer na caixa;
  - levar a fita à ckm;
  - ajudar um ferido (reutiliza `m01-aid.js`);
  - ocupar o próximo posto.
- **Atos VII:** auditar `timers` do VII-a, VII-b e VII-c e trocar esperas fixas por gatilhos de ação. Exemplos: a barragem começa quando o jogador ocupa o posto; o mensageiro parte quando o jogador chega ao parapeito.
- **Métrica alvo:** nenhum troço de mais de 20 s reais sem objetivo ativo (hoje ≈ 240 s), medida com uma ferramenta nova sobre as rotas de ouro.

### V2 — IA aliada que pensa (Ato I), emenda 24
- **Fogo real em vez de apresentação:**
  - a secção dispara rondas reais desde o contacto, e não só a partir das 06:05; o modelo de ronda já existe em `m01-section.js` (`queueShots`/`canFire`);
  - a guarnição oeste deixa de ser `displayOnly` e ganha IA mínima, reutilizando o laço de `m01-rearguard.js` (fogo real, abrigo por `world.coverAt`, recuo).
- **Movimento:**
  - reposicionamento por ameaça: os homens trocam para o lugar de cobertura autorado mais protegido face ao inimigo que os suprime, com A* (`M01Navigator`);
  - fim do homem suprimido a bloquear a fila: quem está atrás contorna-o ou espera abrigado;
  - a secção acompanha os movimentos do jogador entre postos (`m01-squad.js` com pedidos dinâmicos, não só chamadas do guião).
- **Métricas alvo:**
  - percentagem de tempo que cada aliado passa abrigado sob fogo;
  - rondas aliadas com efeito (supressão ou baixa);
  - mudanças de posição por minuto;
  - zero aliados parados a céu aberto sob fogo durante mais de 3 s.

  Os sobreviventes e os personagens essenciais da história não mudam.

### V3 — Muitos soldados à volta (presença), apresentação + dados
- **Pelotões de fundo a oeste e a leste**, com efetivos plausíveis do 2.º Batalhão e da guarnição (T03; números nunca no ecrã):
  - homens em trincheiras, a transportar caixas, a correr entre postos, a disparar para setores, a levar feridos;
  - perto do jogador como atores leves (guarnição alargada, `garrisonPlan` com teto validado);
  - longe como impostores (`M01Impostors`, nação `pl`) com animação de marcha e de tiro.
- **Orçamento:** dentro de 18/24/48 com skin. O resto em impostores, com prioridade para os que estão à vista, que já existe em `actorPriority`.
- **Base:** reutilizar `m01-yard-life.js` e `m01-garrison.js`.
- **Métrica alvo:** polacos visíveis num raio de 100 m do jogador em cada fase (a medir hoje e depois). Desempenho com `renderer.info` em Low e High.

### V4 — Alemães ao longe, só com fonte (apresentação ligada a eventos da simulação)
- **Panzerzug 7 e comboio 963:** visíveis, com clarões de disparo e impactos de artilharia nos acessos (H01 p.133, PARCIAL), não letais para o jogador fora da zona jogável. O armamento não aparece no ecrã.
- **Ju 87:** passagens distantes depois do primeiro ataque, só som e silhuetas longe, sem número no ecrã.
- **Margem leste e direção de Lisewo:** colunas de infantaria alemã em impostores e viaturas genéricas (camião ou casco sem tipo), como RECONSTRUCTED/DRAMATIZATION.
- **Norte (~07:00, VII-a):** clarões de artilharia e morteiros, e cascos blindados genéricos em movimento no horizonte.
- **Ativos:** procedurais primeiro. Nenhum modelo identificável sem fonte e licença.

### V5 — Mundo vivo sem o jogador (simulação leve de setores)
- **Diretor de setores distantes** no Ato I e nos atos VII. Generaliza o padrão de `src/world/m02-horizon-system.js` num módulo partilhado (`src/world/sector-director.js`) sem alterar a M02.
- **Setores:** cabeça de ponte leste, estação, dique de Lisewo, perímetro norte e oeste distante. Cada setor tem estado determinístico guardado no save: intensidade, baixas, fumo, movimentos e eventos finitos que não se repetem.
- **Ligação ao resto:**
  - o setor alimenta impostores (V3/V4), clarões e o som distante (`DISTANT_SECTORS`, atraso `d/343`);
  - promove a atores quando o jogador se aproxima e despromove com histerese;
  - o setor progride mesmo que o jogador não olhe.
- **Fontes:** só eventos com fonte ou dramatização marcada; horas históricas fixas.

## Ficheiros principais

- **Ritmo:** `missions/m01-tczew/mission.json` (clock, objetivos, guarnição); `src/game/m01-pacing.js`; `src/game/m01-simulation.js` (processEvents, aliados, gates).
- **Aliados:** `src/game/m01-section.js`, `m01-squad.js`, `m01-garrison.js`, `m01-rearguard.js`, `m01-aid.js`.
- **Atos VII:** `src/game/m01-area-sim.js`; `missions/m01-tczew/areas/np/*.json`.
- **Renderer:** `src/render/m01-impostors.js`, `m01-characters.js`, `m01-view.js`, `m01-far-landscape.js`, `m01-display-fire.js`.
- **Som:** `src/core/battlefield-audio.js`, `src/game/audio-director-m01.js`.
- **Novos:** `src/world/sector-director.js` e uma ferramenta de métricas de ritmo e presença em `tools/verification/`.
- **Contexto histórico:** `missions/m01-tczew/history-context.json`, `src/ui/m01-history-card.js`, `src/ui/m01-archive.js`; fontes em `missions/m01-tczew/HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md` e `research/SOURCES.md`.

## Verificação

- **Fidelidade:** `m01-fidelity-audit.mjs` corre em cada pacote. Nenhum pacote entra na #80 se a fidelidade de algum ato descer abaixo de 80 % ou se um elemento novo não tiver classificação e fonte.
- **Por pacote:** testes focados novos e existentes; nova emenda do golden do Ato I (`tools/verification/m01-integration-golden-audit.mjs --amendment N`, `check: identical`); goldens do VII-a, VII-b e VII-c; testes de compatibilidade dos saves antigos; revisão crítica independente (determinismo, saves, justiça para o jogador, honestidade histórica).
- **Métricas antes e depois** nas 24 rotas, em `docs/verification/m01-runtime/vibe-*`:
  - maior troço sem objetivo ativo;
  - aliados abrigados sob fogo;
  - rondas aliadas com efeito;
  - polacos num raio de 100 m;
  - eventos alemães visíveis por minuto;
  - `renderer.info` em Low e High.
- **No fim de cada pacote:** `npm test` completo; suite de browser (`CHROME_EXECUTABLE=/opt/pw-browsers/chromium`; `npm run build:browser` para as páginas de autoria); merge na #80 e link do Vercel para o proprietário jogar e confirmar a sensação.
- **Sem FPS inventado.** Captura de ecrã de cada novidade, vista e descrita.
