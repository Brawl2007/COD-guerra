# Registo de decisões do Captain

Formato: data · decisão · razão · reversível? Decisões de produto/jogabilidade/[D] ficam como
**PENDENTE HUMANO** até aprovação explícita.

| # | Data | Decisão | Razão | Reversível |
|---|---|---|---|---|
| D1 | 2026-10-08 | O Captain (Claude Code) assume a coordenação técnica. ChatGPT/GPT Sol deixa de ser necessário para dirigir. | Instrução do utilizador | — |
| D2 | 2026-10-08 | Nenhuma implementação do M01 sobre `2645f3f` nem sobre a V7 por validar. A base de desenvolvimento nasce do HEAD da V7 que o utilizador fornecer como validado, mais a infra Capitão V3. | Instrução do utilizador; a V7 tem o CI integral em curso | Não |
| D3 | 2026-10-08 | `claude/captain-direction-v1` (V7 `7a5800e` + infra) só recebe documentação de planeamento. Ao criar a base, os commits de `docs/direction/` são reaplicados por cherry-pick. | Plano independente do resultado do CI | Sim |
| D4 | 2026-10-08 | Os dossiês M02–M30 (PR #58) são **referenciados, não copiados**. | Evitar duplicar 1,45 MB de proposta que pode ainda mudar no PR | Sim |
| D5 | 2026-10-08 | Não começar M02+ antes de o M01 estar em PRODUÇÃO. Os sistemas novos nascem em bancadas reutilizáveis. | Mandato: "não sacrificar a qualidade da M01" | Sim (decisão humana) |
| D6 | 2026-10-08 | A lane de simulação é sequencial: T03 → T02 → T22 → T05 → T47. O ckm (T47) vem depois de T22/T05. | Todas mexem em `m01-simulation.js`; T47 precisa de display rounds e de campos de áudio | Sim |
| D7 | 2026-10-08 | As oito alterações por commitar em `~/projetos/COD-guerra` ficam intocadas, embora 5/8 sejam idênticas à V7 e as outras pareçam superadas. | Instrução do utilizador. Descartá-las é ação destrutiva e exige decisão humana. | — |
| D8 | 2026-10-08 | Nenhuma worktree nova. Reutilizar esta, com checkout esparso. | Disco a 81 % (cerca de 1,3 GB livres) | Sim |
| D9 | 2026-10-08 | Browser integral só no CI do GitHub. Localmente: Node + browser focado, quando estritamente necessário. | Chromebook; SwiftShader lento; disco | Sim |

## Visão do utilizador (2026-10-10)

Palavras do utilizador, depois do playtest da branch `claude/m01-viewmodel-feel-v2` (`b0020cf`):
"o objetivo é ter que sentir a guerra, a sensação verdadeira, como se você fosse só mais 1 soldado no meio da
grande guerra, sentindo o impacto".

Consequências para todas as missões (M01–M30):

- A escala da batalha tem de se sentir: muita gente a lutar à volta e ao longe (figuras simplificadas), o jogador
  é um entre muitos, e a batalha continua quando ele não olha (`docs/PROMPT_MESTRE.txt`, §"densidade", linha 1965).
- A densidade segue a batalha real. Nenhum dos dossiês M02–M30 (PR #58) diz hoje quantos soldados havia nem
  quantos aparecem no jogo; ver H8.
- No playtest, o utilizador estranhou na M01: só 10–13 polacos por perto, alemães quase invisíveis, um só
  bombardeio visível. Parte é histórica (frente a ~1,2 km do outro lado do Vístula; um só mergulho às 04:34);
  parte é trabalho em falta: T20 e T23 (frente leste visível, 26 dos 40 alemães nunca disparam para oeste),
  T17 (mergulho, Stukas ainda em laço) e T25 (impactos do bombardeio das 05:30). Estas tarefas servem a visão
  e devem subir de prioridade.

Segundo pedido do utilizador, no mesmo dia: "o jogo tem que ter dificuldades… o perigo de morrer a qualquer
momento, tem que ter fases difíceis de passar, igual a todos os jogos de níveis".

Estado verificado em `claude/m01-viewmodel-feel-v2` (`src/game/m01-simulation.js:585-587`): um tiro alemão que
passa no jogador só fere com probabilidade 0,20 (0,06 em cobertura) e tira 8 de 100, ou seja, cerca de 13
ferimentos para morrer. O comentário diz "afinação de protótipo". Não há níveis de dificuldade. O roteiro proíbe
bombas a menos de 30 m e diz que a MG "suprime antes de matar". Fora isso, só se perde por sair do mapa ou cair
no Vístula. A especificação já pede dificuldade que mude comportamento, precisão e recursos de forma legível
(`docs/PROMPT_MESTRE.txt:1831`). Ver H9.

## Pendentes de decisão humana

- **H1** Que HEAD da V7 está validado (CI integral verde + relatório fechado)? Desbloqueia `BASE`.
- **H2** Adotar no trunk os PRs de documentação #58/#44/#56? Os três apontam para a `main`.
- **H3** O destino das oito alterações por commitar na worktree original (manter, arquivar num commit WIP na própria branch, ou descartar).
- **H4** Sessão no Chromebook de referência (T01) e playtest humano (T52): só uma pessoa os pode fazer.
- **H5** Qualquer tarefa [D] da campanha (S1 flags de save, S2 relógio por segmentos, S8 bancadas de veículo).
- **H6** (2026-10-09) Playtest 1, itens 3, 4, 8 e 11: escopo da animação e da IA dos soldados da M01. Proposta: primeiro um resolvedor simples que escolha o clip pelo estado, com os clips que já existem; a cobertura e a reação (itens 4 e 8) só depois de desenho. Decisão de jogabilidade: fica pendente até aprovação explícita.
- **H7** (2026-10-09) Respostas do playtest 1: branch e commit jogados, resposta 5 sobre a ckm (decide a prioridade da geometria, fase 0), qualidade usada, causa da vida 92 da ponte, parede invisível (item 5) e respostas 1 a 10. Sem elas, os itens 1, 2 e 10 ficam por confirmar.
- **H8** (2026-10-10) Tabela de escala histórica por missão (M01–M30): forças reais na batalha, forças reais no
  setor do jogador, soldados visíveis no jogo (perto / à volta / ao longe) e fonte com grau de certeza. Trabalho
  de pesquisa e documentação, sem código; os números visíveis são medidos no Chromebook antes de aprovar.
  Exemplo M02 (fontes gerais, a confirmar): cerca de 225 000 polacos e 425 000 alemães no Bzura; no jogo,
  150–300 polacos visíveis em vagas e 30–60 alemães perto. Proposto ao utilizador; falta a ordem para começar.
- **H9** (2026-10-10) Dificuldade e perigo em todas as missões, a pedido do utilizador: (1) níveis de
  dificuldade (proposta: recruta, soldado, veterano) que mudam precisão, cadência, ferimento por tiro e recursos,
  sem dar aos inimigos visão através de paredes; (2) perigo real em todo o lado: no nível normal, poucos tiros
  matam quem fica exposto, e a cobertura e o movimento é que salvam; (3) em cada missão, pelo menos uma ou duas
  fases difíceis de passar, com checkpoint antes delas; (4) morte justa: o perigo vê-se e ouve-se antes de matar
  (traçantes, estalos, sirene, aviso do sargento). As regras atuais de justiça (bombas a 30 m ou mais, MG que
  suprime primeiro) ficam só nos níveis fáceis, ou são revistas. Na M01, as fases candidatas a difíceis são a
  proteção do reparo (04:52–05:30), a mudança de cobertura sob fogo ajustado e o corredor das 06:10–06:45.
  Mudar o dano ou a IA é decisão de jogabilidade com impacto em simulação, saves e testes: precisa de desenho
  (`opus-medium`), comparação A/B e revisão crítica. Proposto ao utilizador; falta a ordem para começar.
