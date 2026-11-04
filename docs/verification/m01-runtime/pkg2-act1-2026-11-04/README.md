# Pacote 2 do Ato I: pó que tapa a vista da IA, socorro de feridos, granadas e busca alemãs — 2026-11-04 (emenda 21)

Ramo local `pkg2-act1` (de `57ba50f3`, a ponta do pacote 1). **Não publicado, não integrado na #80, sem revisão crítica independente, sem playtest humano.** Ordem do Capitão (handoff 2026-10-25, «Próximos pacotes», 2): «pó que tapa a vista da IA; falas e socorro de feridos; granadas/busca alemãs a aparecer nas rotas (hoje latentes)». Só o Ato I (`M01Simulation`, a batalha da ponte 04:30–07:05); nada do Ato VII-a, do gestor de atos, dos ficheiros `m01-area-*` nem dos do viewmodel foi tocado.

Commits do ramo, por ordem: `d35e047b` e `7344da1e` (o trabalho, guardados como WIP quando o agente parou no limite de uso, ainda sem verificação; foi verificada depois, abaixo), `864fb801` (repõe `DEVELOPMENT_STATUS.md`, o ledger e o handoff, que são do Capitão), `69c0c44a` (três pinos de teste re-fixados) e o commit deste README. Nada empurrado, nada integrado, o ledger e o estado do projecto por actualizar.

Resumo em quatro linhas. **(1)** Cada explosão (bomba, granada, demolição) deixa na cratera de `sectors.damage` uma nuvem de pó/fumo (`dust {r, h, d, life}`: raio, altura, densidade, vida), guardada no save; `M01Simulation.sees()` é agora a pergunta que toda a aquisição da IA faz e uma linha que atravessa 3 m de nuvem densa não vê, para os dois lados; o renderer desenha as mesmas nuvens (`renderState.dust`). **(2)** Os feridos da guarnição oeste (bombas das 04:34–04:43) chamam (falas 220–222) e Dudek, livre do ferido da estação e até às 05:30, vai ao mais próximo, ajoelha-se, trata-o 6–10 s, leva-o ao ombro para a cobertura mais próxima e volta ao posto (falas 223–226); espera a bomba que vem, abriga-se quando abalado. **(3)** As granadas de mão alemãs passam de 0 a 1 por rota em 6 de 12 rotas de controlo (e em 0 de 12 de apoio, por desenho: o jogador que cobre o tabuleiro mantém o assalto a mais de 140 m), graças a dois números e a duas regras (abaixo); a busca com movimento ganha uma causa (a nuvem) mas continua em 0 nas 24 rotas. **(4)** Golden **emenda 21** regenerado pela ferramenta oficial; o enredo, os checkpoints e os sobreviventes (12 / 18) são os do predecessor; saves antigos carregam.

## 1. O que mudou

Código: `src/game/m01-dust.js` (novo), `src/game/m01-aid.js` (novo), `src/game/m01-simulation.js` (`sees`, o registo da nuvem em `impact`, `updateAid`, o alvo da granada, o lançamento do homem imobilizado, a sonda da busca, validadores), `src/game/m01-section.js` (as cinco perguntas de vista passam por `sim.sees`), `src/game/m01-barks.js` (gatilho `aid`), `src/game/m01-animation-presentation.js` (o validador do `carry` aceita um ferido da guarnição), `src/render/m01-atmosphere.js` (desenha `state.dust`). Dados: `missions/m01-tczew/mission.json` (falas 220–226; `safeX` 250 → 190; `closeExtraSec` 60 → 100; notas). Ferramentas: `tools/verification/m01-integration-golden-audit.mjs` (emenda 21; a 20 passa a história), `tools/verification/m01-pkg2-metrics.mjs` (as contagens deste documento).

### 1.1 Pó e fumo que tapam a vista (`src/game/m01-dust.js`)

- **Facto da simulação.** `impact()` acrescenta ao registo da cratera `dust: {r, h, d, life}` conforme o tipo (bomba 16 m × 12 m, 40 s; demolição 42 m × 32 m, 150 s; granada 4,5 m × 3,5 m, 20 s — os 20 s do fumo que o renderer já mostrava —; obus 8 m × 7 m, 30 s). A densidade é função pura da idade: sobe em 1,5 s, mantém-se e afina linearmente nos últimos 40 % da vida. Um save anterior não tem o campo: cada cratera recebe o valor do seu tipo (`dustKind` pelo id), por isso as crateras recentes de um save antigo têm a sua nuvem. Valores GAMEPLAY, não física.
- **Bloqueio.** A espessura que uma linha encontra é a soma, por nuvem, de densidade × comprimento da corda dentro do cilindro (disco em x/z, altura acima do terreno da cratera); `DUST.blockAt` = 3 (metros de nuvem a densidade 1) bloqueia. Sem sorteios, sem estado novo além do registo da cratera.
- **Quem pergunta.** `sees(a, b)` = vista do mundo **e** sem pó espesso na linha, chamado no momento (um teste pode trocar `world.lineOfSight`). Passam por ele: os MG34 e atiradores dos portões (`eastFire`, `aiTarget`, o fogo de busca do MG34 no último ponto visto), o assalto do tabuleiro (`deckTarget`, `deckGrenade`, `deckFire` na retirada), a retaguarda (`rearguardTarget`), Kowal (`kowalFire`, `squadCoverFire`), a ckm (`ckmClearShot`), a salva de ajuste de cobertura e as cinco perguntas de `m01-section.js` (chamadas e tiros reais da secção). **Não** passam por ele: o que o jogador vê, o teste de cobertura das explosões, `inView` e a regra dos 20 s do pelotão (o enredo não depende do pó).
- **Renderer.** `renderState.dust` lista as nuvens vivas `{id, x, y, z, r, h, density}`; `m01-atmosphere.js` desenha-as (algumas bolas de poeira baixas e largas a encher o disco, opacidade = densidade), dentro dos mesmos reservatórios de partículas. O renderer não decide visibilidade. As colunas de fumo antigas (240 s) ficam como estavam: são finas e já não bloqueiam depois da nuvem densa.

### 1.2 Socorro de feridos (`src/game/m01-aid.js`)

- **Quem é ferido.** Os homens da guarnição oeste (`pl_west_*`, `displayOnly`) que uma bomba deixa em `WOUNDED` (R1-a). Os tiros alemães continuam a não ferir aliados (baixas por ID, decisão antiga): por isso «feridos por fogo alemão» não existem no Ato I; o ferido da estação e Bąk são do guião e não entram.
- **Chamam.** Cada ferido ganha o registo `aid {n, at}` na primeira vez que é visto ferido e chama 3–7 s depois, depois de 14–22 s, no máximo 3 vezes, até ser tratado (`barkTrigger(sim, 'aid', {node: 'call'})`, falas 220–222, voz anónima, ouvida a ≤ 70 m).
- **Quem trata.** Dudek (médico, **não essencial**), só com `task == null` (nunca tira uma tarefa do guião: o ferido da estação das 04:35:30, Bąk), entre 04:36:30 e 05:30 do relógio de batalha (Bąk cai às 06:04: tem de estar no posto). Escolhe o ferido não tratado mais próximo a ≤ 260 m.
- **Sob cobertura.** Não parte e pára onde está enquanto houver uma bomba do calendário (`raidSchedule0434`, em segundos reais: o relógio de batalha corre a 3,5×) a ≤ 10 s de cair a ≤ 50 m dele ou do ferido; abalado (`suppressedUntil`) baixa-se e, em campo aberto, corre para o abrigo de caixa mais próximo a ≤ 12 m (lado de sotavento); só começa de um sítio livre (a < 1,1 m de outro corpo não parte: a auditoria de navegação conta dois homens a < 0,35 m).
- **Trata, leva, volta.** Ajoelha-se a 1 m, trata 6–10 s (pela ferida: 60 de saúde perdida = 10 s), devolve 30 de saúde (até 85); se o ferido não está já a < 4 m de uma cobertura, levanta-o ao ombro (o `carry` de Bąk: `carriedBy`, `pickup/carry/putdown`, 1,6 s cada) e leva-o a 1,5 m/s à cobertura mais próxima a ≤ 70 m (nunca as fiadas dos sapadores nem o posto da secção) ou ao posto de socorro, deita-o a sotavento e volta ao posto. **Um ferido tratado continua `WOUNDED`: não combate** (e a guarnição não tem arma: `displayOnly`).
- **Estado guardado** (opcional, validado, ausente em saves antigos): `actor.aid {n, at, t?, rest?}` e `timers.aid {patient, phase: go|treat|carry, since, left?, dest?}`; `task: 'aid'` só de Dudek e só com o registo.
- **Falas 220–226** (`mission.json`, `docs/direction/M01_REACTIVE_DIALOGUE.md` §7e): texto original de um agente de IA, **polaco por rever por falante nativo**.

### 1.3 Granadas e busca alemãs

Porque eram latentes (medido em `57ba50f3` e nas 24 rotas de R2-b): **(a)** distância: com `safeX` 250 a linha mais funda do homem da frente ficava a x 258, a **83 m** do posto polaco mais próximo (média dos mínimos 109 m no controlo, 253 m no apoio): a granada tem alcance 6–32 m; **(b)** o alvo: um defensor à vista só era alvo se estivesse ajoelhado **e** suprimido; **(c)** o disparo: um homem suprimido não chega ao seu gatilho (`updateCombat` empurra o `cooldown` para depois da supressão) e na linha mais funda a retaguarda (5 mil de dispersão a 23 m) imobiliza-o e mata-o em segundos; **(d)** a busca só corria quando o homem não via nenhum polaco, e num tabuleiro recto e aberto vê sempre pelo menos um (`deckFire` chamou `deckSearch` 0 vezes em 3198 gatilhos na rota de controlo).

O que mudou: **`safeX` 250 → 190** e **`closeExtraSec` 60 → 100** (dados; o homem da frente fica a x 198, a 23 m da retaguarda, e o prazo deixa-o chegar lá); o defensor **ajoelhado** é alvo da granada; um homem **imobilizado** em cobertura/linha, a ≤ 32 m de um polaco, lança a granada que ainda tem (0,4 s depois de tomar a linha; `deckGrenade` mantém todas as regras: uma por homem, uma por esquadrão a cada 15 s, só de cobertura, o jogador só em cobertura autorada, F1/F4 e a tabela D35 dos níveis); a sonda da busca usa a vista do mundo (o pó esconde o polaco, a sonda procura onde ele estava). A granada continua com o aviso de sempre (fuso de 3,8 s desde o arremesso, 1,4 s de voo, a granada fica 2,4 s no chão, fala 138, mensagem de HUD a ≤ 17 m do jogador), sem «devolver a granada». Com a nuvem da granada (20 s) a vista dos polacos atrás do rebentamento fica tapada: é a única causa de busca no tabuleiro.

## 2. Contagens por rota (24 rotas do piloto de teste: 12 sementes × controlo e apoio)

Ferramenta: `node tools/verification/m01-pkg2-metrics.mjs --label F1 --jsonl <f>` (só lê; determinista). «raios» = perguntas de vista da IA (com a linha livre para o mundo) feitas enquanto havia alguma nuvem viva / as que a nuvem respondeu «não» (`sim.dustRays`, diagnóstico não guardado); o primeiro raio tapado é sempre às 06:09:30 ou depois (às 06:09:30 nas seis rotas de controlo com granada, presumivelmente a nuvem da granada; entre as 06:12:52 e as 06:15:39, depois da demolição leste, nas outras 18, a nuvem da demolição), nenhuma pergunta de vista foi tapada por uma nuvem das bombas das 04:34–05:30 (nas rotas dos pilotos); «nuvens» = crateras distintas com nuvem viva em algum momento; «chamadas (ouvidas)» = chamadas dos feridos (3 por ferido) / falas 220–222 que o realizador pôs no ecrã; «mais perto de um polaco» = distância mínima de um homem do assalto (fora da fase `clear`) a um corpo polaco no tabuleiro (jogador, par, retaguarda, qualquer aliado) entre as 06:05 e a demolição leste. Antes do pacote: granadas 0, buscas 0, tratados 0, raios tapados 0 por construção (R2-b §4.5: 0 granadas e 0 buscas nas 24 rotas; o alemão mais próximo de um posto, 83 m).

**Rotas de controlo** (12)

| rota | raios (perguntas / tapadas) | nuvens | feridos | chamadas (ouvidas) | tratados | levados | granadas | buscas | mais perto de um polaco (m) | Dudek ao posto às 06:03:30 (m) | saúde final | sobreviventes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 19390901:0 | 483 / 284 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.68 | 100 | 12 |
| 1:0 | 462 / 289 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.69 | 84 | 12 |
| 2:0 | 448 / 296 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.69 | 44 | 12 |
| 3:0 | 468 / 293 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.71 | 28 | 12 |
| 4:0 | 237 / 103 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 207.8 | 0.68 | 60 | 12 |
| 5:0 | 222 / 87 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 41.7 | 0.72 | 100 | 12 |
| 6:0 | 242 / 104 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 194.1 | 0.63 | 84 | 12 |
| 7:0 | 470 / 301 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.73 | 84 | 12 |
| 8:0 | 256 / 123 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 23 | 0.73 | 60 | 12 |
| 9:0 | 442 / 247 | 23 | 2 | 6 (1) | 2 | 1 | 1 | 0 | 23 | 0.68 | 76 | 12 |
| 10:0 | 256 / 116 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 37.8 | 0.72 | 76 | 12 |
| 11:0 | 219 / 83 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 70.9 | 0.66 | 60 | 12 |

Médias: raios perguntados 350.42, tapados 193.83; feridos 2.00, tratados 2.00, levados 1.00; granadas 0.50 (rotas com granada 6/12); buscas 0.00 (rotas com busca 0/12); aproximação mínima média 59.44 m (menor 23); completas 12/12; sobreviventes 12; Dudek livre e junto ao posto às 06:03:30 em 12/12

**Rotas de apoio** (12)

| rota | raios (perguntas / tapadas) | nuvens | feridos | chamadas (ouvidas) | tratados | levados | granadas | buscas | mais perto de um polaco (m) | Dudek ao posto às 06:03:30 (m) | saúde final | sobreviventes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 19390901:1 | 195 / 88 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.7 | 84 | 18 |
| 1:1 | 224 / 125 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.73 | 84 | 18 |
| 2:1 | 224 / 123 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.68 | 84 | 18 |
| 3:1 | 253 / 145 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 194.1 | 0.73 | 92 | 18 |
| 4:1 | 233 / 120 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 141.9 | 0.73 | 76 | 18 |
| 5:1 | 233 / 132 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.73 | 100 | 18 |
| 6:1 | 198 / 92 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.73 | 92 | 18 |
| 7:1 | 242 / 134 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.73 | 100 | 18 |
| 8:1 | 226 / 131 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 194.1 | 0.73 | 84 | 18 |
| 9:1 | 205 / 104 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 194.1 | 0.73 | 84 | 18 |
| 10:1 | 226 / 112 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 202.4 | 0.73 | 92 | 18 |
| 11:1 | 221 / 122 | 22 | 2 | 6 (1) | 2 | 1 | 0 | 0 | 194.1 | 0.73 | 100 | 18 |

Médias: raios perguntados 223.33, tapados 119.00; feridos 2.00, tratados 2.00, levados 1.00; granadas 0.00 (rotas com granada 0/12); buscas 0.00 (rotas com busca 0/12); aproximação mínima média 194.59 m (menor 141.9); completas 12/12; sobreviventes 18; Dudek livre e junto ao posto às 06:03:30 em 12/12


## 3. Golden: emenda 21 (`aid-dust`)

Gerada pela ferramenta oficial (`node tools/verification/m01-integration-golden-audit.mjs --amendment 21 --write`, x86), predecessor **exacto** `57ba50f3305d18a0ddcad0d2c3563f14e293d7a7` (a emenda 20 passa a história: `after` = esse commit; o seu golden fixa a simulação dele, `d4f00e73…`). Ficheiros: `tests/fixtures/m01-aid-dust-gameplay-baseline.json` (o golden), `docs/verification/m01-runtime/pkg2-act1-2026-11-04/GOLDEN_AMENDMENT_21.json` (a conta), `tests/m01-animation-contract.test.js` (20 história, 21 viva, o encadeamento e os números abaixo).

- **Prova por tick** (as duas rotas do T47: 19390901 controlo e 7 com apoio). As duas simulações são byte a byte iguais durante 1354 ticks (dois blocos de 512 iguais ao golden anterior) até às **04:34:00** (tick **1355**, 67,75 s): a 1.ª cratera (`station_bomb`) já traz a sua nuvem e a **1.ª diferença** é `sectors.damage.0.dust` (ausente no predecessor). Com as nuvens, os registos `aid`, o trabalho do socorrista, o registo do realizador e o estado do diálogo retirados dos dois lados (`stateOnly`), a **1.ª diferença de comportamento** é o 1.º passo de Dudek para o 1.º ferido (`actors.5.x`, tick **4315**, 215,75 s, 04:42:38), nas duas rotas: **nada se mexe antes**, o que diz que o pó (e as chamadas dos feridos) não mudou ninguém antes de o socorrista partir.
- **O enredo**: os 12 objectivos, CP-A..D, os eventos consumidos, as bandeiras do enredo, os sobreviventes (12 / 18) e o relógio de batalha final (07:05:00) são os do predecessor nas duas rotas e nas outras quatro (sementes 3 e 7, com e sem apoio); a hora de batalha de cada evento fixo é a do predecessor (a demolição leste a 22200 = 06:10:00); **0 atravessamentos e 0 empilhados nas seis rotas**.
- **O que muda** (`movedEvents`, tempo **real**): controlo, 25987 → **26170** ticks, a rota acaba aos 1308,5 s (era 1299,35): a demolição leste e o regresso de Dudek com Bąk +23,4 s (a luta do tabuleiro dura mais com o assalto a chegar à linha mais funda), o debriefing, a chamada, o ataque distante e a demolição oeste +9,2 s; apoio, 22551 → **22326** ticks, 1116,3 s (era 1127,55): a demolição leste (793,5 s) e o regresso de Dudek com Bąk (821,75 s) **não se mexem** (o assalto fica a mais de 140 m e não há granada); só a demolição oeste das 06:45 (1112,5 → 1101,25 s) e o que se segue chegam 11,25 s mais cedo, porque o piloto, que reage ao que vê, sai de `bz_west` mais depressa depois do regresso (o gate da demolição oeste espera por ele); não isolei a causa (a nuvem da demolição leste tapa a vista do nó alemão sobre a escolta a partir das 06:14:43–06:15:39, a hipótese). As outras quatro rotas: semente 3 controlo 1272,4 → 1318,75 s, 3 apoio 1114,9 → 1112,9, 7 controlo 1294,3 → 1334,65, 7 apoio 1127,55 → 1116,3. Rondas alemãs por minuto real: 94,34 → 90,24 e 62,26 → 59,39. `to0600` igual (562,95 s e 543,2 s): nada se mexe até às 06:00 em tempo real.
- **Entradas que se mexeram** desde o predecessor: `m01-simulation.js`, `mission.json`, `m01-animation-presentation.js`, `m01-barks.js`, `m01-section.js` e os dois módulos novos, `m01-dust.js` e `m01-aid.js`; `m01-deck-assault.js`, `m01-rearguard.js`, `m01-difficulty.js`, `m01-audio-events.js`, `m01-blast.js`, `m01-garrison.js`, `m01-squad.js`, `m01-sappers.js`, `m01-retreat.js` e `m01-opening.js` não. Os goldens 08–20 que registam os cinco ficheiros que se mexeram deixam de os comparar com os ficheiros vivos (`MOVED_BY_21` em `tests/m01-animation-contract.test.js`, com a data e a causa).


## 4. Testes e verificação

Tudo abaixo correu sobre as mesmas fontes de jogo, de render e de ferramentas do ramo `pkg2-act1` (as de `7344da1e`; os commits seguintes, `864fb801` e `69c0c44a`, só tocam em documentos e testes). A máquina foi partilhada com outros agentes durante toda a sessão (carga 4–13 em 4 CPU), por isso os tempos são longos e dois specs de navegador falharam por tempo (abaixo). **Não corri `npm test` completo.**

### 4.1 Testes novos (um grupo por comportamento) e o resultado

| ficheiro | testes | o que prova |
|---|---|---|
| `tests/m01-dust.test.js` | 7 | modelo da nuvem: densidade (sobe, mantém, afina), corda de um raio no cilindro, bloqueio nos dois sentidos, nuvem fora da linha/abaixo/atrás não esconde ninguém, tipos (bomba, granada, demolição), registo sem nuvem de um save antigo recebe o valor do seu tipo, nuvem malformada recusada, determinismo de um save com nuvens |
| `tests/m01-dust-ai.test.js` | 6 | o polaco tapado pelo pó não é alvo; a busca com nuvem avança para ver onde o viu e as regras da busca de R2-b ficam (memória, abrigo, espaço, não o overwatch); a nuvem desfeita devolve a vista; a secção polaca também fica cega; o fogo de busca do MG34 vai ao último ponto visto; a granada alemã deixa a sua nuvem |
| `tests/m01-aid.test.js` | 15 | só há feridos se uma bomba os feriu; chamam no máximo 3 vezes, a cada 14–22 s, pelo realizador; o médico vai ao mais próximo, ajoelha-se, trata 6–10 s pela ferida e devolve saúde; leva-o à cobertura mais próxima ou deixa-o se já está junto de uma; um de cada vez; espera bombas do calendário e abriga-se quando abalado; o trabalho pára às 05:30; saves de qualquer fase validam, restauram e seguem tick a tick; registos malformados recusados; as 7 falas nos seus nós; o enredo está a salvo (o médico está livre no posto muito antes de Bąk) |
| `tests/m01-pkg2-saves.test.js` + `tests/fixtures/m01-pkg2-old-saves.json` | 3 | dois saves **reais** do predecessor (`57ba50f3`, 04:42 e 06:05:30, 160 KB) validam, carregam, recebem a nuvem por omissão e jogam até ao fim sem excepção |
| `tests/m01-pkg2-routes.test.js` | 2 | nas duas rotas do golden: feridos tratados, um levado, médico no posto antes de Bąk; no controlo a granada lançada a 23 m e a nuvem que ela deixa; no apoio, sem granada (desenho) |
| `tests/m01-atmosphere-runtime.test.js` | 3 (1 novo) | o renderer desenha `state.dust` onde está, com o tamanho e a densidade, dentro dos reservatórios; sem nuvem, sem bolas; o estado nunca é alterado |

Comandos e resultados reais:

```
node --test --test-concurrency=1 tests/m01-dust.test.js tests/m01-dust-ai.test.js tests/m01-aid.test.js tests/m01-pkg2-saves.test.js tests/m01-atmosphere-runtime.test.js
  # tests 34   # pass 34   # fail 0   (120 s)
node --test --test-concurrency=2 tests/m01-pkg2-routes.test.js tests/m01-animation-contract.test.js tests/m01-station-evacuation.test.js
  # tests 52   # pass 52   # fail 0     (2 + 39 + 11)
node --test tests/m01-german-retreat.test.js
  # tests 22   # pass 22   # fail 0
```

### 4.2 Lote dos ficheiros que leem as fontes alteradas (111 ficheiros)

A lista está em `docs/verification/m01-runtime/pkg2-act1-2026-11-04/TESTS_RUN_BATCH.txt` (os ficheiros de `tests/` que leem as fontes alteradas: a simulação, os módulos tocados, o `mission.json` e as rotas do golden). Comando: `node --test --test-concurrency=2 <os 111 ficheiros>` (lançado por um pequeno executor local que lê a lista, em segundo plano, com registo); não inclui os ficheiros novos de §4.1 (salvo `m01-atmosphere-runtime`) nem `m01-animation-contract`, que correram à parte. Resultado real: **`# tests 1349`, `# pass 1342`, `# fail 7`** (8334 s ≈ 2 h 19 com a máquina partilhada). Os 7 falhavam por causa do act 1 novo e **foram corrigidos nos testes** (commit `69c0c44a`), sem tocar nas fontes nem remover asserções:

- 6 em `tests/m01-german-retreat.test.js` (T48): a rota de controlo do ficheiro era a da semente 1 (re-fixada em R3-a porque no golden não sobrevivia nenhum homem do assalto); agora, na semente 1, só um homem do assalto chega vivo ao rebentamento (a luta do tabuleiro é mais longa e mais perto), logo não há dois para levantar os dois caídos. Medi com uma sonda só de leitura as 12 sementes de controlo (homens do tabuleiro vivos no primeiro tick depois do rebentamento): 19390901: 5, 3: 5, 7: 5, 2: 3, 6: 3, 9: 3, 4: 2, 8: 2, 10: 2, 1: 1, 11: 1, 5: 0. A rota de controlo do ficheiro volta a ser a do golden (semente 19390901, 5 sobrevivem). Reexecutado: 22/22.
- 1 em `tests/m01-station-evacuation.test.js`: o save antigo do ferido da estação já não deixa o médico sem tarefa (tem agora a tarefa `aid`); o teste aceita `undefined` ou `aid` e acrescenta o que um save antigo nunca pode trazer de volta (sem `stationDrag`, sem transporte). Reexecutado: o ficheiro todo passa (11).

Outros testes que fixavam números do Ato I e foram refixados **antes** do lote, cada um com comentário datado e causa (nenhuma asserção removida): `tests/m01-deck-assault.test.js` e `tests/m01-german-ai.test.js` (`safeX` 190; a linha mais funda do homem da frente a 23 m da retaguarda e dentro do alcance da granada, em vez de «≥ 80 m»; a mutação de `limits[0]` passa a 185, abaixo do novo `safeX + 8`), `tests/m01-german-ai-tactics.test.js` (o defensor ajoelhado é alvo da granada; de pé continua a ser da espingarda, suprimido ou não), `tests/m01-ckm-candidate-posts.test.js` (janela 980 → 988 amostras, 1469 → 1322 entradas do S3), `tests/m01-ckm-fire-arc.test.js` (1312 → 1308 amostras, 46756 → 45388), `tests/m01-ckm-live-fire.test.js` (o save de antes do T47 não traz o socorro), `tests/m01-bomb-effects.test.js` (o ferido deitado longe de abrigo é levado: «nunca saiu do posto» vale para os outros), `tests/m01-barks.test.js` (as sete falas 220–226 com os seus casos), `tests/m01-animation-contract.test.js` (a emenda 21 viva, a 20 passa a história, `MOVED_BY_21`/`MOVED_SINCE_19`).

### 4.3 Golden: auditoria da emenda 21 e da história da emenda 20

```
node tools/verification/m01-integration-golden-audit.mjs --amendment 21 --write   (feito com a ferramenta oficial; escreveu os dois ficheiros do golden)
node tools/verification/m01-integration-golden-audit.mjs --amendment 21           → ... check: identical
node tools/verification/m01-integration-golden-audit.mjs --amendment 20           → ... check: identical   (a 20, agora história, contra o predecessor 57ba50f3)
```

As duas verificações correram em segundo plano, com registo, ao mesmo tempo (≈ 1 h 40 com a máquina partilhada); a última linha de cada uma é `check: identical`. Os números da auditoria estão em §3.

### 4.4 Build

`npm run build` → `✓ built in 7.20s` (Vite; só o aviso habitual de chunk > 600 kB). Feito sobre estas fontes (o renderer `m01-atmosphere.js` é a última fonte de jogo ou de render tocada).

### 4.5 Navegador (smoke do Ato I, `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, `CI=1`)

Uma cópia local do `playwright.config.js` com a porta 4197 (a 4173 estava ocupada pelas previews de outros agentes; a cópia não está no repositório). Comando: `npx playwright test --config <cópia> tests/browser/m01-animation-contract.spec.js tests/browser/m01.spec.js -g "M01 loads the nine|first raid displays|station evacuation restores|schema-2 continuation|genuine CP-D reload|withdrawal continuation|textured atmosphere|schema-2 animation contract"` (9 testes).

- **1.ª corrida** (carga 8–10): 6 passaram, 3 falharam. (a) `schema-2 animation contract current 103`: `#pause` não visível em 5 s (tempo, a máquina carregada); (b) `M01 loads the nine bridge LODs...`: tempo (a recarga do carregador, que só avança com fotogramas, não acabou em 180 s); (c) **`a genuine CP-D reload...`: falha real**, `enemyAlive` esperado 43, recebido 45: o pino da rota do golden (`CPD_ENEMIES_ALIVE`, re-fixado em cada emenda). Medido com `restoreSnapshot` em Node, no save CP-D da rota do golden: 45 vivos de 50, fora de combate só `de_spans_0..4`. **Corrigido o pino (43 → 45)** com comentário datado, em `tests/browser/m01.spec.js`.
- **2.ª corrida** dos três (carga 4–8): `current 103` e `genuine CP-D reload` passaram; `M01 loads the nine...` falhou outra vez, na janela de 60 s da recarga (`#mag` ficou em «—»).
- **3.ª corrida** do `M01 loads the nine...` sozinho (carga ≈ 1): **passou** (2,7 min). Ou seja, os 9 passaram no código final em alguma corrida; três precisaram de repetição (dois por tempo, um pelo pino acima).
- **Extra (fora da lista pedida)**: `tests/browser/m01-demolition-setpiece.spec.js` (6 testes: 4 passam, 2 falham) e `tests/browser/m01-german-retreat.spec.js` (1 falha). Os três que falham **falham igual na build do predecessor `57ba50f3`** (mesmas mensagens: `distance` 350 em vez de < 200; diferença de câmara de 160 m; distância da silhueta 922,4 contra 925,5 em vez de > 950), por isso não são deste pacote e não os toquei; ficam para o Capitão (pinos antigos desses specs).


## 5. Riscos, limites e decisões que ficam ao proprietário

1. **Sem playtest e sem captura.** O pó e o socorro só foram vistos em testes de estado e em Node. A alimentação do renderer (`state.dust` → bolas de poeira do `m01-atmosphere.js`) está testada com `THREE` sem GPU e foi percorrida pelos specs de navegador de §4.5, mas **nenhuma imagem do pó foi vista por um humano nem por mim**: a densidade, a cor (`#90866f`) e o tamanho das bolas são palpites de leitura do código, não de olho.
2. **`safeX` 190 e `closeExtraSec` 100 são números do proprietário** (a decisão de R2-b ainda estava pendente) que eu mexi para a granada existir. Efeitos medidos (24 rotas): o alemão mais próximo de um polaco do tabuleiro, 23 m no melhor caso (antes 83 m); a rota de controlo do golden dura 1308,5 s reais (1299,35 s na emenda 20) e a de apoio 1116,3 s (1127,55 s); saúde final do piloto de controlo (recruta, 8 por ferida) 28–100, média 71 (as 24 rotas completam; nenhuma morte). Com 250 / 60 a granada volta a ser latente; é o único botão.
3. **Granadas só nas rotas de controlo** (6 de 12; 0 de 12 nas de apoio): o jogador que cobre o tabuleiro mantém o assalto a mais de 140 m de qualquer polaco (R2-b §4.2), por desenho. Nas seis rotas de controlo sem granada: sementes 4 e 6 nunca a menos de 190 m (o assalto foi repelido antes); 5 e 10 ficaram a 41,7 m e 37,8 m (fora do alcance de 32 m); 11 a 70,9 m; na **semente 8** o homem da frente chegou a 23 m (x 198,8) ferido (23 de saúde, 1 cartucho), a supressão acabou 0,2 s depois de tomar a linha (o lançamento do imobilizado quer ≥ 0,4 s) e o gatilho estava a 9,7 s (o `cooldown` que a supressão deixa): nenhum gatilho veio nos 4,7 s em que a linha esteve ao alcance (medido com uma sonda de leitura que não está no repositório). Chegar ao alcance não garante a granada; uma regra «lança se está a ≤ 32 m, mesmo sem gatilho» daria mais, mas muda o ritmo do assalto e fica por decidir.
4. **A busca continua rara: 0 nas 24 rotas.** A causa é estrutural: num tabuleiro recto e aberto todos os polacos estão em fila, a nuvem de uma granada tapa-os a todos ao mesmo tempo, e quando ela rebenta o esquadrão já está nas linhas mais fundas (`hold`/`fallback`), onde a busca não tem sítio para onde ir («nunca para lá do limite»). O mecanismo existe, ganhou uma causa (o pó) e está provado em cenas (`tests/m01-dust-ai.test.js`); para o ver nas rotas era preciso deixar os homens em `hold` procurar, ou uma nuvem mais longa, ou um piloto que lance granadas: **decisão do Capitão**, não feita.
5. **Feridos por fogo alemão não existem**: os tiros alemães nunca ferem aliados (baixas por ID, decisão antiga que não toquei); os únicos feridos são os das bombas das 04:34–04:43 (a guarnição oeste, `displayOnly`, sem arma: um ferido tratado continua deitado e não combate). O ferido da estação e Bąk são do guião e não passam pelo socorrista. Duas pessoas tratadas por rota, uma levada; na rota de controlo do golden: 04:42:37–04:47:31 (`pl_west_4`, 10 s de tratamento, sem transporte) e 04:47:31–04:53:19 (`pl_west_1`, 10 s e 6,5 s de transporte).
6. **O socorrista sai do posto** durante cerca de 96 s reais (215,75–311,85 s na rota de controlo do golden: 04:42:37–04:53:19) e as falas 223–226 perdem-se muitas vezes (o canal está ocupado pelas falas dos sapadores): nas 24 rotas ouve-se uma chamada por rota (6 feitas). Está sempre de volta e livre às 06:03:30 (24/24), a 0,63–0,73 m do posto.
7. **O pó muda mais do que o tabuleiro**: nas 24 rotas nenhuma pergunta de vista foi tapada antes das 06:09:30; a nuvem da granada (nas 6 rotas de controlo com granada, presumivelmente) e a da demolição leste (42 m × 32 m, 150 s; entre as 06:12:52 e as 06:15:39 nas outras 18) são as que contam. O enredo, os checkpoints e os sobreviventes não mudam (golden), mas a luta do tabuleiro dura mais no controlo e a escolta leva menos fogo (a saúde final do piloto de controlo do golden passou de 76 para 100; a da rota de apoio, 100 nas duas). Os valores das nuvens (`src/game/m01-dust.js`: 16 m / 40 s a bomba, 42 m / 150 s a demolição, 4,5 m / 20 s a granada, 8 m / 30 s o obus, `blockAt` 3) são GAMEPLAY e ficam para o playtest.
8. **Polaco das sete falas** (220–226) escrito por um agente de IA: por rever por falante nativo.
9. **`npm test` completo não corrido**; correram os ficheiros que leem as fontes alteradas (§4.2).

