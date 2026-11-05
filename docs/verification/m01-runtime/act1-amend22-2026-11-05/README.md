# Ato I: auditoria de consistência, português europeu e o tiro de apoio alemão que dá causa à busca — 2026-11-05 (emenda 22, revista)

Ramo local `act1-amend22-fix` (de `5fb94feb`, o ramo `act1-amend22` que a revisão independente **rejeitou**; a linha de integração `101b572a` já estava nele). **Não publicado, sem playtest humano, sem revisão crítica independente desta correcção.** A revisão rejeitou a parte (B) da ordem do Capitão («busca alemã com movimento que acontece de verdade»): a primeira versão deixou **0 buscas** nas duas rotas do golden, nas quatro de guarda e nas 24 rotas, e fixou esse zero em dois testes. Só o Ato I (`M01Simulation`); o Ato VII (`areas/**`, `m01-area-sim.js`, `m01-act-factories.js`), o renderer, o áudio, o piloto de teste (`tests/helpers/m01-route.js`), `map-layout.json`, `acts.json` e o `DEVELOPMENT_STATUS.md` / ledger / handoff (do Capitão) não foram tocados.

Resumo em seis linhas. **(1)** A revisão tinha razão e a causa é a do README do pacote 2 §5.4: num tabuleiro recto e aberto todos os polacos estão à vista de todos os alemães, por isso ninguém perde nada de vista antes da linha mais funda, e a única nuvem (a da granada) chega quando o esquadrão já lá está. O remédio da primeira versão (a busca de quem segura uma linha) estava certo e **ficou**; faltava a causa. **(2)** Correcção (opção b da revisão): `tactics.support`, **um** tiro de apoio alemão que cai à frente da retaguarda polaca 4 s depois de ela estar nos seus postos (§1.5): deixa cratera e uma nuvem de 8 m durante 30 s, não fere nem abala ninguém, tapa os polacos aos alemães do tabuleiro (e os alemães aos polacos), e os homens do assalto que ficam sem ver ninguém procuram. **(3)** Resultado medido: **rota de controlo do golden 5 buscas, rota de apoio do golden 1** (esta é a primeira vez que a busca de quem segura uma linha actua numa rota); nas 24 rotas 33 buscas em 17 rotas (controlo 26 em 11 de 12; apoio 7 em 6 de 12); todas completam, sobreviventes 12 / 18, e a granada de mão continua a cair em 6 das 12 rotas de controlo (§2). **(4)** O golden **emenda 22** passa a ser **de comportamento**, regenerado pela ferramenta oficial: a primeira diferença de comportamento, com o papel de Pawlak, o texto do objectivo e o estado do diálogo repostos, é a cratera do tiro (§3); o enredo (12 objectivos, CP-A..D, 07:05, eventos, bandeiras, sobreviventes) é o do predecessor. **(5)** O MG34 e os atiradores do portão e do dique continuam sem se mexer: perdem o alvo de vista quase sempre na retirada (rota de controlo do golden: o dique em 1416 de 2274 disparos, o portão em 908 de 1182, o MG34 em 105 de 186), por isso «procurar mexendo-se» seria um movimento por disparo em homens a 1 km do jogador, não «um número pequeno» (§2.3). **(6)** O que fica ao Capitão: um tiro novo (dramatização, sem fonte) na luta, o tempo de queda escolhido por uma varredura (4 s; 5, 6 e 7 s fazem rotas passar a paciência do piloto) e nada de playtest (§5).

## 1. O que mudou

### 1.1 Consistência dos dados (A), da primeira versão (confirmada pela revisão)

| # | achado | antes | depois |
|---|---|---|---|
| 1 | `staszek_pawlak.role` contradizia a sua `roleNote` («Sem rádio na secção; faz a ligação a pé») | `RADIO_OPERATOR` | `MESSENGER`. Nenhum consumidor em `src/` ou `tools/` lê o papel `RADIO_OPERATOR` nem `MESSENGER` (o código só lê pelo nome `MEDIC`, `ENGINEER`, `SUPPORT`, `RIFLEMAN` e `CIVILIAN`); os saves antigos com `RADIO_OPERATOR` carregam (testado). Os ficheiros do Ato VII (`areas/np/act*.json`) têm o seu próprio elenco com `RADIO_OPERATOR` e **não foram tocados** (§1.3) |
| 2 | `dlg_m01_118` (`ckm_reserve`) tratava Wrona (`strzelec`, soldado raso) por «Cabo» / «Panie kapralu» | «Cabo, pelo aterro para oeste?» / PL «Panie kapralu, nasypem na zachód?» | «Wrona, pelo aterro para oeste?» / PL «Wrona, nasypem na zachód?». O polaco é **de agente de IA, por rever por falante nativo** (dito na `note`). O spec de navegador `tests/browser/m01-hud-presentation.spec.js` e a tabela `docs/direction/M01_REACTIVE_DIALOGUE.md` seguem |
| 3 | `db_05`: os sapadores eram um pelotão (`HISTORICAL_RESEARCH.md` §4, «oficial do pelotão de sapadores») | «Os sapadores eram comandados pelo subtenente Norbert Juchtman.» | «O pelotão de sapadores era comandado pelo subtenente Norbert Juchtman.» |
| 4 | `hist_janik.appearsAs`: quem transmitiu a ordem é desconhecido (os dados do VII-c dizem «quem a transmitiu, por onde e a ordem de marcha: desconhecidos»; a pesquisa: «ordens chegam como "ordem do comandante do batalhão"») | «ordens transmitidas pelo mensageiro; nome só no debrief» | «ordens que chegam como «ordem do comandante do batalhão»; quem as transmitiu é desconhecido (o mensageiro do jogo é dramatização); nome só no debrief» |

### 1.2 Português europeu (A), primeira passagem

Passe **só de ortografia e dos brasileirismos mais claros**, com substituições de palavra inteira e contagens verificadas (o texto polaco das notas «PL: …» e os títulos de fontes citados não têm nenhuma destas palavras e não foram tocados). 65 valores de texto de `mission.json` (falas, contextos, notas, resultados, a mensagem de falha, o debrief; com os 5 da auditoria de §1.1 são os **70** valores que a emenda muda no ficheiro), mais `SCRIPT.md` e `HISTORICAL_RESEARCH.md`: Polónia / Topónimo / bónus; contacto; facto(s); câmara; **controlo**; **comboio** (trem); **ecrã** (tela); **fumo** (fumaça); **polaco(s/a/as)** (polonês); planeou; regista(do); carris (trilhos); secção (seção); «apanha fogo»; o progressivo brasileiro («estão atirando», «sair correndo», «limpando o rkm», «Trocando carregador!», «Recarregando!», «A fita está acabando!», «Continuo contando.») passa a «a + infinitivo»; `salvar` um jogo passa a `guardar`; «você» pelo registo da fala: «Cubro-o!» (Kowal ao jogador, como o resto da secção trata o jogador, pelo imperativo formal), «Dudek, se eu desmaiar, carregas-me?» (camaradas, tu), «Afastou-se da sua secção.» (mensagem impessoal); a «Pegou. Mude de posição.» de Kowal (PL «Dostał.») passa a «Acertou. Mude de posição.». **Não fiz**: reescrever frases ou expressões («Café de verdade hoje» fica), nem tocar na grafia que o Acordo deixa valer das duas maneiras (objectivo/objetivo, activo/ativo, sector/setor, direcção/direção: os três ficheiros misturam as duas e não é desta emenda).

`tests/m01-hud-presentation.test.js` procura o fotograma do ecrã preto da introdução pelo texto da acção do dado («tela preta» → «ecrã preto»); foi o único teste que citava uma cadeia alterada (procurei todas as 70 em `tests/`, `tests/browser/`, `tools/` e `src/`: o resto são comentários).

### 1.3 Português europeu: o que a revisão achou incompleto (A)

A auditoria de consistência da primeira versão **fica como estava e foi confirmada pela revisão**: `staszek_pawlak.role` `RADIO_OPERATOR` → `MESSENGER` (nenhum consumidor em `src/` ou `tools/` lê o papel; os saves antigos carregam), `dlg_m01_118` («Wrona, pelo aterro para oeste?», PL «Wrona, nasypem na zachód?», escrito por agente de IA, por rever por falante nativo), `db_05` («O pelotão de sapadores era comandado…») e `hist_janik.appearsAs` (quem transmitiu a ordem é desconhecido).

O que a revisão achou incompleto no português europeu foi feito, palavra inteira a palavra inteira (nem o texto polaco das notas «PL: …» nem os títulos de fontes citados foram tocados; `sources` do `mission.json` é igual byte a byte):

| achado | feito |
|---|---|
| «bombardeio» (19 usos nos três ficheiros) | «bombardeamento» (`mission.json` 6, `SCRIPT.md` 10, `HISTORICAL_RESEARCH.md` 3) |
| `dlg_m01_145` «Até a ordem» | «Até à ordem» (e as duas cópias em `docs/direction/M01_REACTIVE_DIALOGUE.md`) |
| `events[8].results` (`evt_m01_wounded_dragged`) «até a estação» | «até à estação» (e `SCRIPT.md`); mais «até o socorrista» (o texto do objectivo opcional), «até o pilar 6», «até o Dudek» (`dlg_m01_043`) → «até ao», e em `SCRIPT.md` «até as 20:00», «até a ponte», «até o portal» ×2, «até o mínimo», «até o fim», «até a prontidão» |
| `dlg_m01_014` «Todo mundo no chão!» | «Toda a gente no chão!» (e `SCRIPT.md`) |
| `events[22].tolerance.onTimeout` «e o puxa» | «e puxa-o» (e `SCRIPT.md`) |
| `SCRIPT.md` «Por que Nowicki fica…», «ao chegar em Nowicki» | «Porque é que Nowicki fica…», «ao chegar a Nowicki» |
| `SCRIPT.md` atribuía a fala 030 «Cubro-o!» a BĄK | KOWAL («quando Jan recarrega e o rkm disparou nos últimos 6 s», como diz o `mission.json` desde 2026-10-19) |

**Não mudei, com razão:** `checkpoints[3].neverSaveIf` «até a janela terminar» (aqui «a janela» é o sujeito do infinitivo, não há contracção: é igual em Portugal); «Nenhuma hora histórica se move» (`grp_sappers.operation.note`: a palavra negativa pede a próclise, está certo) — a revisão citou «se move» em `retreat.note`, que não o tem (tem «sem se afastarem» e «ajoelha-se»); as cadeias «Você…» do **código** (`src/game/m01-difficulty.js` `deathText`, `src/game/m01-simulation.js` `boundaries`, `src/game/m01-area-sim.js`: fixadas por `m01-difficulty-death*.test.js`; o `failure.message` de `obj_m01_leave_bridge` no `mission.json`, que nenhum código lê, já está em português europeu e difere da cadeia gémea); `Pawlak` como `RADIO_OPERATOR` nos elencos do Ato VII (`areas/np/act.json`, `act-vii-b.json`, `act-vii-c.json`: entradas dos goldens do Ato VII, fora desta emenda); o registo misto («Cubro-o!» e «Mude de posição» de Kowal ao jogador pelo imperativo formal, «carregas-me?» entre camaradas); a grafia que o Acordo deixa valer das duas maneiras. Programaticamente (`mission.json`, base `101b572a` → ponta): **81 valores de texto mudados** (os 70 da primeira versão e os desta passagem), a única mudança estrutural são as chaves novas `search.hold` e `support` de `grp_de_spans.deckAssault.tactics`, o único texto polaco mudado é o de `dlg_m01_118`.

O guarda dos textos (`tests/m01-act1-texts.test.js`, 6 testes) fixa os achados e proíbe as palavras brasileiras nos três ficheiros; `tests/m01-hud-presentation.test.js` e `tests/m01-continuous-fixes.test.js` citavam «até o socorrista» e seguem o texto novo.

### 1.4 A busca de quem segura uma linha (da primeira versão, mantida)

`tactics.search.hold` e `deckSearch` (`src/game/m01-simulation.js`): um homem do assalto em `hold` numa linha que **não é a mais funda**, com um polaco visto há `afterSec`…`memorySec` (3…12 s) e nenhum à vista agora, segue o lanço da busca para a linha seguinte (a primeira estação a no máximo `rushStations` de onde está, nunca para lá dessa linha, de onde um homem de pé veria o sítio — a vista do mundo, não a do pó); o prazo do esquadrão cresce `closeExtraSec`; espera `casualtyHoldSec` depois da última baixa. A linha mais funda continua a ser o fim de **todo** o movimento do assalto (`safeX`, o número do proprietário). Sem sorteio e sem chave guardada nova. A revisão provou-o correcto e disse que era código morto: **agora actua** (a única busca da rota de apoio do golden é a dele, §2.2).

### 1.5 O tiro de apoio (B, novo)

`deckAssault.tactics.support` (`missions/m01-tczew/mission.json`, validado em `src/game/m01-deck-assault.js`: opcional; apagar a chave repõe o jogo de antes) e `updateDeckSupport` (`src/game/m01-simulation.js`, chamado em `updateActors` a seguir a `formRearguard`):

- **Quando.** `delaySec` (4 s) depois de o último homem vivo da retaguarda polaca (`pl_east_0..2`) ter tomado o seu posto (`rear.since`), e não depois de `windowSec` (12 s) a seguir a esse instante (um save carregado mais tarde não ganha um tiro que não teve). Só enquanto o portão da demolição leste segura o relógio (`rearguardHolds`), enquanto algum homem do assalto ainda vem (`advance`/`cover`/`hold`) e se o jogador está a 30 m (`SAFE_IMPACT_M`) ou mais do ponto. **Uma vez** por jogo.
- **Onde.** `aheadM` (24 m) a leste do posto da frente da retaguarda (x 175 → 199), no eixo do tabuleiro (z 38,7). `aheadM` tem de ficar fora do anel de 20 m em que um obus abala um homem (`SHELL_BLAST.shakenM` de `m01-shell-blast.js`; o validador exige ≥ 22): o tiro não toca em ninguém.
- **O quê.** `impact()` de um rebentamento no chão (`blastKind` = `shell`): cratera `de_support_shell_1`, o evento `m01-blast` (o som e o clarão que o jogo já sabe apresentar), uma nuvem de pó `shell` (8 m × 7 m, 30 s: `src/game/m01-dust.js`, a espécie que já existia e ninguém usava no Ato I), e o fumo da cratera visível 30 s (`renderState.smokeVisible`; as crateras de bomba fumam 240 s e uma coluna dessas no eixo do tabuleiro tapava a vista do jogador durante 4 minutos). **Não fere, não abala e não suprime ninguém** (os polacos mais próximos ficam a 24, 29 e 34 m; testado: o tiro não muda um byte dos actores).
- **Porquê funciona.** A nuvem tapa, durante uns 27 s (a densidade × 16 m de corda passa de 3 enquanto a densidade ≥ 0,19), a retaguarda, a secção e o jogador aos alemães que estão a leste dela (`sim.sees`), e os alemães a eles. Um homem do assalto que, num disparo seu, em cobertura ou em retenção, já não vê nenhum polaco procura (`deckSearch`: R2-b em cobertura, §1.2 em retenção).
- **Estado.** Nenhuma chave guardada nova: o registo da cratera é a memória («já caiu»), o instante é função dos registos da própria retaguarda; `validateM01Snapshot` recusa o registo duas vezes e antes de o assalto começar. Saves antigos carregam; um save feito antes do tiro recebe-o no mesmo instante, um feito depois da janela nunca.
- **Sorteios.** Nenhum (nem do fluxo principal nem do fluxo do homem; provado em teste). A «variação» é a da luta.
- **Fonte.** `GAMEPLAY_DRAMATIZATION`: as fontes só dizem que a força tinha duas baterias leves e o comboio blindado (`HISTORICAL_RESEARCH.md` §5, e uma nota nova na «regra de representação»); nenhuma dá fogo de apoio sobre o tabuleiro a esta hora, nem calibre, nem tipo. Sem nova fala: o jogador ouve e vê o tiro.

### 1.6 O que não se fez

O MG34 e os atiradores dos portões e do dique **não se mexem** (§2.3). Não se tocou em `map-layout.json` (cobertura no tabuleiro, opção c da revisão): é a opção mais cara (colisão, navegação, render, `bz_east` e todos os goldens do Ato I) e o tiro dá a causa sem ela.

## 2. A busca nas rotas: números

Ferramenta: `node tools/verification/m01-pkg2-metrics.mjs --label v3 --jsonl <f>` (só lê; determinista; ganhou `fire.supportRoundAt` e `fire.searchBy` nesta emenda). 24 rotas do piloto de teste (12 sementes × controlo e apoio), código final. «Perguntas da busca» = quantas vezes um homem do assalto não tinha nenhum polaco à vista no seu disparo e chamou `deckSearch`; «na linha mais funda» = quantas dessas foram na linha mais funda do próprio homem (onde já não há estação); «buscas» = eventos `deck-tactic` `search`, e «quem» o número de cada homem (`de_spans_N`) que buscou.

### 2.1 As 24 rotas

Antes da emenda: **0 buscas** nas 24 (7 perguntas da busca, todas na linha mais funda: o README anterior, §2.1, e o do pacote 2, §5.4). Agora:

**Rotas de controlo** (12)

| rota | tiro de apoio (s reais) | buscas | quem (n.º do homem) | perguntas da busca (nenhum polaco à vista) | na linha mais funda | granadas | mais perto de um polaco (m) | sobreviventes | saúde final | fim da rota (s reais) |
|---|---|---|---|---|---|---|---|---|---|---|
| 19390901:0 | 723,8 | 5 | 68547 | 25 | 0 | 0 | 47,1 | 12 | 92 | 1278 |
| 1:0 | 720,6 | 2 | 45 | 26 | 3 | 1 | 23 | 12 | 52 | 1290,5 |
| 2:0 | 725 | 3 | 868 | 24 | 0 | 0 | 70,9 | 12 | 76 | 1272,4 |
| 3:0 | 733,8 | 3 | 757 | 24 | 0 | 0 | 25,9 | 12 | 52 | 1301,2 |
| 4:0 | 727,8 | 1 | 5 | 24 | 0 | 1 | 23 | 12 | 52 | 1294 |
| 5:0 | 748,7 | 1 | 7 | 32 | 5 | 1 | 23 | 12 | 68 | 1327,9 |
| 6:0 | 731,8 | 0 | — | 21 | 0 | 0 | 118,9 | 12 | 44 | 1313,6 |
| 7:0 | 740 | 2 | 88 | 25 | 2 | 1 | 23 | 12 | 60 | 1311,4 |
| 8:0 | 719,5 | 3 | 878 | 23 | 1 | 1 | 23 | 12 | 68 | 1278,3 |
| 9:0 | 727,1 | 3 | 774 | 24 | 0 | 0 | 118,9 | 12 | 84 | 1275,2 |
| 10:0 | 735 | 2 | 77 | 21 | 1 | 1 | 23 | 12 | 92 | 1318,1 |
| 11:0 | 730,3 | 1 | 8 | 24 | 0 | 0 | 53,8 | 12 | 52 | 1291,2 |

Totais: 12 rotas, 12 com tiro de apoio, 26 buscas em 11 rotas, 6 granadas (rotas com granada 6), 293 perguntas da busca, 12 na linha mais funda.
Completas: 12/12; sobreviventes [12]; saúde final mínima 44.

**Rotas de apoio** (12)

| rota | tiro de apoio (s reais) | buscas | quem (n.º do homem) | perguntas da busca (nenhum polaco à vista) | na linha mais funda | granadas | mais perto de um polaco (m) | sobreviventes | saúde final | fim da rota (s reais) |
|---|---|---|---|---|---|---|---|---|---|---|
| 19390901:1 | 697,9 | 1 | 5 | 12 | 0 | 0 | 116,9 | 18 | 76 | 1127,2 |
| 1:1 | 693,3 | 0 | — | 1 | 0 | 0 | 202,4 | 18 | 68 | 1146,2 |
| 2:1 | 693,3 | 0 | — | 12 | 0 | 0 | 152 | 18 | 92 | 1210,6 |
| 3:1 | 709,6 | 1 | 5 | 3 | 0 | 0 | 194,1 | 18 | 92 | 1133 |
| 4:1 | 700,8 | 1 | 8 | 16 | 0 | 0 | 202,4 | 18 | 92 | 1136,9 |
| 5:1 | 701,4 | 0 | — | 4 | 0 | 0 | 202,4 | 18 | 100 | 1064,5 |
| 6:1 | 697,9 | 2 | 57 | 6 | 0 | 0 | 194,1 | 18 | 92 | 1173,2 |
| 7:1 | 704,1 | 1 | 7 | 8 | 0 | 0 | 202,4 | 18 | 92 | 1062 |
| 8:1 | 697,9 | 0 | — | 13 | 0 | 0 | 202,4 | 18 | 84 | 1153,7 |
| 9:1 | 693,3 | 1 | 5 | 3 | 0 | 0 | 202,4 | 18 | 84 | 1073,8 |
| 10:1 | 704,9 | 0 | — | 4 | 0 | 0 | 202,4 | 18 | 92 | 1122,1 |
| 11:1 | 695,6 | 0 | — | 7 | 0 | 0 | 202,4 | 18 | 100 | 1149,8 |

Totais: 12 rotas, 12 com tiro de apoio, 7 buscas em 6 rotas, 0 granadas (rotas com granada 0), 89 perguntas da busca, 0 na linha mais funda.
Completas: 12/12; sobreviventes [18]; saúde final mínima 68.

### 2.2 As rotas do golden e as de guarda (a conta da ferramenta de golden, `measured.searches` e `measured.supportRounds`, predecessor → vivo)

| rota | buscas (predecessor → vivo) | tiros de apoio | fim da rota (s reais, predecessor → vivo) | sobreviventes | saúde final (predecessor → vivo) |
|---|---|---|---|---|---|
| 19390901 controlo (golden) | 0 → **5** | 0 → 1 | 1308,5 → 1278 | 12 | 100 → 92 |
| 7 apoio (golden) | 0 → **1** | 0 → 1 | 1116,3 → 1062,05 | 18 | 100 → 92 |
| semente 3 controlo (guarda) | 0 → **3** | 0 → 1 | 1318,75 → 1301,25 | 12 | — |
| semente 3 apoio (guarda) | 0 → **1** | 0 → 1 | 1112,9 → 1133 | 18 | — |
| semente 7 controlo (guarda) | 0 → **2** | 0 → 1 | 1334,65 → 1311,45 | 12 | — |
| semente 7 apoio (guarda; é a mesma rota que a do golden de apoio) | 0 → **1** | 0 → 1 | 1116,3 → 1062,05 | 18 | — |

### 2.3 Porque o MG34 e os atiradores do portão e do dique não se mexem

A ordem falava do «MG34 / atiradores». O que se mediu (sonda de leitura que conta, por homem, os disparos de `aiTarget` sem alvo; rota de controlo do golden, código final): o **dique** ficou sem alvo em 1416 de 2274 disparos (1416 de 1726 na janela da retirada, 06:00–06:10), o **portão** em 908 de 1182 (908 de 967) e o **MG34** em 105 de 186 (105 de 123); na rota de apoio do golden 732 de 1406, 361 de 619 e 0 de 1. Perder o alvo de vista é, para esses homens, o estado normal da retirada (os polacos passam atrás das treliças e a 500 m), e eles ficam a 800–1000 m do jogador, em posições de tiro autoradas (`fp_m01_*`, `mg34Prone`, os testes de arco de fogo). «Procurar mexendo-se» seria um movimento por disparo em dezenas de homens que ninguém vê, não «um número pequeno» nem uma procura plausível; o MG34 já «procura» disparando para o último sítio visto (60 s). Por isso a busca com movimento é a dos **atiradores do assalto do tabuleiro** (os seis `kar98k` de `grp_de_spans`, os únicos alemães que se movem no Ato I), que são os que o jogador vê perder o alvo e avançar.

### 2.4 O que o tiro faz à luta (a conta, rota do golden)

- **Rota de controlo do golden** (19390901): a primeira diferença de comportamento é a cratera do tiro, tick 14477 (723,85 s reais, relógio de batalha 06:09:30, o portão segura-o), `$.state.sectors.damage.20`; o fim da rota passa de 1308,5 a 1278 s reais (26170 → 25560 ticks); as 06:00 chegam ao mesmo instante (562,95 s); os eventos que mudam de hora real são 6, todos depois do tiro; as rondas alemãs por minuto real 90,24 → 89,06.
- **Rota de apoio do golden** (7): a primeira diferença de comportamento é a cratera do tiro, tick 14082 (704,1 s reais, relógio de batalha 06:09:30, o portão segura-o), `$.state.sectors.damage.20`; o fim da rota passa de 1116,3 a 1062,05 s reais (22326 → 21241 ticks); as 06:00 chegam ao mesmo instante (543,2 s); os eventos que mudam de hora real são 6, todos depois do tiro; as rondas alemãs por minuto real 59,39 → 60,05.

## 3. Golden: emenda 22 (`texts+support-search`), agora de comportamento

Gerada pela ferramenta oficial (`node tools/verification/m01-integration-golden-audit.mjs --amendment 22 --write`, x86; 06:17 → 07:13 UTC, 56 min com a máquina partilhada: `written`, saída 0), predecessor **exacto** `101b572af0c1f8489942b8ce3eadee5016ac02c4` (a linha de integração: a sua simulação, `2b6be194…`, é a que o golden da emenda 21 fixa). A ferramenta ganhou, só para a 22: `behaviourFields` / `behaviourActors` em vez de `noBehaviourDifference`, a lista do que retira dos dois quadros (`stripped`, agora também com o texto do objectivo opcional), as buscas e os tiros de apoio contados por rota (`measured.searches`, `measured.supportRounds`; também nas quatro de guarda) e a aceitação de uma primeira diferença de comportamento que é uma cratera (um registo de `sectors.damage` não tem actor). Ficheiros: `tests/fixtures/m01-act1-texts-gameplay-baseline.json` (o golden), `docs/verification/m01-runtime/act1-amend22-2026-11-05/GOLDEN_AMENDMENT_22.json` (a conta), `tests/m01-animation-contract.test.js`.

- **Primeira diferença** (as duas rotas do T47: 19390901 controlo e 7 com apoio): tick 1 (04:30:44), `actors.6.role`, Pawlak (`RADIO_OPERATOR` → `MESSENGER`); `identicalBlocks` 0. O estado do diálogo muda desde o início porque a duração de uma legenda é `max(2,5; min(6; caracteres / 24))` s e o guia espera pela voz.
- **Primeira diferença de comportamento**, com o papel de Pawlak reposto, o texto do objectivo opcional reposto («até ao socorrista» → «até o socorrista», que aparece em `mission.text` às 06:04) e o estado do diálogo retirado dos dois lados (a lista da emenda 10): **a cratera do tiro de apoio**, `$.state.sectors.damage.20` (ausente no predecessor): rota de controlo tick **14477**, **723,85 s** reais, relógio de batalha 06:09:30 (o portão segura-o); rota de apoio tick **14082**, **704,1 s**. Até lá as duas simulações são iguais, byte a byte, tick a tick, depois dessa lista.
- **O enredo**: os 12 objectivos, CP-A..D, 07:05:00, os eventos consumidos, as bandeiras do enredo e os sobreviventes (12 / 18) são os do predecessor nas duas rotas e nas quatro de guarda (sementes 3 e 7, com e sem apoio): asserções da ferramenta. As 06:00 chegam ao mesmo instante (562,95 e 543,2 s); **o resto muda de hora real** porque a luta é outra: `movedEvents` = a demolição leste (984,6 → 955,4 s e 793,5 → 744,6 s), `dudek_retrieves_bak`, a demolição oeste, o `roll_call`, o `kozliny_attack_distant` e o `debrief` (6 em cada rota, todos depois do tiro; as horas do relógio de batalha são as mesmas); fim da rota 1308,5 → **1278** s e 1116,3 → **1062,05** s; saúde final do piloto 100 → 92 nas duas; rondas alemãs por minuto real 90,24 → 89,06 e 59,39 → 60,05; **0 atravessamentos e 0 empilhados** nas duas rotas e nas quatro de guarda.
- **Buscas e tiros por rota** (`measured`, predecessor → vivo): §2.2.
- **Entradas que se mexeram** desde o predecessor: `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json` e `src/game/m01-deck-assault.js`; as outras 25 entradas gravadas (incluindo o pó, o socorro, o realizador, a secção, a retaguarda, o piloto `tests/helpers/m01-route.js`, `map-layout.json`) não.
- **Emenda 21 como história**: `node tools/verification/m01-integration-golden-audit.mjs --amendment 21` → **`check: identical`** (05:57 → 06:49 UTC; o golden e a conta da 21 não mudaram um byte).
- **Emenda 22**: `node tools/verification/m01-integration-golden-audit.mjs --amendment 22` (sem `--write`) → **pendente** (a corrida demora ≈ 1 h; o veredicto entra no commit seguinte)
- **Goldens da área**: `node tools/verification/m01-act-vii-a-golden.mjs`, `-b-` e `-c-` → **`check: identical`** os três (as entradas que fixam são todas do Ato VII; nenhuma mudou; não escrevi nada).
- **`tests/m01-animation-contract.test.js`** (explicado): (a) o teste da emenda 22 passa a ser de comportamento, com os números da conta fixados (§4); (b) os testes dos goldens da 21 e anteriores não precisaram de mudar (`MOVED_BY_22` e `MOVED_BY_21` já cobriam os três ficheiros). Nenhuma asserção foi removida.

## 4. Testes e verificação

Tudo sobre as fontes do ramo `act1-amend22-fix` no commit final dos ficheiros de jogo e de dados (`da52345e`; depois dele só testes, a nota da pesquisa, ferramentas de leitura, o golden regenerado e este documento). A máquina era de 4 CPUs, partilhada com as corridas do golden (carga 5–7). **Não corri `npm test` completo** (outra etapa). Não existem ficheiros `tests/m01-reactive*` nem `tests/m01-mission-data*`: o realizador de falas é `m01-barks` e os dados da missão `m01-tczew-data`.

| comando | resultado real |
|---|---|
| `node --test --test-concurrency=1 tests/m01-german-ai.test.js tests/m01-german-ai-tactics.test.js tests/m01-german-ai-saves.test.js tests/m01-deck-assault.test.js tests/m01-dust.test.js tests/m01-dust-ai.test.js tests/m01-aid.test.js tests/m01-acts.test.js tests/m01-pkg2-saves.test.js tests/m01-pkg2-safex-saves.test.js tests/m01-barks.test.js tests/m01-tczew-data.test.js tests/m01-hud-presentation.test.js tests/m01-continuous-fixes.test.js` (a IA alemã, o assalto, o pó, o socorro, os saves do pacote 2, as falas, os dados da missão e os dois testes que citavam um texto mudado) | `# tests 301  # pass 301  # fail 0` (1452 s) |
| `node --test --test-concurrency=2` sobre 32 ficheiros que correm a rota do golden e dependem do fim da luta: `m01-act1-texts`, `m01-act1-search-route`, `m01-pkg2-routes`, `m01-rearguard`, `m01-escort-coordination`, `m01-difficulty-death`, `m01-difficulty-wiring`, `m01-fair-death`, `m01-pacing-combat-clock`, `m01-pacing`, `m01-german-retreat`, `m01-schema2-determinism`, `m01-section`, `m01-cover-combat`, `m01-cover-threat`, `m01-cover-origin`, `m01-east-front`, `m01-sappers-operation`, `m01-station-evacuation`, `m01-consolidation-lifecycle`, `m01-damage-decals`, `m01-combat-feedback`, `m01-demolition-cue`, `m01-audio-director`, `m01-display-fire`, `m01-ckm-live-fire`, `m01-npc-navigation`, `m01-retreat-slots`, `m01-runtime`, `m01-opening`, `m01-bomb-effects`, `m01-combat-posture-staging` | `# tests 420  # pass 419  # fail 1` (3426 s). A falha era de `m01-german-retreat` («a German carried by a man without a plan»): fixava `de_spans_5` como transportador, e na luta nova esse homem cai no tabuleiro (transportam `de_spans_7` e `de_spans_4`); re-fixado, com comentário datado, e `node --test tests/m01-german-retreat.test.js` → `# tests 22  # pass 22  # fail 0` |
| `node --test --test-concurrency=1 tests/m01-animation-contract.test.js` | `# tests 40  # pass 40  # fail 0` (323 s; inclui, por rota, o digest de todos os bytes de jogo a cada tick contra o golden novo) |
| `node tools/verification/m01-act-vii-a-golden.mjs`, `-b-`, `-c-` | `check: identical` ×3 |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 21` | `check: identical` (05:57 → 06:49 UTC) |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 22 --write` | `written` (06:17 → 07:13 UTC) |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 22` | **pendente** (a corrida demora ≈ 1 h; o veredicto entra no commit seguinte) |
| `npx playwright test --config <cópia temporária, porta 4291> tests/browser/m01-hud-presentation.spec.js -g "reactive dialogue"` (`CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, `CI=1`, build de produção) | `1 passed (1.7m)`; a cópia da configuração, o `dist/` e o `test-results/` foram apagados |
| `npm run build` | build de produção sem erros (só o aviso habitual de chunk > 600 kB; 1,3 s) |

Testes novos ou alterados: `tests/m01-act1-search-route.test.js` (reescrito, 8 testes, 3 corridas de rota: as duas do golden e o controlo sem o tiro), `tests/m01-act1-texts.test.js` (6, estendido), `tests/m01-german-ai.test.js` (+ os validadores de `support`), `tests/m01-pkg2-routes.test.js` (3 testes: a granada de mão e a sua nuvem passam da rota do golden, que já não vem a um arremesso, para a de controlo da semente 1; as asserções são as mesmas), `tests/m01-german-retreat.test.js` (a re-fixação acima), `tests/m01-animation-contract.test.js` (§3), `tests/m01-hud-presentation.test.js` e `tests/m01-continuous-fixes.test.js` (o texto «até ao socorrista»). Nenhuma asserção removida ou enfraquecida; os pinos mudados têm comentário datado. **Não corridos**: `npm test` completo e os restantes specs de navegador (outra etapa).

## 5. Riscos, limites e decisões que ficam ao Capitão

1. **Um tiro novo na luta, sem fonte.** É `GAMEPLAY_DRAMATIZATION` (§1.5) e muda a luta de todas as rotas: o fim da rota de controlo do golden passa de 1308,5 a 1278 s reais, a granada de mão deixa de cair na rota do golden (cai noutras seis rotas de controlo: sementes 1, 4, 5, 7, 8 e 10; `tests/m01-pkg2-routes.test.js` verifica-a agora na semente 1), e a luta é outra a partir do tiro. Se o Capitão não quiser o tiro: apagar `deckAssault.tactics.support` repõe o jogo da primeira versão (a busca volta a 0) sem outra alteração, mas o golden tem de ser regenerado.
2. **O instante do tiro foi escolhido por uma varredura, e a luta é sensível a ele.** O piloto de teste (`tests/helpers/m01-route.js`, entrada fixada de todos os goldens, não tocado) desiste de esperar pela demolição leste 500 s reais depois de chegar ao posto do tabuleiro (≈ 1000 s). A luta mais longa que as regras permitem acaba às ≈ 1010 s (prazo do esquadrão 865 s mais 144 s de recuo da linha mais funda), por isso uma luta que gasta o prazo todo passa a paciência do piloto: `Route stalled` com o portão quase aberto (a luta é válida, o piloto é que não espera). Com `delaySec` 4 as 24 rotas completam; com 5 s as rotas de controlo das sementes 5 e 6 não completam, com 6 s a semente 1, com 7 s a rota do golden (a rota de controlo do golden com 2 s ou 3 s é repelida a 208 m; com 5 e 8 s lança a granada). A nuvem atrasa a pressão que abre as linhas de aproximação (sem polacos à vista não há quem os fixe a tiro) e isso desloca o fim da luta de umas dezenas de segundos; nenhum valor é «o certo». O Capitão pode querer outro piloto com mais paciência (deixa de ser entrada fixada de todos os goldens) ou outro tiro.
3. **Os polacos também ficam cegos 27 s.** A nuvem é simétrica (`sees`): a retaguarda, a secção, o rkm de Kowal e a ckm não vêem os alemães do outro lado dela durante o tiro, e o jogador humano vê a nuvem à sua frente; as balas do jogador atravessam-na (o pó não é colisor). Medido: as 24 rotas completam, sem morte do jogador e com os mesmos sobreviventes (saúde final mínima do piloto de controlo 44 (apoio 68)).
4. **Sem playtest e sem captura.** O som (o jogo escala qualquer rebentamento de id desconhecido como `large`, de bomba), o clarão, a cratera (o renderer põe-lhe uma marca do tamanho de uma granada: `m01BlastKind` devolve `grenade` para o que não conhece), o fumo de 30 s e a nuvem não foram vistos nem ouvidos por ninguém; o renderer não foi tocado. O renderer desenha as últimas 24 crateras (`M01_DAMAGE_DECAL_LIMITS.blasts`): as 20 anteriores à luta, o tiro, uma granada e as duas demolições são 24; uma segunda granada faria a cratera mais antiga perder a marca (só visual).
5. **MG34, portão e dique**: sem movimento, por razões medidas (§2.3). **Cobertura no tabuleiro** (opção c): não feita.
6. **Português europeu**: as cadeias «Você…» do código, o registo misto e o Ato VII ficam como estavam (§1.3). O polaco da fala 118 continua por rever por falante nativo.
7. **Browser**: só se correu `tests/browser/m01-hud-presentation.spec.js -g "reactive dialogue"` (1 passou, 1,7 min); o resto dos specs não foi corrido (outra etapa corre `npm test` e CI).
8. **O R0 (`docs/direction/M01_R0_REQUIREMENTS_MATRIX.md`, AI-3), o ledger e o `DEVELOPMENT_STATUS.md`** continuam a dizer «a busca com movimento tem uma causa (a nuvem)… a busca é rara»: são do Capitão e não os toquei. Texto sugerido para AI-3: «o assalto procura (cobertura e retenção) quando um tiro de apoio alemão lhe tapa os polacos; MG34 e portão sem movimento».

## 6. Resposta aos achados da revisão independente (por número)

| # | achado | resposta |
|---|---|---|
| 1, 15 | (B) não cumprido: 0 buscas nas rotas do golden, de guarda e nas 24 | **Corrigido**: §1.5 (o tiro de apoio, opção b da revisão); golden de controlo 5 buscas, de apoio 1; 24 rotas 33 buscas em 17 rotas (controlo 26 em 11 de 12; apoio 7 em 6 de 12) (§2) |
| 2 | `measured.searches` = 0 → 0 | agora `{predecessor:0, live:5}` e `{predecessor:0, live:1}` nas duas rotas do golden (`GOLDEN_AMENDMENT_22.json`), mais `supportRounds` `{0, 1}`; as de guarda em §2.2 |
| 3 | a busca de quem segura a linha nunca actua | actua: a única busca da rota de apoio do golden é a dele (`de_spans_7`, retenção na linha 0 → linha 1); `tests/m01-act1-search-route.test.js` fixa-o |
| 4 | os testes fixam o zero | `tests/m01-act1-search-route.test.js` reescrito (5 e 1, por quem, de cobertura / de retenção, o enredo sem o tiro, sem sorteios) e `tests/m01-animation-contract.test.js` fixa `{predecessor:0, live:N}` e `supportRounds {0, 1}` |
| 5, 16 | MG34 e atiradores do portão / dique sem busca com movimento | **Decisão documentada com números** (§2.3): perdem o alvo de vista na maior parte dos disparos da retirada; mexê-los seria um movimento por disparo em homens a 1 km; a busca com movimento é a do assalto do tabuleiro (os seis `kar98k`, os únicos alemães que se movem no Ato I). A opção d da revisão (deslocar os do dique ao longo de `fp_m01_riflemen_dike`) não foi feita |
| 6 | o mais pequeno: dar ao assalto uma causa antes da linha mais funda (b ou c) ou mexer os do dique (d); regenerar como emenda de comportamento com `behaviourFields` / `behaviourActors` e as contagens não nulas na evidência | feito com (b): a emenda 22 é de comportamento (§3), `behaviourFields` `^\$\.(state\|checkpoint)\.sectors\.damage\.\d+$` e `behaviourActors` `^(de_spans_[4-9])$` na conta, contagens em §2 |
| 7–10, 17, 18 | Parte A correcta; diff programático; mecânica do golden; âmbito limpo | sem acção; o diff programático foi refeito (§1.3: 81 valores, 2 chaves estruturais novas, 1 texto polaco, `sources` igual); âmbito: os ficheiros pinados tocados são os mesmos três (`mission.json`, `m01-simulation.js`, `m01-deck-assault.js`) |
| 11 | português europeu incompleto | feito (§1.3); duas das citações da revisão estão certas em português europeu e ficaram (§1.3) |
| 12, 19 | limitações conhecidas: «Você» no código, fala 030 em `SCRIPT.md`, Ato VII, registo | a fala 030 em `SCRIPT.md` foi corrigida; o resto fica como estava, com a razão em §1.3 |
| 13 | o teste da rota não podia falhar e custava 84 s | substituído; custa ≈ 77 s (3 corridas de rota inteiras: golden de controlo, golden de apoio e o controlo sem o tiro, que prova o enredo) |
| 14 | determinismo e regressões | confirmado e agora testado: nem o tiro nem a busca sorteiam do fluxo do jogo nem do do homem; o tiro não muda um byte dos actores |
| 20 | nota de processo (checkout, worktree) | não aplicável a este ramo |

## 7. Ficheiros

Dados e texto: `missions/m01-tczew/mission.json` (81 valores de texto; `grp_de_spans.deckAssault.tactics.search.hold` e `.support`; a nota do assalto), `missions/m01-tczew/SCRIPT.md`, `missions/m01-tczew/HISTORICAL_RESEARCH.md` (mais a nota do tiro de apoio), `docs/direction/M01_REACTIVE_DIALOGUE.md` e `docs/direction/COD_WAW_WWII_BENCHMARK.md` (as cópias dos textos mudados). Código: `src/game/m01-simulation.js` (`deckSearch`, `updateDeckSupport`, `impact`, `renderState`, o validador do save), `src/game/m01-deck-assault.js` (o validador de `hold` e `support`, `DECK_SUPPORT_ID`). Ferramentas: `tools/verification/m01-integration-golden-audit.mjs` (emenda 22 de comportamento; as buscas e os tiros contados; a 21 história), `tools/verification/m01-pkg2-metrics.mjs` (`fire.lostSight`, `fire.supportRoundAt`, `fire.searchBy`). Golden e prova: `tests/fixtures/m01-act1-texts-gameplay-baseline.json`, `docs/verification/m01-runtime/act1-amend22-2026-11-05/GOLDEN_AMENDMENT_22.json`. Testes: os de §4. Não tocados: o Ato VII, o renderer, o áudio, o piloto de teste, `map-layout.json`, `acts.json`, `m01-difficulty.js` (a tabela D35), o `DEVELOPMENT_STATUS.md`, o ledger e o handoff.
