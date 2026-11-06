# Encravamento da ckm wz.30 e falas 114/115 — 2026-10-22

Decisão do proprietário (2026-10-22): a ckm wz.30 do posto S2 encrava, e as falas `dlg_m01_114` («Travou! Recarregar!», atirador) e `dlg_m01_115` («Pronto. Atire!», municiador), que estavam por ligar com `NEEDS_EVENT`, passam a dizer-se nesses eventos.

Branch local `wp2-ckm-jam`, de `efb8eb0` (a árvore de jogo é a de `4e2588f`, a emenda 12: `efb8eb0` só mudou o workflow de CI). **Não publicada**, sem revisão crítica independente, **sem playtest humano** (nada disto foi jogado; os números são de rotas de teste da simulação, não de FPS nem de sensação).

## Integração na candidata (2026-10-22, ramo `claude/gallant-darwin-xr7jxu-integ`)

- **Emenda 15** (não 13): escrita primeiro como 13 contra a emenda 12 em `4e2588f` (WP2, `45a61a33`), foi reposta sobre a árvore da emenda 14 (`c99a4326` = candidata #80 + WP1 H9 D3/D4 + WP3 escolta e coordenação). `--amendment 15 --write` (x86), predecessor `c99a4326`, golden anterior `tests/fixtures/m01-escort-coordination-gameplay-baseline.json`. A prova passou de `GOLDEN_AMENDMENT_13.json` para `GOLDEN_AMENDMENT_15.json` (este directório, escrita só pela ferramenta). As emendas 13 e 14 passaram a história (`after` `3eb21b38` e `c99a4326`).
- **Decisão do Capitão** (a que a secção «Em aberto» pedia ao proprietário): `dlg_m01_115` passa de prioridade 3 para **2** em `missions/m01-tczew/mission.json` (um número; a 115 não se ouvia nunca, 0 de 21, porque o realizador a largava). Teste: `m01-barks.test.js` (prioridade do subtítulo 3 → 2 e o orçamento do minuto de 5 → 7 linhas, a mesma asserção). Resultado nesta árvore (`CKM_JAM_ROUTES.json` regenerado por `tools/verification/m01-ckm-jam-audit.mjs --jobs 2`; a variante «e se» passou a ser a de prioridade **3**, o valor anterior):

| | Encravamentos | Com o jogador a ≤ 60 m do atirador | 114 dita | 115 dita (sempre depois da 114 do mesmo encravamento, 3,8 ou 4,65 s) |
|---|---|---|---|---|
| Duas rotas do golden | 4 | 3 | 3 | **2** |
| As mesmas 14 rotas de antes (golden + sementes 1 a 6) | 28 | 21 | 11 | **8** (antes: 0) |
| As 24 rotas auditadas (12 sementes, controlo e apoio) | 48 | 36 | 21 | **13** |
| *E se a 115 voltasse à prioridade 3* (duas rotas do golden) | 4 | 3 | 3 | 0 |

  A 114 ouve-se como antes (11 de 21 nas 14 rotas); a 115 ouve-se em 8 desses 11 pares e nunca sem a sua 114. As tabelas históricas abaixo (medidas no ramo WP2, base `4e2588f`, 115 em prioridade 3) ficam como foram medidas; os números actuais são os desta secção e os de `GOLDEN_AMENDMENT_15.json`.
- **Re-fixações do WP2 re-medidas na árvore combinada** (mesmo método; nenhuma asserção alterada, nenhuma afrouxada): `COVER_PINS_12_SEEDS.json` regenerado por `m01-ckm-jam-pins-audit.mjs --jobs 1` é **idêntico byte a byte** ao do WP2 (picadas 31 / 36, folga 5 na semente 19390901; folga média 22,0 (dp 18,0) com e 22,8 (dp 13,9) sem encravamentos, diferença emparelhada −0,8, e.p. 3,9; a escolta e a coordenação da secção começam às 06:10, depois da janela do reparo); `m01-damage-decals`: **64** impactos e 3 tiros do jogador (como no WP2; limite 58); `m01-german-retreat`, `m01-cover-origin` (semente 2) e `m01-cover-combat` passam sem alteração. Corridos na árvore combinada: `m01-cover-combat`, `-origin`, `-threat` e `m01-damage-decals` 36/36; `m01-german-retreat`, `m01-soldier-visual-variation`, `m01-ckm-live-fire` e `m01-ckm-live-presentation` 55/55; `m01-ckm-stoppage` e `m01-barks` 122/122.

## O que mudou

**Jogo.** A máquina do atirador da ckm (`updateCKMGunner`, `src/game/m01-simulation.js`) ganha uma quinta fase, `stoppage`, e uma tabela, `CKM_STOPPAGES`:

| Encravamento | Quando | Duração |
|---|---|---|
| 1 | o atirador ia disparar a **14.ª rajada** (já disparou 13) | **3,8 s** |
| 2 | ia disparar a **45.ª rajada** (já disparou 44) | **4,6 s** |

Nesse instante a rajada **não é disparada**: o atirador passa a `stoppage` até `clearAt`, a arma cala-se (nenhuma ronda, nenhum clarão, a fita não gasta cartuchos), o municiador e o terceiro homem copiam a fase e o `clearAt`. A apresentação reutiliza os clips `feed` já autorados (ponta da fita para dentro pelo municiador, atirador puxa a lingueta e arma duas vezes; `ready` aos 3,0 s de 3,2 s), colocados no **fim** do desencrave para o «Pronto» coincidir com o último fotograma, e nos 0,6 / 1,4 s antes disso a guarnição mantém a pose `aim` (o atirador chama o encravamento). Quando passa `clearAt`: evento `ckm_stoppage_cleared`, a fase volta a `aim` e a rajada que ia disparar segue **nesse mesmo tick** se o alemão ainda está à vista (a arma fica apontada mais 1 s).

**Janela.** Um encravamento só pode começar onde uma rajada podia começar: de 04:46:00 a 06:09:30 (`CKM_FIRE_FROM`, `CKM_CEASE_AT`). Um que já decorre ao fechar a janela desencrava pelo relógio, sem rajada a seguir; se a demolição leste chega a meio, a guarnição abandona a arma encravada (`abandon` → `retreat`) e ninguém diz que desencravou.

**Determinismo.** Nada é sorteado: nenhum fluxo aleatório (nem o principal nem o da ckm) se move, por isso cada rajada mantém a dispersão que tinha e a rota é idêntica à da emenda 12, tick a tick, até ao primeiro encravamento. A escolha é uma tabela por **contador de rajadas** (a pedido: «contador determinista de rondas disparadas»; cada rajada são 8 rondas), não uma lotaria: com uma lotaria uma rota podia ter 0 ou 5, e o contador deixa a contagem por rota ser um invariante testável. Os instantes e as durações são balanço de jogo, **sem fonte histórica**.

**Eventos** (`src/game/m01-audio-events.js`, nunca guardados): `ckm_stoppage {by, at, clearAt, origin, n}` ao falhar a rajada e `ckm_stoppage_cleared {by:'ckm_loader', at, origin, n}` ao desencravar (`n` = o encravamento da missão).

**Falas.** Duas regras `bark` em `mission.json` (gatilhos novos `ckm_stoppage`, `ckm_stoppage_cleared` em `src/game/m01-barks.js`): 114 (prioridade 2, jogador a ≤ 60 m do atirador, cooldown 20 s, máx. 3) e 115 (prioridade 3, jogador a ≤ 60 m do municiador, máx. 3, `after` 0–8 s depois de a 114 ir para o ecrã: sem 114 não há 115). Passam pelo realizador como qualquer outra fala: intervalo mínimo (6 s para a 114), orçamento de 60 s (7 para a 114, 5 para a 115, a própria 114 conta uma), 2 vozes.

## Estado guardado e saves antigos

- Fase `stoppage` com `clearAt` nos três homens da guarnição, e `ckmFire.jams` (quantas já bateram) no atirador. **Ambos só existem depois de o primeiro encravamento acontecer**: todo o save de uma versão anterior, e todo o save desta antes da 14.ª rajada, tem exactamente a forma antiga (cinco chaves em `ckmFire`, nenhum `clearAt`) e carrega sem migração.
- Um save antigo feito mais tarde (mais rajadas do que a tabela espera, sem `jams`) carrega e a **próxima** rajada é o encravamento; um save feito depois das duas rajadas apanha os dois, um a seguir ao outro (3,8 s e 4,6 s de silêncio) e a tabela fica gasta. Documentado e testado (`tests/m01-ckm-stoppage.test.js`, «older saves load»).
- O validador de `validateM01Snapshot` recusa, atomicamente, tudo o que a máquina não produz: `clearAt` fora de [3,2; 5] s do início ou já passado, sem `clearAt` numa fase `stoppage` (ou com `clearAt` noutra), `jams` ausente no atirador, a zero, fraccionário, acima da tabela ou com menos rajadas do que a tabela espera, a duração diferente da da tabela, um plano de rajada, um homem morto, antes das 04:46:00, o municiador ou o terceiro homem em `stoppage` sem o atirador igual.

## Os encravamentos nas duas rotas do golden

Medido por `tools/verification/m01-ckm-jam-audit.mjs` (`CKM_JAM_ROUTES.json`, este directório): as rotas reais do piloto de teste (`tests/helpers/m01-route.js`), controlo (semente 19390901) e piloto de apoio (semente 7).

| Rota | Encravamento | Relógio de batalha | Relógio real (s) | Duração (s) | Rajadas antes | Jogador ao atirador (m) | Fala 114 | Fala 115 |
|---|---|---|---|---|---|---|---|---|
| controlo | 1 | 04:58:43 | 347,85 | 3,8 | 13 | 35,5 | dita aos 347,85 s | não dita |
| controlo | 2 | 05:54:40 | 542,15 | 4,6 | 44 | 26,5 | dita aos 542,15 s | não dita |
| apoio | 1 | 04:59:03 | 350,10 | 3,8 | 13 | 127,3 | não dita (fora dos 60 m) | não dita |
| apoio | 2 | 06:01:07 | 551,05 | 4,6 | 44 | 34,8 | dita aos 551,05 s | não dita |

Duas por rota, as duas dentro da janela, cada uma desencravada ao fim da duração da sua entrada na tabela (a granularidade do tick é 0,05 s: 8,45 s de arma calada por rota para 8,4 s de tabela). Nas outras 12 rotas medidas (sementes 1 a 6, controlo e apoio) o mesmo: 28 encravamentos em 14 rotas, nenhum fora da janela, nenhum sem desencravar, **nenhum disparo, nenhuma ronda da fita e nenhum clarão entre o encravamento e o desencrave** (também verificado tick a tick em `tests/m01-ckm-stoppage.test.js`).

### Falas

| | Encravamentos | Com o jogador a ≤ 60 m do falante | 114 dita | 115 dita |
|---|---|---|---|---|
| Duas rotas do golden | 4 | 3 | 3 | **0** |
| As 14 rotas | 28 | 21 | 11 | **0** |
| *E se a 115 tivesse prioridade 2* (duas rotas do golden; só o que se diz, nada do que acontece) | 4 | 3 | 3 | 2 |

A 114 (prioridade 2) ouve-se em cerca de metade das vezes em que o jogador está ao alcance (11 de 21): o realizador só deixa passar uma fala se a última começou há ≥ 6 s e se o último minuto tem menos de 7 falas, e um evento é de um só instante, por isso quando o canal está ocupado perde-se. A **115 não se ouviu nunca** (0 de 21): é prioridade 3 (orçamento de 5 falas em 60 s, e a própria 114 conta uma), e o minuto de combate traz quase sempre mais de 3 falas. A 113 («Fita nova! Pronto!», também prioridade 3) está na mesma situação (não se ouviu em nenhuma das duas rotas do golden da emenda 12, medido antes desta alteração). A fila funciona (os testes encenados provam 114 → 115, o limite de duas vozes, o intervalo, o orçamento e que nenhuma das duas desloca uma fala mais urgente); o que falta é uma **decisão do proprietário**: subir a 115 para prioridade 2 (um número em `mission.json`; na variante de teste acima a 115 passa a ouvir-se em 2 das 4 vezes, e o ouvinte teria o par «Travou! Recarregar!» / «Pronto. Atire!»), ou dar uma pequena tolerância aos eventos de um só instante no realizador (a fala espera uns segundos pela sua vez). Não toquei na prioridade (é dado da fala) nem no realizador (é de todas as falas).

## Efeito medido nas rondas e nas mortes da ckm

Cada rota foi corrida duas vezes com o mesmo piloto: com a tabela (a simulação viva) e sem ela (a mesma classe com `ckmJamDue()` desligado, que é a simulação da emenda 12: as duas rotas do golden dão os seus 23 746 e 21 660 ticks). 14 rotas = as duas do golden e as sementes 1 a 6 (controlo e apoio). Média das diferenças emparelhadas (com − sem), desvio-padrão e erro-padrão:

| | Sem | Com | Diferença média | dp | erro-padrão |
|---|---|---|---|---|---|
| Rajadas da ckm | 57,07 | 56,50 | **−0,57** | 1,70 | 0,45 |
| Rondas da ckm (8 por rajada) | 456,6 | 452,0 | **−4,6** (−1 %) | 13,6 | 3,6 |
| Acertos em alemães | 1,93 | 2,14 | +0,21 | 1,81 | 0,48 |
| Mortes por rondas da ckm | 0,29 | 0,14 | −0,14 | 0,53 | 0,14 |
| Rondas que fixaram (supressão) um alemão | 436,2 | 431,1 | −5,1 | 47,7 | 12,8 |
| Duração da rota (s reais) | 1155,9 | 1146,7 | −9,2 | 34,1 | 9,1 |

Nada passa de 1,3 erros-padrão: **o efeito é pequeno e não se distingue do ruído**, como é de esperar de 8,4 s de silêncio numa arma que dispara 8 rondas a cada ≈ 6 s. As duas rotas do golden, uma a uma: controlo 58 → 58 rajadas, acertos 4 → 4, mortes 1 → 0, fixações 529 → 429, 23 746 → 23 557 ticks; apoio 56 → 56 rajadas, acertos 2 → 4, mortes 1 → 0, fixações 413 → 423, 21 660 → 23 030 ticks. Uma rota é caótica (qualquer mudança de tempo move todos os sorteios seguintes dos alemães), por isso uma só rota nada prova: as diferenças por rota vão de −16 a +24 rondas e de −65 a +69 s. **Os invariantes do enredo mantêm-se nas 14 rotas** (`plotEqual`: os mesmos 12 estados de objectivo, CP-A..D, eventos consumidos, bandeiras do enredo, sobreviventes 12 / 18 e 07:05:00 com e sem encravamentos; todas completam).

## Golden: emenda 15 (`ckm-jam`)

*(Primeira versão, emenda 13 sobre `4e2588f`: a tabela e os números desta secção são os da emenda 15 regenerada na integração; a 13 original dava 23 746 → 23 557 e 21 660 → 23 030 ticks, com a mesma 1.ª diferença.)*

Gerada por `node tools/verification/m01-integration-golden-audit.mjs --amendment 15 --write` (x86; nunca editada à mão): o predecessor é a árvore de `c99a4326` (a emenda 14) extraída do repositório com os seus dados e conduzida pelo piloto vivo (reproduz o golden da emenda 14; soma `12b40d86…`, a da cadeia). Ficheiros: `tests/fixtures/m01-ckm-jam-gameplay-baseline.json` (o golden, `sourceSha256` `1bba0f94…`) e `GOLDEN_AMENDMENT_15.json` (a prova passo a passo, este directório). Entradas de jogo que mudaram desde o predecessor: `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json`, `src/game/m01-barks.js`, `src/game/m01-audio-events.js`.

| | Controlo (semente 19390901) | Apoio (semente 7) |
|---|---|---|
| 1.ª diferença | tick 6957, 04:58:43 (347,85 s): `actors.86.ckm.phase` do `ckm_gunner`, `fire_burst` → `stoppage` | tick 7002, 04:59:03 (350,10 s): o mesmo caminho |
| Ticks idênticos antes dela | 6956 (13 blocos de 512) | 7001 (13 blocos de 512) |
| 1.ª diferença de comportamento (sem o estado da ckm, as falas e os eventos da arma) | tick 6991, 04:58:58: `de_east_9.suppressedUntil` 351,05 → 327,95 (a rajada que o fixaria não existe) | tick 7173, 05:00:20: `de_east_10.crouched` verdadeiro → falso |
| Ticks | 23 933 → 23 655 | 21 750 → 23 148 |
| 06:00 (s reais) | 565,8 → 560,5 | 539,0 → 542,7 |
| Fim (s reais) | 1196,65 → 1182,75 | 1087,5 → 1157,4 |
| Sobreviventes / vida do jogador | 12 → 12 / 84 → 92 | 18 → 18 / 100 → 100 |
| Clipping / empilhados | 0 / 0 | 0 / 0 |

A 1.ª diferença está no campo declarado (`$.state|checkpoint.actors.N.ckm|ckmFire`), no instante em que a rajada 14 não sai, e todos os 13 blocos anteriores são os do golden da emenda 14. Dos 26 eventos da missão, 14 mudam de relógio real em cada rota (a rota anda para um lado e para o outro) e **só um muda de relógio de batalha: `evt_m01_repair_complete`** (18 561,6 → 18 490,5 s no controlo, 18 214,65 → 18 264,6 s no apoio), que acontece quando os sapadores acabam e depende de quanto foram picados; os outros 25 mantêm a hora do enredo (04:31:00 … 06:10:00, 06:45:00, 07:00:00). Os mesmos 12 objectivos, CP-A..D, eventos consumidos e 07:05:00 nas duas rotas do golden e nas quatro rotas de invariantes da prova (sementes 3 e 7, controlo e apoio; a do apoio da semente 7 é a do golden): sobreviventes 12 / 18 em todas, relógios reais de fim 1205,5 → 1201,35 e 1153,45 → 1151,2 (semente 3), 1198,75 → 1204,1 e 1083,0 → 1151,5 (semente 7); clipping e empilhados 0.

A cadeia: `tests/m01-animation-contract.test.js` fixa `sourceSha256` à simulação viva, os `inputsSha256` do realizador, dos eventos de áudio e dos dados da missão (a `dlg_m01_115` em prioridade 2 faz parte deles), o `deltaFields`, a 1.ª diferença (`ckm_gunner`, `.ckm.phase`, `fire_burst` → `stoppage`, dentro da janela de fogo) e a 1.ª diferença de comportamento, e corre as duas rotas tick a tick contra o golden (2 de 2). As emendas 14, 13, 12 e 11 são história (o hash de `m01-barks.js` e de `mission.json` fixado na 12 e na 11 é o mesmo nas duas, e já não é o vivo).

## Testes alterados pela emenda (cada um com causa datada no ficheiro)

Nenhuma asserção foi apagada. As que dependiam do tempo de uma rota amostrada foram re-fixadas com o valor medido; as que provam uma propriedade mantêm-se como estavam.

| Ficheiro | O que mudou | Medido | Causa |
|---|---|---|---|
| `m01-barks.test.js` | o teste que proibia as palavras *stoppage / encrav / jam* na simulação passa a exigir o contrário; casos de 114 e 115 em `CASES`; dois testes novos | — | a ckm encrava |
| `m01-ckm-live-fire.test.js` | a cópia de fase pela guarnição inclui `stoppage` e `clearAt` | — | fase nova |
| `m01-animation-contract.test.js` | emenda 15 viva; 14, 13, 12 e 11 história (o hash de `m01-barks.js` / `mission.json` fixado nelas é igual entre si e já não é o vivo) | — | a emenda |
| `m01-cover-combat.test.js` (save antigo) | a fixture de save antigo apaga também `mg34Prone` | o save de 06:00 apanha duas MG34 a meio de rajada (relógio 598,0 contra 603,3) | um save sem `enemyFire` não pode ter uma rajada em voo (a postura MG34 é de 15/10, o `enemyFire` de 10/10); o validador recusou com razão a fixture meio antiga |
| `m01-cover-origin.test.js` (1.º teste) | corre na semente 2, a primeira das sementes auditadas em que a chamada é falada | semente 19390901: chamada às 501,45 s, 3,15 s depois de `dlg_m01_129` (intervalo de 4 s): mensagem no HUD em vez de voz; sementes 2, 3, 4 falam, 19390901, 1 e 5 não | o canal está ocupado em metade dos instantes; o ramo do HUD continua provado pelo teste «when no voice can be said»; as asserções são as mesmas |
| `m01-cover-threat.test.js` | margem de picadas 10 → 4 | 29 / 41 (folga 12) → 31 / 36 (folga 5) na semente 19390901 | caos de uma só semente: nas 12 sementes auditadas a folga (ignorar − cobrir) é 22,0 (dp 18,0) com e 22,8 (dp 13,9) sem encravamentos, diferença emparelhada −0,8 (e.p. 3,9); `COVER_PINS_12_SEEDS.json` |
| `m01-damage-decals.test.js` | limite 65 → 58 impactos; a rota corre até a 4.ª bomba | 71 → 64 impactos (3 tiros do jogador, como antes); `raid_0530` cai 1 tick depois de `hold_access` | o primeiro encravamento está dentro da janela e a rota anda 2,3 s; o relógio de batalha chega ao evento das 05:30 a 19 799,99999999992 (era 19 800): o evento consome-se com tolerância e o impacto do raide (`≥ 05:30:00`) não. Ver «Em aberto» |
| `m01-german-retreat.test.js` | `de_spans_5` → `de_spans_7` (portadores) e `de_spans_6` (registo de recuo) | na rota de controlo `de_spans_5` cai no tabuleiro (x 507) e os dois portadores são `de_spans_6` e `de_spans_7` | amostra de rota, mesmas mutações num homem que de facto carrega |
| `m01-soldier-visual-variation.test.js` | camada nova `CKMJAM_DELTA` no bloqueio de bytes de `src/render/m01-characters.js` (3 troços revertidos, cada um encontrado uma só vez, antes das camadas T47 e T36 que já lá estavam); tudo o resto continua fixo | falhava com «approved T47 delta occurs exactly once» (1 ≠ 2) | o renderizador lê a fase de clip de um registo ckm por `ckmClipPhase` (um `stoppage` toca o gesto `feed` no fim do desencrave) |

Ficheiros novos: `tests/m01-ckm-stoppage.test.js` (13 testes), `firstStoppage()` em `tests/helpers/m01-ckm-scenario.js`, dois testes de clips em `m01-ckm-live-presentation.test.js`, o terceiro teste de `tests/browser/m01-ckm-fire.spec.js` (com `tools/verification/playwright-port-4194.config.mjs`), `tools/verification/m01-ckm-jam-audit.mjs` e `tools/verification/m01-ckm-jam-pins-audit.mjs`.

## Verificação

- `node --test tests/m01-ckm*.test.js tests/m01-barks.test.js`, antes do `npm test`: **167/167**. Testes novos desta emenda: 13 em `m01-ckm-stoppage`, 2 em `m01-barks`, 2 em `m01-ckm-live-presentation`, 1 no contrato de animação (a emenda 15) e o 3.º do navegador.
- `npm test` completo, **uma só corrida** (94 min, 4 núcleos partilhados com outras branches): **1476 testes, 1475 verdes, 1 vermelho**. O vermelho era o bloqueio de bytes de `m01-soldier-visual-variation` (que não conhecia a camada nova do renderizador); corrigido com a camada `CKMJAM_DELTA` e o ficheiro corrido de novo: 9/9. Os outros 153 ficheiros passaram na mesma corrida, incluindo as re-fixações da tabela acima e o contrato de animação (31/31, as duas rotas do golden tick a tick).
- `npm run build` e `npm run verify:bundle`: OK.
- `node tools/verification/m01-integration-golden-audit.mjs --amendment 13` (modo de verificação, regenera a prova e o golden e compara byte a byte): «check: identical». `--amendment 12` (história, `after` `4e2588f`): «check: identical».
- Navegador: `tests/browser/m01-ckm-fire.spec.js` **3/3** com `CI=1`, porta 4194 (`tools/verification/playwright-port-4194.config.mjs`), Chromium com render por software (6,9 min), sobre as mesmas fontes de `src/`; não repetido depois.
- **Não** feito: playtest humano, FPS, qualquer medida de sensação de jogo.
- **Na integração (2026-10-22, ponta do ramo `claude/gallant-darwin-xr7jxu-integ` com WP1 + WP3 + WP2 + WP4):** `npm run build` OK; `npm test` **1524 testes, 1524 verdes, 0 vermelhos** (159 ficheiros, 37 min 28 s); `m01-integration-golden-audit.mjs --amendment 13`, `14` e `15` (modo de verificação): «check: identical» nas três; navegador (`CI=1`, SwiftShader, porta 4197 numa cópia da configuração 4185, apagada depois; a configuração 4194 deste ramo foi retirada): `m01`, `m01-pacing-hud`, `m01-hud-presentation`, `m01-ckm-fire`, `m01-difficulty-ui` e `m01-escort-hud`, 47 testes, 45 verdes à primeira; os dois vermelhos eram expectativas antigas e foram corrigidos e corridos sozinhos (verdes): o cartão do checkpoint com o nível («CP-A · Orientação · Soldado», do D5/WP1) e `CPD_ENEMIES_ALIVE` 44 → 43 em `m01.spec.js` (o save CP-D da rota perde `de_spans_5` e `de_spans_8` por causa das paragens da ckm e mantém `de_east_3`; 44 em `3eb21b38` e `c99a4326`, 43 com o WP2). Sem playtest humano.

Captura do navegador (`m01-ckm-stoppage-browser.png`, 04:58:52): a legenda «Atirador da ckm: Travou! Recarregar!» a meio do reparo (render por software; prova que o evento chega ao ecrã, não é imagem de qualidade).

## Em aberto

1. ~~A 115 não se ouve~~ **Resolvido na integração (2026-10-22)** por decisão do Capitão: a 115 em prioridade 2 (ver «Integração na candidata»); 8 de 11 pares nas 14 rotas. Fica em aberto a opção (b), uma pequena tolerância para eventos de um só instante no realizador (código de todas as falas): a 114 ainda se perde em cerca de metade dos casos com o canal ocupado.
2. **Sem som próprio do encravamento**: a arma cala-se e as legendas 114 / 115 dizem-no; não há amostra de «clique» nem de manivela (os eventos `ckm_stoppage*` existem para o áudio, ninguém os ouve ainda).
3. **Instantes e durações são balanço de jogo, sem fonte histórica** (14.ª e 45.ª rajadas; 3,8 e 4,6 s). Um save antigo feito depois dessas rajadas apanha o encravamento na rajada seguinte, e os dois um a seguir ao outro se passou a 45.ª. Uma rota com menos de 45 rajadas só tem um (as 14 medidas têm 51 a 62).
4. ~~Número da emenda.~~ **Resolvido na integração:** a emenda 13 sobre `4e2588f` colidia com a 13 do WP1 e a 14 do WP3; foi regenerada como **15** sobre a árvore da 14 (`c99a4326`). Os conflitos que se deram foram os previstos: a tabela `AMENDMENTS` de `tools/verification/m01-integration-golden-audit.mjs`, `tests/m01-animation-contract.test.js`, `DEVELOPMENT_STATUS.md`, as listas de camadas de `tests/m01-soldier-visual-variation.test.js`.
5. **Achado, não corrigido** (entrada do golden, fora do âmbito): o evento das 05:30 consome-se com tolerância de 1e-6 s no relógio de batalha (`trigger`) e o primeiro impacto do raide (`updateRaidSchedule`, `raid_0530`) com `>=` exacto; quando o relógio chega a 19 799,99999999992 o impacto cai um tick depois do evento (sem efeito de jogo; só `m01-damage-decals` o sentiu).
6. **Rotas amostradas.** As re-fixações da tabela acima são caos de rota (qualquer mudança de tempo move os sorteios seguintes dos alemães), medido onde importa (`COVER_PINS_12_SEEDS.json`: folga de picadas 22,0 contra 22,8, diferença emparelhada −0,8 ± 3,9; `CKM_JAM_ROUTES.json`: rondas da ckm −1 %); não escondem uma regressão que eu tenha visto, mas só o jogo a correr o confirma.
7. **Base.** `efb8eb0` (só mudou o workflow de CI) sobre `4e2588f`; não publicada nem revista por um revisor independente.
