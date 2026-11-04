# INC-2 — Ato VII-b «Norte, durante o dia» (2026-11-04)

**Estado:** implementado e verificado por testes de estado e por Playwright (Chromium/SwiftShader). **Nada aqui é VALIDADO em jogo:** não houve playtest humano; um teste verde não é uma tarefa validada no jogo (AGENTS.md).
**Interruptor:** `missions/m01-tczew/acts.json` continua com `enabled: false`; o jogo distribuído, o ato BW 04:30–07:05, `mission.json`, `map-layout.json`, os saves de esquema 2 e o golden da emenda 20 não mudam (nenhum ficheiro fixado do ato 1 foi tocado).
**Branch:** `inc2-vii-b` (a partir de `bb367a73`, VII-a ronda 2). Desenho: `docs/direction/M01_R4_VII_BC_DESIGN.md` §2 (F1–F5, F8 em parte, F9).
**Como ver:** `npm run build` e `npm run preview`; `?acts=1` liga a cadeia BW → VII-a → VII-b → debrief; `?act=vii-b` arranca diretamente no VII-b (QA, nível por omissão Soldado).

## 1. O que se joga (cadeia VII-a → VII-b, só com o interruptor ligado)

1. Depois do cartão de fim do VII-a, o cartão **«Mais tarde…»** (9 s, saltável); **CP-I** guarda-se quando o cartão acaba. Etiqueta do HUD: **«DURANTE O DIA»** (nenhuma hora no ecrã; relógio interno 13:00 só para luz e som).
2. Objetivo «Reabasteça-se e ocupe o flanco oeste do parapeito»: o marcador aponta à caixa de munições mais próxima enquanto a reserva está abaixo de 40 e depois ao posto oeste; o objetivo fecha no posto com a reserva cheia (E na caixa).
3. **Barragem 1** (12 impactos em ≤ 46 s, faixa z −1250…−1120): «Artilharia! Ao chão!», assobio 1,5 s antes de cada impacto, crateras e fumo, objetivo «Abrigue-se atrás do parapeito». O 5.º impacto cai ao pé do parapeito junto de `pl_np_3`, que fica ferido (os abrigados ficam feridos onde um homem de pé morre). «Maqueiro!»: **dois maqueiros** (NPC) vêm do sul, o primeiro leva-o ao ombro e ambos saem pela borda sul.
4. 6 s depois da barragem, **1.ª investida** (15 + 3 de apoio, faixas novas; quebra aos 10 caídos ou aos 100 s). Quando quebra: **CP-I2**.
5. Intervalo (≤ 30 s): **barragem 2** (6 impactos, 20 s depois da quebra, mais perto da linha), a ckm recarrega a fita («Fita nova!»).
6. **2.ª investida**, sobretudo do noroeste contra o flanco oeste (16 + 2; entra em dois grupos; quebra aos 15 caídos ou aos 100 s).
7. «Repelidos» → 7 s → cartão de fim (9 s) → **debrief** com os parágrafos do VII-a e do VII-b (`db_np_01`, `db_npb_01`) por esta ordem (o VII-c é o INC-3: a cadeia acaba aqui).

Regras: o jogador **nunca é morto nem ferido por artilharia** (só atordoado, como nas bombas da BW) e nenhum impacto cai a menos de 30 m dele (planeado a ≥ 42 m; cai a ≥ 30 m mesmo que ele corra para baixo); as balas continuam a ferir pela tabela do nível. Nenhum «1.º/2.º ataque», contagem, calibre, insígnia ou hora exata no ecrã (teste F9).

## 2. Passo 0 — regressão de equilíbrio do VII-a (commit `2b71a67e`)

O fogo de área das MG34 (81bd5e61) tinha feito a rota passiva do golden perder 7 de 7 fuzileiros (eram 2) e a ckm disparar metade das rajadas. Correção, só em dados e numa regra de aterragem (`m01-area-sim.js landRounds`): `fire.suppress.hitChance {cover 0,1; exposed 0,5}` (uma ronda às cegas que atravessa um homem da linha só o fere com a probabilidade da sua postura; função pura do par de ids, sem sorteio) e `fire.suppress.pinSec 1,5` (quem está a < 3 m do fim de uma ronda às cegas fica em baixo 1,5 s; as apontadas mantêm 4 s). O hash do ato 1 (`blastJitter`, FNV-1a) é «aos grumos» em ids sequenciais (para `pl_np_3` nenhum valor < 0,116 em 600 rondas); por isso há um módulo novo, `m01-unit-hash.js` (FNV-1a + finalizador murmur3), e o do ato 1 não se toca.

| Golden VII-a (recruta, semente 19390901) | antes da ronda 2 (7d603b11) | `bb367a73` | agora |
|---|---|---|---|
| passivo: fuzileiros mortos / rajadas da ckm | 2 / 11 | 7 / 6 | **3 / 14** |
| ativo: fuzileiros mortos / rajadas da ckm | 1 / 10 | 2 / 5 | **1 / 11** |
| fim do ato (passivo / ativo) | 245,7 s / 156,9 s | 283,9 s / 162,2 s | 249,1 s / 201,0 s |

Em 6 sementes (passivo, recruta) o código anterior à ronda 2 perdia em média 4,5 fuzileiros e a ckm fazia 9,8 rajadas, `bb367a73` 5,7 e 8,3, a configuração final 5,0 e 10,5: a semente do golden era uma amostra desfavorável, e o que se recuperou foi o nível estatístico anterior, não só essa semente. Teste de duração (`tests/m01-act-vii-a-seeds.test.js`, piloto ativo, soldado, 15 sementes): combate **125,9–209,2 s, 15/15 ≥ 110 s**; o piloto passivo mais lento acaba aos 301 s (≤ 360 s).

## 3. Funcionalidades (desenho §5)

| # | O que é | Onde |
|---|---|---|
| F1 | Perfil de ato: os nomes que o VII-a tinha no código (cartões, objetivos, fases `NP_*`, flags `m01np.*`, CP de chegada, rótulo do marcador) são omissões de `act.profile`; o VII-b dá os seus (`NPB`, `m01npb`, «Flanco oeste»…). **Golden VII-a: as rotas regeneram byte a byte**; só mudou o sha256 de 2 ficheiros de entrada (2 linhas). | `m01-area-sim.js` (`makeProfile`) |
| F2 | Cadeia: `acts.json` (BW → VII-a → VII-b), alias `?act=vii-b`, `carryFrom` área→área conserva as flags `m01np*`, debrief acumula os parágrafos dos atos de área jogados. | `acts.json`, `m01-acts.js`, `debriefChain` |
| F3 | Artilharia por raio: `SHELL_BLAST` (letal 4 m, ferido 9 m, abalado 20 m; cobertura ×1,8, de joelhos ×1,25, deitado ×1,6, ±12 %), `shellOutcome` (**com a especificação da bomba dá exatamente `blastOutcome`**, provado em 720 casos), `stepBarrage` (fluxo próprio semeado, guardado no save), regra dos 30 m, cratera em `sectors.damage`, evento `m01-blast` `kind:'shell'`, atordoamento `CONCUSSION` do ato 1. `m01-blast.js` não foi alterado. | `m01-shell-blast.js`, `m01-area-sim.js` |
| F4 | Checkpoints com gatilho de dados (`sceneEnd`, `echelonBroken`, `flag`): CP-I e CP-I2. | `makeProfile`, `checkpointTriggers`, `lullCheckpoint` |
| F5 | Maqueiros (só NPC, nunca o jogador): dois homens, no máximo 2 feridos por ato, o transporte usa a animação de transporte existente (ao ombro, convenção do ato 1). | `stepMedics` |
| F8 | Sol do ato (13:00, 42,1°/205°) só neste ato; VII-a e BW mantêm o seu. | `m01-area-world.js` |
| F9 | Guardas de texto (cartões, falas, estado, rótulo, objetivos, debrief): sem hora, calibre, insígnia, nome de oficial, contagem nem ordinal. | `tests/m01-act-vii-b.test.js` |
| — | Renderer, mínimo e com portão de área: as crateras dos obuses (os decals do ato 1 não assentam na área) desenham-se a partir dos registos de dano guardados (2 malhas instanciadas, só depois do primeiro obus); o revestimento da área refaz-se quando o ato seguinte tem outras terras (VII-a → VII-b na mesma página); assobio (`shell-incoming` → `audio.tone`). | `m01-area-dressing.js`, `m01-view.js`, `game.js` |

## 4. Classificação do que o ato diz e faz

| Elemento | Classe | Fonte / certeza |
|---|---|---|
| Durante o dia, ataques vindos do norte com apoio de artilharia, repelidos (cartões, debrief) | `DOCUMENTED` | T16, BAIXA (resumo); a guarnição manteve as posições até à ordem da tarde: T03, MÉDIA (resumo) |
| Composição das companhias a norte/noroeste (linha, ckm) | `DOCUMENTED` (composição) / `RECONSTRUCTED` (posições) | T03 MÉDIA, T08 |
| Segunda posição no flanco oeste do parapeito, virada a noroeste | `RECONSTRUCTED` | de T03/T08 |
| Sol às 13:00 (42,1°/205°) | `RECONSTRUCTED` | C01 (método recalculado; segunda recalculação deu 42,0°; registado em `research/SOURCES.md`) |
| «DURANTE O DIA», relógio interno 13:00 (luz e som) | `GAMEPLAY_DRAMATIZATION` | – |
| Barragens (aviso, assobio, 12 + 6 impactos, raios, crateras), homem ferido, maqueiros | `GAMEPLAY_DRAMATIZATION` | – |
| Duas investidas, faixas, efetivos (18 + 18), pausa de 30 s, caixa de munições | `GAMEPLAY_DRAMATIZATION` | – |
| Número, horas e setores dos ataques; calibre, tipo e posição da artilharia alemã; baixas de ambos os lados; o que H01-PDF diz da tarde | **BLOQUEADO** (sem fonte no repositório) | não aparece no ecrã (cartões dizem «desconhecido») |

## 5. Verificação — comandos e resultados reais

Tudo na worktree `inc2-vii-b`, x86_64, Node 22, sem `npm test` completo (verificação focada, como pedido). Resultados lidos das saídas reais.

| Comando | Resultado |
|---|---|
| Passo 0, numa cópia da árvore em `2b71a67e`: `node --test --test-concurrency=1 tests/m01-act-vii-a.test.js tests/m01-act-vii-a-seeds.test.js tests/m01-acts.test.js` | **35/35** (771 s); combate do piloto ativo (soldado, 15 sementes) **125,9–209,2 s**: `19390901:158,8 3:162,3 7:151,6 1:193,4 2:165,9 4:131 5:157,8 6:141,2 8:167,2 9:166,3 10:159,2 11:125,9 12:186 13:132,2 14:209,2`; o piloto passivo mais lento acaba aos 301,3 s |
| Árvore final: `node --test --test-concurrency=3 tests/m01-act-vii-a.test.js tests/m01-act-vii-a-seeds.test.js tests/m01-acts.test.js tests/m01-act-vii-b.test.js tests/m01-act-vii-b-routes.test.js tests/m01-simulation-boundary.test.js tests/m01-area-visual.test.js tests/m01-blast.test.js` | 80 testes, 725 s: **78 passaram**; 2 falharam, ambos em `m01-act-vii-b.test.js` e por números que mudaram quando a barragem 1 passou de 10 a 12 impactos (a cratera «além dos impactos» e o `k` «a mais»): os dois testes passaram a seguir `act.barrages[0].impacts` e **passam (corridos à parte)**; nenhuma fonte mudou depois desta corrida |
| 23 ficheiros que leem as fontes alteradas como texto (`tests/m01-aircraft`, `area-visual`, `audio-director`, `battlefield-fx`, `battlefield-fx-polish-v3`, `ckm-live-presentation`, `damage-decals`, `demolition`, `difficulty-death-ui`, `difficulty-ui`, `german-retreat`, `grading`, `impostors`, `lighting`, `living-battlefield-t21`, `long-range-fx`, `mg34-prone-presentation`, `partials-completion`, `t50-font-footer-bundle`, `tczew-data`, `water`, `simulation-boundary`, `blast`) | **273/273** (484 s). Fora desta lista ficaram `m01-display-fire`, `m01-schema2-determinism` e `m01-bomb-effects` (simulações do ato 1 que só mencionam `game.js`; corrida interrompida por tempo, sem falhas até aí) |
| `node tools/verification/m01-act-vii-a-golden.mjs` / `m01-act-vii-b-golden.mjs` | `check: identical` ambos (e os testes de golden passam) |
| F1: rotas do golden do VII-a regeneradas e comparadas | **idênticas**; só 2 linhas do fixture mudaram (sha256 de `m01-area-sim.js` e `m01-area-world.js`) |
| `npm run build` | OK (3 vezes; a última depois da última edição do renderer) |
| Playwright (porta livre 4391, config temporária apagada; `CHROME_EXECUTABLE=/usr/bin/google-chrome`): `npx playwright test -c playwright.inc2-4391.tmp.config.js tests/browser/m01-act-vii-b.spec.js tests/browser/m01-act-vii-a.spec.js` | **9 passaram (27,4 min)**: VII-a 5 (arranque, saves, CP-F, morte em CP-F, transição; o fim do VII-a abre agora o cartão do VII-b) e VII-b 4 (cartão + etiqueta + CP-I guardado, saves em 6 momentos, CP-I2 guardado pelo jogo, cartão de fim + debrief). Capturas do VII-a repostas com `git restore` |
| Ficheiros fixados do ato 1 (`m01-simulation.js`, `mission.json`, `map-layout.json`, `m01-squad/rearguard/deck-assault/section/barks/opening/pacing/animation-presentation/fire/aim.js`, `tczew-world.js`, `spatial.js`, `m01-navigation.js`, `tests/helpers/m01-route.js`), `m01-blast.js` e `areas/np/layout.json` | `git diff bb367a73..HEAD` vazio para todos |

Testes novos do VII-b (`tests/m01-act-vii-b.test.js`, 18 testes): dados e plano; F1 (padrões do VII-a, perfil do VII-b, erros de perfil); aritmética do obus (= bomba com a especificação da bomba, 720 casos; de joelhos atrás do parapeito fica-se ferido onde de pé se morre; protegidos só abalados); local dos obuses (≥ 42 m planeado, ≥ 30 m ao aterrar, hash uniforme); validação dos planos de barragem e maqueiros e dos gatilhos de checkpoint; sol; cartão, CP-I, reabastecimento e posto; barragem (assobio 1,5 s antes, cratera por impacto, jogador nunca ferido, fluxo principal intacto) em 3 posições do jogador; atordoamento; Poles junto de um obus e o ferido programado; maqueiros (levantar, levar, sair, máx. 2, sem clipping nem empilhamento); CP-I2 e morte na 2.ª investida; **save/restore tick a tick em 8 momentos** (CP-I, obus no ar, maqueiros a caminho e a transportar, meio da 1.ª investida, intervalo, barragem 2, 2.ª investida); registos adulterados (22 casos) e dois saves de VII-a com registos de VII-b; cadeia BW → VII-a → VII-b e debrief; guardas F9; desenho das crateras; golden. `tests/m01-act-vii-b-routes.test.js`: 18 rotas + determinismo (mesmo estado final duas vezes, estado diferente com outra semente).

## 6. Durações (pilotos; não são jogadores)

Golden VII-b (recruta, semente 19390901): **passivo 339,5 s (5,7 min)**, **ativo 223,2 s (3,7 min)** (do cartão ao cartão, com o cartão saltado ao fim de 1 s). 18 rotas (`tests/m01-act-vii-b-routes.test.js`): passivo **320–340 s**, ativo **209–293 s** (os veteranos morrem mais e repetem trechos). Hipótese, não medida: um jogador humano deverá ficar entre os dois pilotos (mais 18 s de cartões, que o piloto salta ao fim de 1 s), o que cabe nos 4–6 min do desenho; a meta **não está validada** e o piloto ativo mais rápido (3,5 min) fica um pouco abaixo dela.

## 7. Capturas (todas vistas)

Todas vistas por mim (resolução 1280×720, build de produção, Chromium/SwiftShader com GL por software; não são medida de FPS). Ficheiros nesta pasta; `smoke-*.json` têm o estado de cada página.

| Ficheiro | O que se vê |
|---|---|
| `00-transition-card-from-vii-a.png` | o fim do VII-a abre o cartão «Mais tarde…» do VII-b na mesma página (cadeia `?acts=1`) |
| `01-entry-card.png`, `02-arrival-default-view.png` | `?act=vii-b`: cartão «Mais tarde… · durante o dia · desconhecido · reconstrução e dramatização» e a chegada: etiqueta «DURANTE O DIA», sem hora, luz de tarde, CP-I guardado («CP-I · Perímetro norte — durante o dia · Soldado») |
| `03-arrival-resupply.png` | objetivo «Reabasteça-se e ocupe o flanco oeste do parapeito», marcador «Flanco oeste 123 m», fala de Zieliński |
| `04-barrage-impacts.png`, `04-barrage-impacts-later.png` | **barragem 1**: objetivo «Abrigue-se atrás do parapeito», estado «Fogo de artilharia · abrigue-se atrás do parapeito», colunas de fumo dos impactos no campo; a página reporta 6 crateras e 12 malhas no revestimento (10 + 2 das crateras). Não apanhei o clarão de um impacto: só o fumo |
| `04b-craters-after-barrage.png` | fim da barragem 1 («Parou! Cabeças fora do buraco, olhos a norte!»), 12 crateras nos registos; vistas de uma trincheira a ≥ 42 m as crateras são discos rasantes quase invisíveis, vê-se o fumo |
| `05-bearers-carry.png` | atrás da linha: os dois maqueiros no campo em frente ao parapeito, o primeiro com o ferido ao ombro (ampliado: duas figuras a andar a par, uma curvada com a segunda silhueta por cima); riflemen de joelhos ao fundo |
| `06-attack-north.png` | 1.ª investida: «Linha norte · 18 atacantes no campo · 0 caídos», «Fogo à vontade!». Os alemães ajoelhados atrás da terra a 140 m não se veem (olho a 1,6 m, terra de 1,15 m) |
| `06b-first-attack-breaks.png` | a 1.ª investida quebra: «vaga a recuar · 8 no campo · 10 caídos», «PROGRESSO GUARDADO · CP-I2 · Perímetro norte — intervalo», «Estão a recuar! A ckm que varra a orla.» |
| `07-barrage-pause.png` | barragem 2 no intervalo (a partir de CP-I2, cartão «CP-I2 · Perímetro norte — interv…»): mesmo estado e objetivo que a 1, fala «Caiu um. Continuem a disparar!»; 15 crateras nos registos; neste fotograma ainda não há fumo à vista |
| `08-end-card.png`, `09-debrief.png` | cartão de fim (letterbox sobre o parapeito; a captura apanha a primeira linha a escrever-se, «Ataques vindos do n…») e debrief: `db_01…db_03`, `db_np_01` («Por volta das 07:00…»), **`db_npb_01`** («Durante o dia, novos ataques vindos do norte… as fontes do repositório não dizem…»), `db_04…` |

## 8. Riscos e incertezas

- Durações e números de jogo (impactos, raios, efetivos, limiares) são de jogo e a afinar no playtest; o piloto ativo mais rápido faz o ato em 3,5 min.
- O assobio (`audio.tone`) não se ouve em Chromium sem som: está provado o evento (1,5 s antes de cada impacto) e que a página não dá erro, não a legibilidade do aviso.
- As crateras vistas de uma trincheira (olho a 1,6 m, a ≥ 42 m) são discos quase rasantes: lê-se sobretudo o fumo (30 s por cratera); o desenho das crateras foi verificado por teste de unidade e por contagem de malhas na página, não por uma imagem nítida.
- O homem ferido é levado ao ombro (animação de transporte do ato 1); não há maca desenhada.
- A cadeia passa a terminar o VII-a no cartão do VII-b: o debrief de um `?act=vii-a` sozinho vem agora depois do VII-b (só com o interruptor ligado). Os testes `m01-acts` e o spec do VII-a foram atualizados de propósito.
- O Passo 0 mexe no comportamento do VII-a (menos baixas e mais rajadas da ckm): o golden do VII-a foi regenerado; o resto é a F1 (rotas idênticas).

## 9. O que continua BLOQUEADO / à espera do proprietário

D-1 Lisewo (fora); D-2 insígnias e nome da SS-Heimwehr no ecrã; D-3 duração total; D-5 sonda alemã na retirada; calibre, tipo e posição da artilharia alemã; número, horas e setores dos ataques do dia; baixas; o conteúdo de H01-PDF/T03/T08/T16 sobre a tarde (os ficheiros não estão em `research/sources/`); ruas reais, quartel e itinerário (P4); Bofors e morteiros polacos (WP-5). **Nada passa a VALIDADO sem playtest humano** (legibilidade do aviso de artilharia, variedade sem ciclos, duração 4–6 min). O INC-3 (VII-c, ordem das ~17:00 e retirada) não está feito.

## 10. Errata da revisão crítica (2026-11-04, depois do merge `1d17b8f8`)

A revisão crítica achou que um homem da linha ferido por um obus (`state: WOUNDED`) ficava com `crouched=false` nos dados: a visão e o traçado das rondas alemãs (`germanTargets`, `landRounds`) tratavam-no como um homem **de pé** acima do parapeito de 1,15 m, enquanto o renderer o desenha deitado, e o fogo às cegas contava-o como «exposto». Na semente 3 (passivo) o `pl_np_3`, ferido pelo obus programado aos 36 s, era atingido aos 84,7 s e morto aos 134 s, a jazer; 10 das 48 rotas da revisão mostravam o mesmo.
Corrigido (commit `fix(m01): VII-b review — wounded men lie for German fire …`), como o ato atual faz (`m01-simulation.js alliedRound`, `lying`): um homem ferido fica fora de `germanTargets` e do traçado de `landRounds` e fica de joelhos nos dados (`crouched=true`). `endBarrage` só muda a fase se for a da barragem (`mission.phase === NPB_BARRAGE`). Os números das secções 5 e 6 foram refeitos:

| | antes | agora |
|---|---|---|
| golden VII-b (recruta, semente 19390901): passivo / ativo | 339,5 s / 223,2 s | **351,4 s / 241,7 s** |
| 18 rotas: passivo / ativo | 320–340 s / 209–293 s | **308–351 s / 205–336 s** |
| homem ferido da 1.ª barragem levantado por um maqueiro | não verificado (`handled` também conta viagens em que o doente morreu antes) | **18/18 rotas** (o teste observa `carriedBy`) |

O VII-a não muda (não há obuses, logo ninguém fica `WOUNDED`): rotas do golden byte a byte iguais, só o sha256 de `m01-area-sim.js` mudou. Também corrigido, só nos testes: `stun` do golden lia um campo que não existe (`sim.concussion`; agora o do jogador), a asserção «aterra onde foi assobiado» era sempre verdadeira (agora é estrita), o teste de saves compara o jogo restaurado com o ORIGINAL que continuou a jogar (antes comparava duas cargas do mesmo texto).
