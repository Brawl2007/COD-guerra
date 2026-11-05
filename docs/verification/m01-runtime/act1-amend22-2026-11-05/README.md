# Ato I: auditoria de consistência, português europeu e a busca alemã de quem segura uma linha — 2026-11-05 (emenda 22)

Ramo local `act1-amend22` (de `101b572a`, a linha de integração depois da revisão crítica do pacote 2). **Não publicado, sem playtest humano, sem revisão crítica independente.** Ordem do Capitão: (A) consistência e português europeu dos textos do Ato I (`missions/m01-tczew/mission.json`, `SCRIPT.md`, `HISTORICAL_RESEARCH.md`); (B) «busca alemã com movimento que acontece de verdade» (README do pacote 2 §5.4: 0 buscas nas 24 rotas). Só o Ato I (`M01Simulation`); o Ato VII (`areas/**`, `m01-area-sim.js`, `m01-act-factories.js`), o renderer, o áudio e o `DEVELOPMENT_STATUS.md` / ledger / handoff (do Capitão) não foram tocados.

Resumo em cinco linhas. **(1)** Texto: o papel de Pawlak passa a `MESSENGER` (a nota diz que não há rádio na secção), a fala 118 deixa de chamar «cabo» a Wrona (um `strzelec`), o debrief diz «o pelotão de sapadores» (§4 da pesquisa) e o Janik fora de cena deixa de ter as ordens «transmitidas pelo mensageiro» (quem as transmitiu é desconhecido); 65 outros valores de texto de `mission.json` e os dois documentos passam a português europeu (comboio, ecrã, fumo, facto, contacto, Polónia, polaco, controlo, câmara, «a olhar», Cubro-o!, carregas-me?). **(2)** Busca: o homem que **segura** uma linha que não é a sua mais funda e perdeu de vista os polacos segue agora o lanço da busca para a linha de aproximação seguinte (`tactics.search.hold`, sem sorteio, sem chave guardada nova). **(3) Resultado, sem exagero: continua a haver 0 buscas nas 24 rotas.** Medi-o outra vez, melhor: nas 24 rotas um homem do assalto pediu a busca 7 vezes (só nas rotas de controlo das sementes 1, 2 e 7, por causa da nuvem da única granada da rota) e **nas 7 vezes estava na sua linha mais funda**, onde já não há estação para onde ir; as duas rotas do golden nunca perdem os polacos de vista. O remédio que o README do pacote 2 propunha («deixar os homens em `hold` procurar») está feito e não chega: a causa é estrutural (§2.1). Com uma nuvem posta de propósito mais cedo, a busca de R2-b (a de cobertura) acontece 4 vezes na rota de controlo do golden, sem mexer no enredo (§2.2): o que falta ao jogo é uma causa nessa altura (§5.1). **(4)** Golden **emenda 22** regenerado pela ferramenta oficial: **nada do que acontece muda** (nem um tick a mais ou a menos, os mesmos eventos ao mesmo tempo real, as mesmas saídas); só mudam palavras e o comprimento das legendas. **(5)** O que fica ao Capitão: o que fazer para a busca existir nas rotas (§5.1).

## 1. O que mudou

### 1.1 Consistência dos dados (A)

| # | achado | antes | depois |
|---|---|---|---|
| 1 | `staszek_pawlak.role` contradizia a sua `roleNote` («Sem rádio na secção; faz a ligação a pé») | `RADIO_OPERATOR` | `MESSENGER`. Nenhum consumidor em `src/` ou `tools/` lê o papel `RADIO_OPERATOR` nem `MESSENGER` (o código só lê pelo nome `MEDIC`, `ENGINEER`, `SUPPORT`, `RIFLEMAN` e `CIVILIAN`); os saves antigos com `RADIO_OPERATOR` carregam (testado). Os ficheiros do Ato VII (`areas/np/act*.json`) têm o seu próprio elenco com `RADIO_OPERATOR` e **não foram tocados** (§5.3) |
| 2 | `dlg_m01_118` (`ckm_reserve`) tratava Wrona (`strzelec`, soldado raso) por «Cabo» / «Panie kapralu» | «Cabo, pelo aterro para oeste?» / PL «Panie kapralu, nasypem na zachód?» | «Wrona, pelo aterro para oeste?» / PL «Wrona, nasypem na zachód?». O polaco é **de agente de IA, por rever por falante nativo** (dito na `note`). O spec de navegador `tests/browser/m01-hud-presentation.spec.js` e a tabela `docs/direction/M01_REACTIVE_DIALOGUE.md` seguem |
| 3 | `db_05`: os sapadores eram um pelotão (`HISTORICAL_RESEARCH.md` §4, «oficial do pelotão de sapadores») | «Os sapadores eram comandados pelo subtenente Norbert Juchtman.» | «O pelotão de sapadores era comandado pelo subtenente Norbert Juchtman.» |
| 4 | `hist_janik.appearsAs`: quem transmitiu a ordem é desconhecido (os dados do VII-c dizem «quem a transmitiu, por onde e a ordem de marcha: desconhecidos»; a pesquisa: «ordens chegam como "ordem do comandante do batalhão"») | «ordens transmitidas pelo mensageiro; nome só no debrief» | «ordens que chegam como «ordem do comandante do batalhão»; quem as transmitiu é desconhecido (o mensageiro do jogo é dramatização); nome só no debrief» |

### 1.2 Português europeu (A)

Passe **só de ortografia e dos brasileirismos mais claros**, com substituições de palavra inteira e contagens verificadas (o texto polaco das notas «PL: …» e os títulos de fontes citados não têm nenhuma destas palavras e não foram tocados). 65 valores de texto de `mission.json` (falas, contextos, notas, resultados, a mensagem de falha, o debrief; com os 5 da auditoria de §1.1 são os **70** valores que a emenda muda no ficheiro), mais `SCRIPT.md` e `HISTORICAL_RESEARCH.md`: Polónia / Topónimo / bónus; contacto; facto(s); câmara; **controlo**; **comboio** (trem); **ecrã** (tela); **fumo** (fumaça); **polaco(s/a/as)** (polonês); planeou; regista(do); carris (trilhos); secção (seção); «apanha fogo»; o progressivo brasileiro («estão atirando», «sair correndo», «limpando o rkm», «Trocando carregador!», «Recarregando!», «A fita está acabando!», «Continuo contando.») passa a «a + infinitivo»; `salvar` um jogo passa a `guardar`; «você» pelo registo da fala: «Cubro-o!» (Kowal ao jogador, como o resto da secção trata o jogador, pelo imperativo formal), «Dudek, se eu desmaiar, carregas-me?» (camaradas, tu), «Afastou-se da sua secção.» (mensagem impessoal); a «Pegou. Mude de posição.» de Kowal (PL «Dostał.») passa a «Acertou. Mude de posição.». **Não fiz**: reescrever frases ou expressões («Café de verdade hoje» fica), nem tocar na grafia que o Acordo deixa valer das duas maneiras (objectivo/objetivo, activo/ativo, sector/setor, direcção/direção: os três ficheiros misturam as duas e não é desta emenda).

`tests/m01-hud-presentation.test.js` procura o fotograma do ecrã preto da introdução pelo texto da acção do dado («tela preta» → «ecrã preto»); foi o único teste que citava uma cadeia alterada (procurei todas as 70 em `tests/`, `tests/browser/`, `tools/` e `src/`: o resto são comentários).

### 1.3 A busca alemã (B)

`src/game/m01-simulation.js` `deckSearch` e `mission.json` `grp_de_spans.deckAssault.tactics.search.hold` (booleano opcional, validado em `src/game/m01-deck-assault.js`; apagar a chave ou pôr `false` repõe a busca de R2-b só em cobertura). Um homem do assalto em `hold` numa linha que **não é a mais funda**, com um polaco visto há `afterSec`…`memorySec` (3…12 s) e nenhum à vista agora, segue o lanço da busca para a **linha seguinte**: a primeira estação, a no máximo `rushStations` (2) de onde está e nunca para lá dessa linha, de onde um homem de pé veria o sítio (a vista do mundo, não a do pó); o `lim` do registo passa a ser essa linha, como se a pressão a abrisse; a regra de baixas de `deckLine` pode ainda recuá-lo uma linha; o prazo do esquadrão cresce `closeExtraSec` como para qualquer homem numa linha de aproximação; e, como o avanço por pressão, espera `casualtyHoldSec` depois da última baixa do assalto. A linha mais funda continua a ser o fim de **todo** o movimento do assalto (`safeX` é o número do proprietário). Sem sorteio, sem fluxo novo, sem chave guardada nova (`lim`, `node` e `phase` já existiam e já se validam); o evento é o `deck-tactic` `search` de sempre.

O que **não** fiz: o MG34 e os atiradores dos portões e do dique **não se mexem** em lado nenhum do Ato I (nenhum código move `grp_de_east`; é o «portão estático» da matriz R0, AI-3): dar-lhes um sítio para onde ir é mexer em posições de tiro autoradas, no `mg34Prone`, nas ckm e nos testes de arco de fogo, e não o fiz. Os únicos alemães que se movem no Ato I são os 10 homens de `grp_de_spans`, o assalto do tabuleiro (todos `kar98k`; não há MG34 entre eles). A «busca» do MG34 é fogo (ao último sítio visto, 60 s), sem movimento, como era.

## 2. A busca nas 24 rotas: números e causa

### 2.1 As 24 rotas do piloto de teste (12 sementes × controlo e apoio), com o código final

Ferramenta: `node tools/verification/m01-pkg2-metrics.mjs --label amend22 --jsonl <f>` (só lê; determinista; ganhou `fire.lostSight` nesta emenda). «perguntas da busca» = quantas vezes um homem do assalto não tinha nenhum polaco à vista no seu disparo e chamou `deckSearch`; «na linha mais funda» = quantas dessas foram na linha mais funda do próprio homem (onde já não há estação); «buscas» = eventos `deck-tactic` `search`. Antes da emenda os números de granadas, aproximação e sobreviventes são os do README do pacote 2 §2 (idênticos: o código não mexeu em nenhuma destas rotas).

**Rotas de controlo** (12)

| rota | granadas | perguntas da busca (nenhum polaco à vista) | na linha mais funda | buscas | mais perto de um polaco (m) | sobreviventes | fim da rota (s reais) |
|---|---|---|---|---|---|---|---|
| 19390901:0 | 1 | 0 | 0 | 0 | 23 | 12 | 1308,5 |
| 1:0 | 1 | 4 | 4 | 0 | 23 | 12 | 1271,4 |
| 2:0 | 1 | 2 | 2 | 0 | 23 | 12 | 1308,7 |
| 3:0 | 1 | 0 | 0 | 0 | 23 | 12 | 1318,7 |
| 4:0 | 0 | 0 | 0 | 0 | 207,8 | 12 | 1182,1 |
| 5:0 | 0 | 0 | 0 | 0 | 41,7 | 12 | 1260 |
| 6:0 | 0 | 0 | 0 | 0 | 194,1 | 12 | 1245,9 |
| 7:0 | 1 | 1 | 1 | 0 | 23 | 12 | 1334,6 |
| 8:0 | 0 | 0 | 0 | 0 | 23 | 12 | 1285,1 |
| 9:0 | 1 | 0 | 0 | 0 | 23 | 12 | 1304,7 |
| 10:0 | 0 | 0 | 0 | 0 | 37,8 | 12 | 1294 |
| 11:0 | 0 | 0 | 0 | 0 | 70,9 | 12 | 1283,6 |

Totais: 12 rotas, 6 granadas (rotas com granada 6), 7 perguntas da busca em 3 rotas, 7 na linha mais funda, 0 buscas.
Completas: 12/12; sobreviventes [12]

**Rotas de apoio** (12)

| rota | granadas | perguntas da busca (nenhum polaco à vista) | na linha mais funda | buscas | mais perto de um polaco (m) | sobreviventes | fim da rota (s reais) |
|---|---|---|---|---|---|---|---|
| 19390901:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1131,4 |
| 1:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1126,6 |
| 2:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1137,6 |
| 3:1 | 0 | 0 | 0 | 0 | 194,1 | 18 | 1112,9 |
| 4:1 | 0 | 0 | 0 | 0 | 141,9 | 18 | 1189,4 |
| 5:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1140,6 |
| 6:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1064,7 |
| 7:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1116,3 |
| 8:1 | 0 | 0 | 0 | 0 | 194,1 | 18 | 1194,6 |
| 9:1 | 0 | 0 | 0 | 0 | 194,1 | 18 | 1119,1 |
| 10:1 | 0 | 0 | 0 | 0 | 202,4 | 18 | 1103,7 |
| 11:1 | 0 | 0 | 0 | 0 | 194,1 | 18 | 1166,9 |

Totais: 12 rotas, 0 granadas (rotas com granada 0), 0 perguntas da busca em 0 rotas, 0 na linha mais funda, 0 buscas.
Completas: 12/12; sobreviventes [18]

**As rotas do golden e as de guarda** (a ferramenta de golden conta os eventos `search` dos dois lados em cada uma e o relatório diz): 19390901 controlo, 7 apoio (as duas do golden) e as sementes 3 e 7 com e sem apoio: **0 buscas antes e depois**, em todas as seis (§3).

### 2.2 O que acontece se a causa vier mais cedo (experiência, o teste fica no repositório só para a rota do golden)

A nuvem de uma granada (`dustSpec('grenade')`, 4,5 m, 20 s) ou a de um obus (`shell`, 8 m, 30 s) é posta de propósito sobre os três postos da retaguarda no primeiro tick em que um homem do assalto **segura uma linha que não é a sua mais funda** (a experiência não está no repositório; `tests/m01-act1-search-route.test.js` repete-a para a rota de controlo do golden com a nuvem de granada). O resto é a luta real, com o código final:

| rota | nuvem | instante (s reais) | buscas | perguntas | fim | sobreviventes | CP-A..D |
|---|---|---|---|---|---|---|---|
| 19390901 controlo | granada | 724,8 | **4** (às 729,5; 732,4; 734,3; 736,5) | 10, 0 na linha mais funda | 07:05:00 | 12 | 4 |
| 19390901 controlo | obus | 724,8 | **4** (as mesmas) | 25, 3 na mais funda | 07:05:00 | 12 | 4 |
| 1 controlo | obus | 715,1 | 4 | 27, 7 na mais funda | 07:05:00 | 12 | 4 |
| 2 controlo | obus | 722,0 | 1 | 20, 0 | 07:05:00 | 12 | 4 |
| 3 controlo | obus | 733,9 | 3 | 26, 2 | 07:05:00 | 12 | 4 |
| 7 controlo | obus | 737,2 | 1 | 18, 0 | 07:05:00 | 12 | 4 |
| 7 apoio | obus | 710,9 | 0 | 5, 0 | 07:05:00 | 18 | 4 |

Nas quatro da rota do golden (por homem: `de_spans_5` e `_7` a caminho da linha 1, `_4` e `_6` da linha 0) **todas saem de cobertura**, isto é, é a busca de R2-b e não a extensão de `hold`: o único homem em `hold` que perguntou (`de_spans_4`, às 739,0 s, linha 0) tinha o último polaco visto de há 18,4 s e a memória é de 12 s; dos outros nove pedidos (todos de cobertura) quatro buscaram (último polaco visto há 10,6–11,9 s) e cinco falharam pela mesma memória (14,7–26,9 s: os homens que vão a caminho de uma estação não actualizam a vista, só a actualizam no disparo). O enredo é sempre o da rota sem nuvem (o teste compara os 12 objectivos, CP-A..D, 07:05, os eventos consumidos, as bandeiras sem a dica de cobertura, os sobreviventes e que ninguém essencial caia) e duas execuções da cena dão a mesma luta ao último byte do estado. A saúde final do jogador do piloto de controlo muda, sem direcção fixa (19390901: 100 → 84; semente 1: 84 → 76; 2: 44 → 68; 3: 28 → 52; 7: 84 → 84), como muda com qualquer alteração do instante do assalto. **Leitura**: o mecanismo de busca existe e funciona nesta luta quando a causa vem **antes** de o esquadrão estar na linha mais funda; o que falta é uma causa nessa altura (§5.1). A extensão para `hold` é correcta e coberta por cenas, mas quase nunca tem ocasião de actuar.


### 2.3 A causa, medida

Num tabuleiro recto e aberto os polacos estão todos à vista de todos os alemães (em 136 disparos de homens do assalto da rota de controlo do golden, todos os defensores do tabuleiro estavam sempre à vista: 0 disparos com um defensor escondido), por isso um homem só fica sem nenhum polaco à vista quando **o pó o esconde a todos**, e o único pó da luta é a granada alemã (4,5 m, 20 s), lançada pelo homem da frente ao tomar a sua linha mais funda, a 23 m do posto mais a leste da retaguarda. A essa hora os outros cinco já estão também nas suas linhas mais fundas (a regra da pressão põe-nos lá, uma linha de cada vez, em 20 s) ou já recuaram. Na rota de controlo do golden o lançamento é às 840,3 s reais, a nuvem forma-se às 844,1 s e os cinco homens que ainda estavam no tabuleiro recuam entre as 831 s e as 849 s (o sexto recuou às 772 s): nenhum chega a um disparo sem polaco à vista. Nas rotas de apoio o piloto suprime o assalto a mais de 140 m e os homens têm o jogador sempre à vista (16 disparos na rota do golden, todos para o jogador). Medi ainda, numa experiência que **não ficou**, `stages` 3 (uma linha de aproximação a mais): nas 6 rotas de controlo em que a corri (19390901, 1, 2, 6, 7, 8) os pedidos da busca continuaram todos na linha mais funda (3 pedidos, na semente 8) e nenhum buscou; a granada continua a ser lançada da linha mais funda, com o esquadrão já lá. O README do pacote 2 §5.4 propunha três remédios (deixar o `hold` procurar, uma nuvem mais longa, um piloto que lance granadas): o primeiro está feito e, pelo que se vê, não bastava; uma nuvem mais longa não dá ao homem da linha mais funda um sítio para onde ir; o terceiro mexe no piloto, que é entrada fixada de todos os goldens.

## 3. Golden: emenda 22 (`texts+search-hold`)

Gerada pela ferramenta oficial (`node tools/verification/m01-integration-golden-audit.mjs --amendment 22 --write`, x86; 02:21 → 03:22 UTC, ≈ 1 h com a máquina partilhada: `written`, saída 0), predecessor **exacto** `101b572af0c1f8489942b8ce3eadee5016ac02c4` (a linha de integração: a sua simulação, `2b6be194…`, é a que o golden da emenda 21 fixa, e todas as 28 entradas gravadas desse golden são os ficheiros desse commit, o que verifiquei antes de correr). A emenda 21 passa a história (`after` = esse commit; o seu golden fixa a simulação dele). Ficheiros: `tests/fixtures/m01-act1-texts-gameplay-baseline.json` (o golden; `sourceSha256` `ccf155d5…`), `docs/verification/m01-runtime/act1-amend22-2026-11-05/GOLDEN_AMENDMENT_22.json` (a conta), `tests/m01-animation-contract.test.js` (a 21 história, a 22 viva).

- **Prova por tick** (as duas rotas do T47: 19390901 controlo e 7 com apoio). As duas simulações diferem **desde o 1.º tick** (tick 1, 04:30:44) por uma palavra: `actors.6.role`, Pawlak (`RADIO_OPERATOR` → `MESSENGER`). Com o papel antigo reposto e o estado do diálogo retirado dos dois lados (a lista da emenda 10: `dialogueConsumed`, `dialogueQueue`, `subtitle`, `timers.barks` / `guide` / `guideDist` e as duas mensagens de HUD do guia), as duas são **byte a byte iguais em todos os ticks das duas rotas** (26170 e 22326 ticks; `firstBehaviourDifference` nulo nas duas), eventos incluídos. O estado do diálogo tem de ser retirado porque a duração de uma legenda é `max(2,5; min(6; caracteres / 24))` s e o guia espera pela voz (`followCall`): o português europeu muda o comprimento de algumas legendas e, com ele, o instante de algumas linhas do guia, que não são comportamento.
- **O enredo e o tempo**: iguais aos da emenda 21. Os 12 objectivos, CP-A..D, os eventos consumidos, as bandeiras, os sobreviventes (12 / 18), o relógio de batalha final (07:05:00), o tempo real de cada evento (`movedEvents` vazio nas duas), do fim (1308,5 s e 1116,3 s) e das 06:00 (562,95 e 543,2 s), a saúde final do piloto (100 e 100) e as rondas alemãs por minuto real (90,24 e 59,39); **0 atravessamentos e 0 empilhados** nas duas rotas e nas quatro de guarda (sementes 3 e 7, com e sem apoio), cujo enredo e tempo real também são os do predecessor.
- **Buscas por rota do golden e de guarda** (`measured.searches` da conta, predecessor → vivo): 19390901 controlo 0 → 0; 7 apoio 0 → 0; semente 3 controlo 0 → 0; 3 apoio 0 → 0; 7 controlo 0 → 0; 7 apoio 0 → 0.
- **Entradas que se mexeram** desde o predecessor: `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json` e `src/game/m01-deck-assault.js` (o validador da chave); as outras 25 entradas gravadas (incluindo o pó, o socorro, o realizador, a secção, o piloto `tests/helpers/m01-route.js` e `map-layout.json`) não.
- **Emenda 21 como história**: `node tools/verification/m01-integration-golden-audit.mjs --amendment 21` → **`check: identical`** (02:21 → 03:16; o golden e a conta da 21 não mudaram um byte, o `after` passou a `101b572a`).
- **Emenda 22**: `--amendment 22` (sem `--write`) → **`check: identical`** (03:22 → 04:16 UTC, saída 0; a conta e o golden regenerados são os escritos, byte a byte). A última linha do relatório da ferramenta é essa.
- **Goldens da área** (pedido: «correr os da área e, se só as linhas sha256 mudarem, escrevê-los»): `node tools/verification/m01-act-vii-a-golden.mjs`, `-b-` e `-c-` → **`check: identical`** os três. As entradas que fixam são todas do Ato VII (`m01-area-sim.js`, `m01-act-factories.js`, `areas/np/*`, …) e nenhuma mudou; não escrevi nada.
- **`tests/m01-animation-contract.test.js`** (explicado): (a) o golden vivo passa a ser o da 22 (`act1Texts`), (b) `MOVED_BY_22` = a simulação, o `mission.json` e o tabuleiro: o teste do golden da 21 passa a história como o da 20 passou na 21 (a simulação já não é a que ele fixa, os três ficheiros ficam «movidos», todas as outras entradas gravadas continuam iguais aos ficheiros vivos), (c) o teste novo da 22 (cadeia, entradas, a prova por tick acima, as buscas 0 → 0). Os testes dos goldens da 20 e anteriores não precisaram de mudar: os três ficheiros que a 22 mexe já estavam em `MOVED_BY_21`.

## 4. Testes e verificação

Tudo sobre as fontes do ramo `act1-amend22` no commit final dos ficheiros de jogo e de dados (`cb3f5e5e` e anteriores; depois dele só testes, ferramentas de leitura e este documento). A máquina era de 4 CPUs, partilhada com outros agentes e com as corridas do golden (carga 9–13). **Não corri `npm test` completo** (outra etapa).

| comando | resultado real |
|---|---|
| `node --test --test-concurrency=2 tests/m01-german-ai.test.js tests/m01-german-ai-tactics.test.js tests/m01-deck-assault.test.js tests/m01-dust.test.js tests/m01-dust-ai.test.js tests/m01-aid.test.js tests/m01-acts.test.js tests/m01-pkg2-saves.test.js tests/m01-pkg2-routes.test.js tests/m01-barks.test.js tests/m01-tczew-data.test.js tests/m01-hud-presentation.test.js` | `# tests 275  # pass 275  # fail 0` (879 s) |
| `node --test --test-concurrency=2 tests/m01-act1-texts.test.js tests/m01-act1-search-route.test.js tests/m01-hud-presentation.test.js tests/m01-tczew-data.test.js tests/m01-german-ai-saves.test.js tests/m01-pkg2-safex-saves.test.js tests/m01-act-vii-a.test.js tests/m01-act-vii-b.test.js tests/m01-act-vii-c.test.js tests/m01-audio-director.test.js tests/m01-blast.test.js tests/m01-bomb-effects.test.js tests/m01-combat-posture-staging.test.js tests/m01-continuous-fixes.test.js tests/m01-opening.test.js tests/m01-runtime.test.js tests/m01-sappers-operation.test.js tests/m01-section.test.js tests/m01-german-retreat.test.js tests/m01-station-evacuation.test.js` (os testes que lêem textos do `mission.json` — o debrief, as falas, o elenco — e os saves e rotas que atravessam o assalto) | `# tests 297  # pass 297  # fail 0` (1706 s) |
| `node --test tests/m01-barks.test.js` (outra vez, no `mission.json` final: o ficheiro mudou depois do primeiro lote) | `# tests 165  # pass 165  # fail 0` |
| `node --test --test-concurrency=1 tests/m01-animation-contract.test.js` | `# tests 40  # pass 40  # fail 0` (349 s; eram 39: +1 o da emenda 22; inclui, por rota, o digest de todos os bytes de jogo a cada tick contra o golden novo) |
| `npx playwright test --config <cópia temporária, porta 4291> tests/browser/m01-hud-presentation.spec.js -g "reactive dialogue"` (`CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, `CI=1`, build de produção) | `1 passed (1.7m)`: a legenda «Wrona, pelo aterro para oeste?» aparece com o falante «Soldado da ckm:» e a seguinte, «Pelo aterro. De lá também atira.», com o «Atirador da ckm:»; a cópia da configuração e o `dist/` foram apagados |
| `npm run build` | build de produção sem erros (Vite; só o aviso habitual de chunk > 600 kB; 2 s) |

Testes novos ou alterados: `tests/m01-act1-texts.test.js` (novo, 6), `tests/m01-act1-search-route.test.js` (novo, 1: a rota de controlo do golden com a nuvem forçada, três corridas), `tests/m01-german-ai-tactics.test.js` (+1: a busca de quem segura a linha; o ciclo das fases sem `hold`), `tests/m01-dust-ai.test.js` (+1: a nuvem sobre quem segura a linha, em estado e ao longo de ticks), `tests/m01-german-ai.test.js` (o validador da chave `hold`: +2 recusas e +3 aceitações), `tests/m01-hud-presentation.test.js` (o fotograma «ecrã preto»), `tests/browser/m01-hud-presentation.spec.js` (a fala 118), `tests/m01-animation-contract.test.js` (§3). Nenhuma asserção removida; os pinos mudados têm comentário datado.

## 5. Riscos, limites e decisões que ficam ao Capitão

1. **A busca ainda não acontece nas rotas** (0/24). Para acontecer há de haver uma causa de «perder de vista» antes de o esquadrão estar na linha mais funda. Três caminhos, do mais barato ao mais caro, nenhum feito: **(a) fogo de busca** do atirador na linha mais funda ao último sítio visto, como o MG34 (rondas `squad` que prendem os polacos na nuvem; sem movimento, e mexe na pressão e no jogador, porque a última vista pode ser o jogador); **(b) uma fonte de pó mais cedo** na luta (por exemplo, fogo de apoio alemão `shell`, 8 m × 7 m, 30 s, sobre os postos polacos quando o assalto está nas linhas 0–1): dá ao esquadrão uma causa e linhas onde procurar, mas é um acontecimento novo e prende polacos; **(c) cobertura no tabuleiro** (uma fiada de sacos à frente dos três postos da retaguarda, `map-layout.json`, kit T12): os ajoelhados ficam fora de vista entre disparos e a busca (em cobertura e em `hold`) passa a ter causa em todas as linhas; é a mais natural e a mais cara (colisão, navegação, clipping, render, `bz_east`, todos os goldens do Ato I).
2. **Cadeias com «você» no código, não nos três ficheiros pedidos**: `src/game/m01-difficulty.js` (`deathText`: «Você caiu de uma altura fatal.», «Você caiu no Vístula.», «Você se afastou da sua secção.»), `src/game/m01-simulation.js` (mensagens da fronteira) e `src/game/m01-area-sim.js`. Os testes `m01-difficulty-death*.test.js` fixam-nas; deixei-as. O `failure.message` de `obj_m01_leave_bridge` em `mission.json` (que nenhum código lê) já está em português europeu e difere agora da cadeia gémea do código.
3. **Ato VII**: `areas/np/act.json`, `act-vii-b.json` e `act-vii-c.json` têm `RADIO_OPERATOR` para Pawlak e palavras brasileiras próprias; são entradas dos goldens do Ato VII e não fazem parte desta emenda.
4. **Polaco da fala 118** escrito por um agente de IA: por rever por falante nativo. «Wrona» (nominativo) como vocativo entre soldados rasos é a minha escolha; um falante nativo pode preferir «Kolego» ou «Wrona!».
5. **`SCRIPT.md`** ainda atribui a fala 030 a Bąk (desde 2026-10-19 é de Kowal); só mudei o registo («Cubro-o!»). `docs/direction/M01_FABLE_GAP_2026-10-18.md` (histórico) não foi acertado.
6. **Sem playtest e sem captura**: as legendas novas não foram vistas no jogo (o spec de navegador da fala 118 foi alterado e passa, §4: é a única legenda nova que um navegador viu).
7. **O comprimento de algumas legendas mudou** (a duração de uma legenda é `max(2,5; min(6; caracteres / 24))` s): é a razão de o golden precisar de tirar o estado do diálogo para provar que nada acontece de diferente (§3), como a emenda 10.

## 6. Ficheiros

Dados e texto: `missions/m01-tczew/mission.json` (70 valores de texto; `grp_de_spans.deckAssault.tactics.search.hold`; a nota do assalto), `missions/m01-tczew/SCRIPT.md`, `missions/m01-tczew/HISTORICAL_RESEARCH.md`, `docs/direction/M01_REACTIVE_DIALOGUE.md` (as linhas 112, 118, 129, 140, 150 e a regra 9 da tabela acompanham o texto). Código: `src/game/m01-simulation.js` (`deckSearch`), `src/game/m01-deck-assault.js` (o validador de `hold`). Ferramentas: `tools/verification/m01-integration-golden-audit.mjs` (emenda 22; a 21 história; as buscas contadas só na 22), `tools/verification/m01-pkg2-metrics.mjs` (`fire.lostSight`). Golden e prova: `tests/fixtures/m01-act1-texts-gameplay-baseline.json`, `docs/verification/m01-runtime/act1-amend22-2026-11-05/GOLDEN_AMENDMENT_22.json`. Testes: os de §4. Não tocados: o Ato VII, o renderer, o áudio, `DEVELOPMENT_STATUS.md`, o ledger e o handoff.
