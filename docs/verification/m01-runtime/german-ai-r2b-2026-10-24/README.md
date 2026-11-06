# Fogo polaco real e IA alemã do tabuleiro: aproximação por linhas, supressão, granadas de mão, busca — 2026-10-24 (R2-b)

Ramo local `claude/exciting-bohr-k8v5xm-r2b` (de `33896528`, a integração da candidata #80 + bombas R1-a + secção polaca R2-a). **Não publicada**, sem revisão crítica independente, **sem playtest humano**. Ordem do Capitão a partir das queixas do proprietário: «os polacos fazem pouco para contrariar o ataque alemão», «os inimigos mostram pouca inteligência», «no combate a longa distância não consigo perceber o inimigo», «o combate é artificial». O que a auditoria da R2-a disse: o fogo dos fuzileiros polacos da secção era **só apresentação** (clarão e estampido, nenhuma ronda traçada, nenhum alemão suprimido ou ferido); o assalto alemão parava a 430 m do jogador e a 257 m do posto polaco mais próximo, sempre pela mesma linha, e nunca olhava para os polacos.

Resumo em três linhas. **(1)** Do assalto das 06:05 à demolição das 06:10 os fuzileiros da secção disparam rondas reais (as mesmas regras que o fuzil do jogador e o da retaguarda: linha de visão, dispersão que cresce com a distância, cobertura, dano por parte do corpo), suprimem e podem ferir alemães, num ciclo próprio (espreitar, disparar 1–3 tiros, pausa), e quem está suprimido não dispara. **(2)** O assalto alemão avança por linhas de aproximação (até 228 m do jogador e ~85 m da retaguarda polaca) **só enquanto os polacos do tabuleiro estão sob fogo** e ninguém do assalto caiu há pouco, recua uma linha quando um homem cai, alterna as duas vigas, toma os polacos por alvo, tem busca e lança uma granada de mão a quem não consegue atingir — atrás de **um único número** (`safeX`, 450 → 250) que o proprietário pode mover. **(3)** Os âncoras do relógio de batalha (`germans_on_east_spans` às 06:05:00 e `east_demolition` às 06:10:00), o enredo (12 objectivos, 4 checkpoints, sobreviventes 12 / 18) e a determinação tick a tick ficam como estavam; o tempo **real** da demolição leste muda (a luta do jogador passivo dura mais ~80 s; a do que cobre o tabuleiro, menos ~14 s em média), listado na emenda 18.

## 1. O que a simulação fazia antes (medido em `33896528`, 24 rotas)

- **Os polacos.** Os fuzileiros da secção (Pawlak, a voz do pelotão, Bąk) davam clarão, estampido e animação, nunca uma ronda: 18,8 tiros por rota, **0 acertos**, nenhum alemão suprimido por eles. O que fazia fogo real contra o assalto era a retaguarda (`pl_east_0..2`, 128 rondas e 2,6 acertos por rota), Kowal (o rkm, 26 rajadas por rota), a ckm (0 baixas no assalto) e, nas rotas de apoio, o jogador (64 rondas e 0,4 acertos por rota).
- **Os alemães.** O assalto (seis homens, `limits` x 458–578, `safeX` 450) avançava por lanços de duas estações e **parava na linha 0**: nunca a menos de 421,7 m do jogador (média dos mínimos 446,7 m) nem de 256,8 m de um posto polaco (264,9 m); 14 % do tempo a < 300 m de um posto, 0 % a < 150 m. Nunca olhava para os polacos como alvo (só o pelotão que fugia e o jogador), não tinha uma segunda linha, não alternava as vigas, não procurava ninguém que tivesse perdido de vista e não lançava granadas.
- **Efeitos medidos** (24 rotas, janela 06:05 → demolição leste): luta de 242,8 s (175–262), homens do assalto mortos 2,1 por rota (jogador 0,4, retaguarda 2,0), alemães suprimidos 35 % dos homens-tick e polacos do tabuleiro suprimidos 36 % dos ticks, 127,8 rondas alemãs por rota, 0,9 feridas no jogador (recruta), 24 / 24 rotas completas, sobreviventes 12 (controlo) / 18 (apoio), nada empilhado nem a atravessar sólidos (auditoria da R2-a).
- **Um defeito escondido** (§6 A): 11 das 48 baixas atribuídas à retaguarda nas 24 rotas estavam a mais de 600 m dos postos dela, 9 delas entre x 927 e 954 (os pontos de *overwatch* e a zona onde a demolição derruba os quatro homens, GERMAN_FELLED): rondas perdidas que continuavam o alcance de 1200 m do fuzil do jogador.

## 2. O que mudou no jogo

Código: `src/game/m01-section.js` (o ciclo do fogo real), `src/game/m01-simulation.js` (`alliedRound`, o assalto por linhas, a busca, a granada, a regra dos 20 s), `src/game/m01-deck-assault.js` (o plano das linhas e dos `tactics`, validado ao carregar), `src/game/m01-audio-events.js` (três eventos novos e o `npc-shot` com `end` / `hit`), `src/game/m01-difficulty.js` (a frase da morte por granada). Dados: `missions/m01-tczew/mission.json`, `grp_de_spans.deckAssault` (`safeX`, `stations`, o bloco novo `tactics`). Nenhuma fala nova, nenhum asset novo.

### 2.1 O fogo polaco passa a ser real (do assalto, 06:05, à demolição leste)

- **`sim.alliedRound(a, t, {gauss, sigmaMil, shaken, clearanceM})`**: uma ronda de kb wz.29 de um homem nosso a um alemão, pelo modelo do fuzil do jogador e da retaguarda: raio do olho ao tronco da postura em que o alemão está, dispersão em milésimos (a avaria cresce com a distância, como a de toda a ronda alemã), `sigmaMil` [5, 4] mais larga 4 s depois de o homem ser suprimido, **sem ronda e sem munição gasta** quando um amigo está na linha de fogo (a 0,8 m dela, ou o raio disperso chega a ele; um homem nosso **deitado** ferido, como Bąk às 06:04, está sob a linha e não nela), traçada de imediato contra todos, dano por parte do corpo (tronco 110, cabeça ×2, pernas ×0,7), supressão de `suppressAlong` (5 s a quem a ronda estala a < 3 m; no tabuleiro, o homem mais próximo e os vizinhos a 25 m) **sem** marcar a supressão como a do jogador. **A ronda acaba 40 m para lá do alemão visado** (ver §6, achado A). Nenhum sorteio do fluxo principal: a dispersão sai do fluxo próprio do homem.
- **O ciclo** (`SECTION.real`, `timers.section.fire`): cada fuzileiro da secção (Pawlak, a voz, Bąk) tem o instante do seu próximo espreitar; escolhe o alemão do tabuleiro mais próximo que vê (de pé, ≤ 650 m), dispara 1 a 3 tiros com o ferrolho do próprio fuzil e faz uma pausa à volta de 7 s (a da retaguarda); **suprimido, não dispara** até acabar a supressão e mais 1,2–3 s; sem alemão à vista, volta a olhar em 2,5–5,5 s. Antes do assalto, e com o gancho `sectionRealFire()` desligado, o tiro é o de apresentação da R2-a. Uma ronda real emite o mesmo `npc-shot` com `target`, e agora também `end` (onde a ronda parou) e `hit` (feriu), para a apresentação a poder desenhar.
- **Kowal**: o rkm responde também aos homens do assalto a ≤ 600 m (o alvo dele, a cadência e a postura são os de sempre; só o conjunto de alvos cresce).
- **Regra dos 20 s** (`lethalShot`): passa a ler só a supressão **do jogador** (`actor.playerSuppressedUntil`, posta por `fire()`). Sem isto a supressão que os polacos agora causam por si protegeria o pelotão e a sorte dele deixava de ser do jogador (§6, achado C). A chave existe em todo o homem do assalto desde a entrada (0 por omissão); um save de antes da R2-b, sem ela, recebe-a no restauro com a supressão que tinha, que era toda dele.

### 2.2 O assalto alemão (`grp_de_spans.deckAssault`)

- **`safeX` 450 → 250**, continua a ser o **único número** que o proprietário move. Cada homem do assalto tem a sua linha 0 (o limite de antes, x 458–578) e, para oeste, **linhas de aproximação** até à mais funda, `safeX + 8 m + o lugar na formação` (x 258–378; o da frente a 258, a 228 m do posto do jogador e a ~85 m da retaguarda polaca, que fica a 165–175). Com `safeX` ≥ 427 não há linha de aproximação e o assalto é o de antes, nó a nó (teste).
- **Quando avança** (`deckLine`, em cada tick de um homem em `hold`): para a linha seguinte se os polacos que seguram o tabuleiro (o par no posto do tabuleiro e a retaguarda nos seus postos) estão **sob fogo** (metade deles suprimida nos últimos 3 s: `pressure`) **e** ninguém do assalto caiu há `casualtyHoldSec` = 20 s; **recua uma linha** se um homem do assalto caiu depois de ele tomar a linha, num ponto a oeste do limite dele (uma baixa na aproximação ou na retirada não vira a frente); sem pressão fica na linha. Cada linha de aproximação é segurada 8–14 s (`closeHoldSec`; a linha 0 mantém os 20–38 s).
- **As duas vigas alternam** (`deckMayRush`): nas linhas de aproximação um homem cuja cobertura acabou espera, no máximo `alternateWaitSec` = 6 s, enquanto um homem da outra viga (norte z < 40, sul z ≥ 40) está em corrida. Na linha 0 e antes ninguém espera (o assalto de antes).
- **Prazo**: o do esquadrão (`maxSec` 165 s) cresce `closeExtraSec` = 60 s enquanto um homem vivo tem uma linha de aproximação por limite (`deckExtraSec`, função dos registos); o gate do relógio das 06:09:30 usa `holdBaseSec` (= `maxSec` + `closeExtraSec` + o caminho da linha 0 à mais funda) para os seus limites absolutos.
- **Alvos e supressão** (`squadTargets`, `pinSec`): os polacos do tabuleiro (o par e a retaguarda) são alvo do assalto (rondas de tipo `squad`: suprimem quem passam, nunca ferem; peso ×3 se o polaco disparou há < 8 s); uma ronda do assalto que estala a < 3 m de um **defensor do tabuleiro** suprime-o `pinSec` = **4 s** (a mesma duração com que a espingarda do jogador suprime um alemão: 5 s); qualquer outro aliado continua com os 1,5 s (1 s o pelotão) de sempre. O que o homem viu fica em `ai.seen` (já existia, passa a ter escrita também nos homens do assalto).
- **Busca** (`deckSearch`): um homem em cobertura a caminho da sua linha que viu um polaco nos últimos 12 s e agora não vê nenhum (3 s depois de o perder) desloca-se para a primeira estação, até um lanço e nunca para lá do limite, de onde um homem de pé veria o sítio onde o polaco foi visto (evento `deck-tactic` `search`). **Não acontece nas 24 rotas** (§4.5).
- **Granada de mão** (`deckGrenade`, `tactics.grenade`): um homem em cobertura ou numa linha, com um polaco entre 6 e 32 m que **não consegue atingir com a espingarda** (sem linha de vista; o jogador em cobertura autorada; ou um defensor do tabuleiro **imobilizado no seu posto**, de joelhos e suprimido; **nunca** o jogador a descoberto que vê, nem um polaco de pé ou não suprimido à vista), lança uma Stielhandgranate: uma por homem, uma por esquadrão a cada 15 s, no máximo 8 no ar; arco plano de 1,4 s para o sítio do polaco com erro de 5 % do alcance (fluxo próprio do homem), espoleta de 3,8 s **desde o arremesso** (a granada fica no chão 2,4 s: o aviso; fala 138 de Kowal «Granada! Abaixem!» do realizador, que já lê `grenades.active`; mensagem de HUD «Granada alemã! Afaste-se!» a ≤ 17 m do jogador); explosão: **um** ferimento do nível (8 / 34 / 50, sem sorteio) a ≤ 3,5 m com caminho livre; o arremesso é o telegrafo da regra **F1** (a primeira granada de um combate nunca leva o jogador a 0; só a de quem o combatia há `reactionGraceSec` o pode matar), F4 e o tecto de feridas do nível valem; os polacos a ≤ 10 m com caminho livre ficam suprimidos 3 s e **nunca feridos**; os alemães nunca. **Não acontece nas 24 rotas** (§4.5).

### 2.3 Estado novo (schema 2 intacto)

Todos opcionais, validados, ausentes nos saves antigos: `timers.section.fire`; no registo do assalto `lim` (a linha) e `gr` (granadas lançadas); `actor.playerSuppressedUntil` (todo o homem do assalto, desde a entrada); `actor.ai.seen` nos homens do assalto (a chave existia); `timers.deckGrenadeAt`; entradas de `grenades.active` com `by` e `at` (10 chaves exactas, ≤ 8 no ar, ≤ 2 do jogador). Eventos transitórios novos (`validateM01AudioEvent`, nunca guardados): `enemy-grenade`, `deck-tactic` (`stage` / `pullback` / `search`), `m01-blast.by`, `npc-shot.end` / `hit`.

### 2.4 Os números (mission.json, `deckAssault.tactics`) e porquê

| número | valor | porquê |
|---|---|---|
| `closeGapM` | 24 | uma linha de aproximação só existe se a mais funda estiver ≥ 24 m a oeste do limite |
| `stages` | 2 | uma linha intermédia e a mais funda: o proprietário vê três patamares (linha 0, intermédia, funda) |
| `pressure` | janela 3 s, metade | metade dos defensores (o par, a retaguarda) sob fogo nos últimos 3 s; com o fogo do jogador a suprimir os alemães, a pressão sobre os polacos desaparece e o assalto fica na linha 0 (rotas de apoio) |
| `casualtyHoldSec` | 20 | depois de uma baixa o assalto espera 20 s (a regra dos 20 s da retirada é a mesma ordem de grandeza) |
| `closeHoldSec` | 8–14 s | uma linha de aproximação não é uma posição de tiro prolongada |
| `closeExtraSec` | 60 | prazo extra do esquadrão; é **o botão da duração do combate** (§4.4, §10) |
| `alternateWaitSec` | 6 | as duas vigas alternam sem se esperarem para sempre |
| `squadTargets` | peso 1, 520 m | alcance a que um alemão toma um polaco por alvo |
| `pinSec` | 4 | ver §6, achado G (v1–v9): 2,5 s deixava o assalto sem contraste entre as rotas; 4 s dá o contraste pedido (passivo: pressão e aproximação; apoio: o assalto fica na linha 0) |
| `search` | memória 12 s, após 3 s | |
| `grenade` | 6–32 m, 1 por homem, 15 s, 1,4 s de voo, 3,8 s de espoleta, 3,5 m de ferimento, 10 m / 3 s de supressão | alcance real de uma Stielhandgranate; o aviso é a espoleta que sobra depois do voo |

## 3. O que fica igual

- **Âncoras do relógio de batalha**: `evt_m01_germans_on_east_spans` às 06:05:00 (tick exacto das duas rotas do golden: 12123 e 11707, até aí as duas simulações são byte a byte iguais) e `evt_m01_east_demolition` às 06:10:00 (battle 22200 nos dois lados). O gate das 06:09:30 continua a segurar o relógio até o tabuleiro estar limpo; o que muda é **quanto tempo real** isso demora (§4.4).
- **O enredo**: os 12 objectivos, os 4 checkpoints, os eventos consumidos, as bandeiras do enredo e a hora final 07:05:00 são os do predecessor em todas as rotas auditadas (duas do golden, mais as sementes 3 e 7 com e sem apoio); sobreviventes 12 (controlo) e 18 (apoio): a regra dos 20 s continua a ser do jogador (§2.1, §6 C). B4 (Bąk) e os abates do GERMAN_FELLED (os quatro de `overwatch` por índice) estão intactos.
- **A semente e o fluxo principal**: nenhum sorteio novo do fluxo principal (os fluxos próprios de cada homem e da secção, derivados do **estado** dele). O número de sorteios do fluxo principal muda só porque os alemães disparam mais ou menos rondas (`burst()` já os fazia), como em toda a emenda de comportamento.
- **Antes do assalto** (04:34 → 06:05): nada. O tiro dos fuzileiros continua de apresentação até ao assalto, as falas e os registos da R2-a são os mesmos; o varrimento de perigo (144 corridas, todas antes das 06:05) deu **144 / 144 linhas idênticas** (§5).
- **Saves**: schema 2; os campos novos são opcionais e validados; um save antigo carrega (§2.3, `tests/m01-german-ai-saves.test.js`).
- **Os dados históricos**: a aldeia francesa continua a ser ficcional; nenhum asset, nenhuma fala nova (a 138 é reaproveitada); nenhum conteúdo de COD.

## 4. Medido (24 rotas do piloto de teste: 12 sementes × controlo e apoio; janela = do assalto das 06:05 à demolição leste, por segundo **real**)

Ferramenta: `tools/verification/m01-german-ai-metrics.mjs` (só lê; determinística). Três colunas, as rotas completas do piloto em todas: **antes** = `33896528` (extraído de git com `--rev`); **só o fogo real, safeX 450** = esta árvore com `groups.grp_de_spans.deckAssault.safeX` = 450 (o valor de antes: sem linhas de aproximação; o que o fogo polaco real, o tecto das rondas perdidas e a supressão de 4 s fazem sozinhos); **depois, safeX 250** = o que se entrega, com `--audit` (clipping e empilhamento sobre a rota inteira). Distâncias: por tick, do alemão do assalto vivo mais próximo ao jogador e ao «posto» polaco mais próximo (o jogador, o par, Bąk e a retaguarda: os corpos polacos no tabuleiro). «Mínimo» = o da rota, e a tabela dá a média dos mínimos e o menor de todos. As baixas levam a fonte (a ronda que matou: jogador, retaguarda, secção, ckm, demolição) e a rondas disparadas / que acertaram (queda de saúde) por fonte.

**Rotas de controlo** (o piloto nunca dispara; 12 sementes)

| métrica | antes (33896528) | só o fogo real, safeX 450 | depois, safeX 250 |
|---|---|---|---|
| duração da luta do tabuleiro, s reais (média) | 252.19 | 258.43 | 332.72 |
| tempo real até à demolição leste, s (média) | 864.02 | 870.27 | 944.58 |
| alemão do assalto mais próximo do jogador, m (média dos mínimos das rotas) | 431.8 | 429.8 | 255.92 |
| alemão do assalto mais próximo do jogador, m (o mínimo de todas as rotas) | 429.8 | 429.8 | 229.8 |
| distância mediana ao jogador, m (média) | 661.8 | 657.91 | 566.27 |
| tempo com um alemão a < 300 m do jogador, % (média) | 0.0 | 0.0 | 10.31 |
| tempo com um alemão a < 150 m do jogador, % (média) | 0.0 | 0.0 | 0.0 |
| alemão mais próximo de um posto polaco, m (média dos mínimos) | 262.32 | 262.32 | 109.17 |
| distância mediana a um posto, m (média) | 426.93 | 413.27 | 332.95 |
| tempo a < 300 m de um posto, % (média) | 19.28 | 20.33 | 39.81 |
| tempo a < 150 m de um posto, % (média) | 0.0 | 0.0 | 10.05 |
| tempo a < 100 m de um posto, % (média) | 0.0 | 0.0 | 2.57 |
| homens do assalto mortos na luta (de 6, média) | 2.25 | 1.08 | 2.83 |
|   pelo jogador | 0.0 | 0.0 | 0.0 |
|   pela retaguarda polaca | 2.5 | 1.08 | 2.75 |
|   pela secção | 0.0 | 0.0 | 0.08 |
|   pela ckm | 0.0 | 0.0 | 0.0 |
| rondas polacas disparadas, secção | 17.92 | 14.92 | 21.25 |
| rondas polacas que acertaram, secção | 0.0 | 0.08 | 0.25 |
| rondas polacas disparadas, retaguarda | 125.67 | 106.75 | 166.92 |
| rondas polacas que acertaram, retaguarda | 3.17 | 1.33 | 3.58 |
| rondas disparadas, jogador (piloto) | 0.0 | 0.0 | 0.0 |
| rondas que acertaram, jogador (piloto) | 0.0 | 0.0 | 0.0 |
| rajadas do rkm de Kowal | 42.67 | 43.33 | 55.33 |
| homens do assalto suprimidos, % dos homens-tick | 7.36 | 5.33 | 10.79 |
| polacos do tabuleiro suprimidos, % dos ticks | 47.32 | 70.14 | 72.47 |
| rondas alemãs disparadas (homens do tabuleiro) | 172.17 | 190.83 | 227.08 |
| rondas que colidiram com o jogador | 5.67 | 5.83 | 6.92 |
| feridas no jogador (recruta, 8 cada) | 1.58 | 1.5 | 2.08 |
| saúde mínima do jogador na janela | 84.67 | 85.33 | 80.67 |
| granadas de mão lançadas | 0.0 | 0.0 | 0.0 |
| dano ao jogador por granadas | 0.0 | 0.0 | 0.0 |
| as duas vigas em uso ao mesmo tempo, % dos ticks | 64.03 | 62.89 | 64.94 |
| linha de aproximação mais funda atingida (média) | 0.0 | 0.0 | 2.0 |
| recuos de linha (por rota) | 0.0 | 0.0 | 0.5 |
| buscas (por rota) | 0.0 | 0.0 | 0.0 |
| rotas completas | 12/12 | 12/12 | 12/12 |
| sobreviventes | [12] | [12] | [12] |
| eventos de clipping / pares empilhados | - | - | 0 / 0 |

**Rotas de apoio** (o piloto cobre o tabuleiro com o fuzil; 12 sementes)

| métrica | antes (33896528) | só o fogo real, safeX 450 | depois, safeX 250 |
|---|---|---|---|
| duração da luta do tabuleiro, s reais (média) | 233.47 | 231.35 | 218.67 |
| tempo real até à demolição leste, s (média) | 812.13 | 810.01 | 797.34 |
| alemão do assalto mais próximo do jogador, m (média dos mínimos das rotas) | 461.63 | 462.33 | 419.72 |
| alemão do assalto mais próximo do jogador, m (o mínimo de todas as rotas) | 421.7 | 421.7 | 321.4 |
| distância mediana ao jogador, m (média) | 663.48 | 678.23 | 666.38 |
| tempo com um alemão a < 300 m do jogador, % (média) | 0.0 | 0.0 | 0.0 |
| tempo com um alemão a < 150 m do jogador, % (média) | 0.0 | 0.0 | 0.0 |
| alemão mais próximo de um posto polaco, m (média dos mínimos) | 267.39 | 267.39 | 253.49 |
| distância mediana a um posto, m (média) | 431.01 | 479.96 | 432.86 |
| tempo a < 300 m de um posto, % (média) | 8.66 | 8.48 | 15.12 |
| tempo a < 150 m de um posto, % (média) | 0.0 | 0.0 | 0.0 |
| tempo a < 100 m de um posto, % (média) | 0.0 | 0.0 | 0.0 |
| homens do assalto mortos na luta (de 6, média) | 2.0 | 0.75 | 1.5 |
|   pelo jogador | 0.75 | 0.42 | 0.5 |
|   pela retaguarda polaca | 1.5 | 0.25 | 0.92 |
|   pela secção | 0.0 | 0.08 | 0.08 |
|   pela ckm | 0.0 | 0.0 | 0.0 |
| rondas polacas disparadas, secção | 19.67 | 22.67 | 22.0 |
| rondas polacas que acertaram, secção | 0.0 | 0.17 | 0.17 |
| rondas polacas disparadas, retaguarda | 130.5 | 121.08 | 110.08 |
| rondas polacas que acertaram, retaguarda | 2.08 | 0.33 | 1.17 |
| rondas disparadas, jogador (piloto) | 127.42 | 126.33 | 119.33 |
| rondas que acertaram, jogador (piloto) | 0.75 | 0.42 | 0.5 |
| rajadas do rkm de Kowal | 8.33 | 8.33 | 8.33 |
| homens do assalto suprimidos, % dos homens-tick | 63.22 | 61.79 | 63.5 |
| polacos do tabuleiro suprimidos, % dos ticks | 24.11 | 44.16 | 43.6 |
| rondas alemãs disparadas (homens do tabuleiro) | 83.5 | 84.42 | 78.25 |
| rondas que colidiram com o jogador | 2.67 | 2.75 | 1.92 |
| feridas no jogador (recruta, 8 cada) | 0.17 | 0.25 | 0.25 |
| saúde mínima do jogador na janela | 94.67 | 94.0 | 94.0 |
| granadas de mão lançadas | 0.0 | 0.0 | 0.0 |
| dano ao jogador por granadas | 0.0 | 0.0 | 0.0 |
| as duas vigas em uso ao mesmo tempo, % dos ticks | 52.8 | 53.91 | 58.1 |
| linha de aproximação mais funda atingida (média) | 0.0 | 0.0 | 0.67 |
| recuos de linha (por rota) | 0.0 | 0.0 | 0.0 |
| buscas (por rota) | 0.0 | 0.0 | 0.0 |
| rotas completas | 12/12 | 12/12 | 12/12 |
| sobreviventes | [18] | [18] | [18] |
| eventos de clipping / pares empilhados | - | - | 0 / 0 |

Nota às baixas: «homens do assalto mortos na luta (de 6)» conta só os seis do assalto (`de_spans_4..9`); as linhas «pelo / pela …» das tabelas contam **todos** os alemães do tabuleiro que morrem na janela por essa fonte, incluindo os do *overwatch*, por isso a soma por fonte pode ultrapassar o total (antes, controlo: 2,5 da retaguarda para 2,25 do assalto, porque parte eram rondas perdidas sobre o *overwatch* a mais de 600 m, §6 A). A demolição derruba os quatro (4,0 por rota depois, 3,75 antes). Só dos seis do assalto (por `casualties.list`, `de_spans_4..9`), a IA polaca (retaguarda, secção, ckm) matou, controlo / apoio: antes 2,25 / 1,25, só o fogo real 1,08 / 0,33, depois 2,83 / 1,0; o jogador (apoio) 0,75 / 0,42 / 0,5; nas 24 rotas a IA 1,75 / 0,71 / 1,92.

### 4.2 Leitura

- **O jogador passivo (controlo) vê o ataque aproximar-se; o que cobre o tabuleiro vê-o parar.** Nas 12 rotas de controlo, 11 têm um alemão a < 300 m do jogador (o mais próximo: 229,8 m; 10,3 % do tempo) e 11 a < 150 m de um posto polaco (o mais próximo: 83,1 m; 8 rotas a < 100 m); a linha mais funda (a 2.ª de aproximação) chega-se em todas as 12. Nas 12 rotas de apoio o jogador suprime os alemães 63 % do tempo e o assalto fica na linha 0 em 5 delas, chega à 1.ª linha em 6 e à 2.ª em 1 (o mais próximo do jogador: 321,4 m; de um posto: 253,5 m médios). Foi o contraste pedido: o que o jogador faz decide até onde o assalto chega.
- **As baixas do assalto não mudaram de ordem**: 2,17 homens por rota (antes 2,13); os que a IA polaca (retaguarda, secção, ckm) mata, 1,75 → 1,92. Com a divisão que se queria: no controlo (o piloto nunca dispara) +26 % (2,25 → 2,83, retaguarda 2,75 e secção 0,08); no apoio o total vai de 2,0 a 1,5, dos quais o jogador 0,75 → 0,5 e a IA 1,25 → 1,0 (−20 %: o assalto fica fora do alcance onde as rondas acertam ~1–2 % e os que recuam já não morrem a correr). **A IA não ganha sozinha**: quem estraga o assalto é o jogador que suprime (63 % dos homens-tick contra 11 % do controlo), e os sobreviventes continuam a ser 12 sem o jogador e 18 com ele.
- **Os polacos fazem mais, e vê-se, mas acertam pouco**: rondas da retaguarda 126 → 167 por rota de controlo, 18 → 21 da secção (agora **reais**: 0,25 acertos por rota; ~1 % por ronda a 150–450 m), rajadas do rkm 43 → 55 (o conjunto de alvos de Kowal cresceu), alemães suprimidos 7,4 → 10,8 % dos homens-tick no controlo. A supressão é o efeito polaco, não a baixa.
- **O tecto das rondas perdidas custa baixas** (coluna do meio): com `safeX` 450 a retaguarda mata 1,1 homens por rota de controlo, não 2,5 (§6 A: 0,5 por rota eram rondas perdidas a mais de 600 m, e os polacos suprimidos durante 4 s disparam menos). As linhas de aproximação põem os alemães ao alcance do fuzil, e com isso a retaguarda volta a 2,75.
- **Os polacos do tabuleiro passam 72 % do tempo suprimidos** no controlo (47 % antes) e 44 % no apoio (24 % antes). Quem os pressiona não são sobretudo os homens do assalto que avançam mas os quatro do *overwatch* a 900 m (§6 H), e é essa pressão que abre as linhas de aproximação. É uma limitação, ver §10.
- **O jogador (recruta) leva um pouco mais de fogo** no controlo: 6,9 rondas que o tocam (5,7 antes), 2,1 feridas (1,6), saúde mínima 80,7 (84,7); no apoio, 2,7 → 1,9 rondas que o tocam e 0,17 → 0,25 feridas. Nada que mude a classificação por nível (§5).

### 4.3 Os alemães continuam a chegar e a atravessar os vãos leste nas horas do guião

O assalto entra às 06:05:00 e cumpre-se a retirada para lá de `clearX` antes da demolição das 06:10:00; os quatro de *overwatch* são os que a demolição derruba (4,0 por rota; antes 3,75, porque alguns já tinham sido mortos por rondas perdidas, §6 A); rotas com 3 ou mais caídos do assalto (o esquadrão recua por `breakOut`): 6 de 24 (11 antes). Nenhum alemão a oeste de `safeX` em nenhum tick de nenhuma rota (teste e medição), 24 / 24 rotas completas.

### 4.4 O tempo **real** da demolição leste mudou (e é a decisão que fica para o Capitão)

O relógio de batalha fica em 06:09:30 até o tabuleiro estar limpo (gate), por isso a duração real da luta é a do assalto: no controlo **252 → 333 s** (+80 s; a rota do golden 19390901: demolição aos 841,8 s → 933,0 s, **+91 s**), no apoio **233 → 219 s** (−15 s; a rota do golden 7: 833,3 s → 764,1 s, **−69 s**). Os eventos depois dela deslocam-se em tempo real (a lista, com os dois tempos de cada um, está em `GOLDEN_AMENDMENT_18.json`, `movedEvents`: demolição leste, regresso de Dudek com Bąk, demolição oeste, ataque distante, chamada, debriefing) mas **não em tempo de batalha** (22200, 22440,1, 24300, 25500: os mesmos). A causa no controlo: o prazo do esquadrão cresce `closeExtraSec` = 60 s enquanto há um homem numa linha de aproximação, o caminho de regresso parte da linha mais funda, e os homens seguram cada linha 8–14 s; no apoio o jogador suprime os alemães 63 % do tempo, o assalto fica quase todo na linha 0 e o prazo não cresce (a luta acaba onde o prazo de 165 s e o regresso a levam). **O botão é `closeExtraSec`** (e `closeHoldSec`, `casualtyHoldSec`); não foi recalibrado: 333 s é a luta mais longa do jogador passivo (máximo 361 s; 5,5 minutos de luta em vez de 4,2).

### 4.5 O que **não** acontece nas 24 rotas: granadas e buscas

- **Granadas de mão: 0 em 24 rotas.** Os alemães não chegam a 32 m de ninguém (o mais próximo de um posto: 83 m); o alcance de uma Stielhandgranate é de 6–32 m. A granada existe, está provada em cenas (alcance, só contra o que o fuzil não atinge, uma por homem, a espoleta e o telegrafo da regra F1, o dano 8 / 34 / 50, a supressão de quem está a ≤ 10 m, `tests/m01-german-ai-tactics.test.js`) e fica viva numa rota inteira só com **dois** números movidos (§4.7); com os valores entregues ninguém a vê.
- **Buscas: 0 em 24 rotas.** Uma sonda sobre três rotas (238 disparos de homens do assalto) não encontrou nenhum que perdesse de vista o polaco que viu: o tabuleiro é um corredor recto e aberto e quem se esconde atrás de uma cobertura continua à vista de quem está de pé. A busca existe e está provada em cenas (parede que esconde o sítio, memória 3–12 s, nunca para lá do limite), mas **não é um comportamento que o jogador veja** com a geometria actual.

### 4.6 Notas do piloto

O piloto de apoio dispara contra o alemão com a primeira posição do elenco ao seu alcance (os do *overwatch* a 900 m+), por isso as suas baixas (0,5 por rota) **subestimam** o que um jogador que escolhe os do assalto faria; é um piloto de teste, não um jogador. O piloto de controlo nunca dispara. Nenhuma das medições é um playtest.

### 4.7 Para ver a granada: dois números, não um (laboratório, 4 rotas de controlo e 2 de apoio, sem auditoria de clipping)

- **`safeX` 185 sozinho** (primeira versão da regra, antes de a granada poder ir a um defensor imobilizado): o mais próximo de um posto 78,5 m e 100,8 m (2 rotas), 0 granadas. A luta acaba pelo prazo (`maxSec` + 60 s) antes de o assalto chegar à linha mais funda.
- **`safeX` 185 e `closeExtraSec` 140** (regra final): os alemães chegam a **18,1 / 22,2 / 41,9 / 41,9 m** de um posto polaco e a 164,8–188,6 m do jogador; baixas do assalto 3–5 de 6 (a retaguarda e a secção), lutas de 268–378 s, 4 / 4 completas, sobreviventes 12. **Uma granada em 4 rotas** (19390901:0, aos 243,4 s: `de_spans_4` lança de x 194 a um homem da retaguarda imobilizado em x 177, explode aos 247,2 s; o jogador está a 150 m: dano 0). Nas rotas de apoio (2) o assalto continua a 384–450 m e não há granada.
- Conclusão para o Capitão: **a granada só é vista com `safeX` ≲ 190 e um prazo extra ≳ 140 s**, e então acontece pouco (a retaguarda, três homens, mata quase todos a esses 18–40 m). Com os valores entregues (250 / 60) é latente.

## 5. Dificuldade: a janela do tabuleiro por nível e os varrimentos

**A janela do tabuleiro por nível** (`m01-german-ai-metrics.mjs --snap … --level soldado|veterano`): cada uma das 24 rotas é guardada no primeiro tick do assalto (em recruta, como as de `tests/helpers/m01-danger.js`), re-nivelada e jogada só até à demolição com os controlos do piloto; a morte acaba a corrida e fica registada. A mesma entrada é jogada na árvore de antes (`--rev 33896528`) e na de agora (24 × 2 níveis × 2 árvores; `deck-window-*-compare.txt` mostra rota a rota).

| nível | piloto | antes (33896528) | depois (R2-b) |
|---|---|---|---|
| soldado | controlo | 12 / 12 morrem, aos 41–87 s (mediana 51 s) | **as mesmas 12 mortes, ao mesmo tick e pelo mesmo atirador** |
| soldado | apoio | 0 / 12 morrem | 1 / 12 (semente 9, aos 225 s, por `de_spans_9`); feridas 3,1 → 2,3 por rota |
| veterano | controlo | 12 / 12 morrem, aos 26–63 s (mediana 47 s) | **as mesmas 12 mortes, ao mesmo tick e pelo mesmo atirador** |
| veterano | apoio | 7 / 12 morrem (mediana 72 s) | 8 / 12 (mediana 80 s); uma rota deixa de morrer (1:1) e duas passam a morrer (3:1 aos 158 s por `de_east_14`, 4:1 aos 227 s por `de_spans_7`) |

- **O piloto passivo morre no tabuleiro a soldado e a veterano tal como antes**, porque morre antes de as linhas de aproximação se abrirem (a primeira acontece a ~110 s da entrada) e de a retaguarda estar em posto: quem o mata são os atiradores de sempre (do dique leste e do assalto na linha 0), o mesmo, tick a tick. Os alvos de H9 (`docs/direction/H9_DIFICULDADE.md`: soldado exposto 15–25 s, coberto ≥ 120 s; veterano exposto 8–12 s, coberto ≥ 60 s) foram escritos para os dois MG34 do portão nos cenários de reparo e de retenção e não se medem aqui: **o tabuleiro leste é outro sítio** (o piloto passivo vive aí 41–87 s a soldado e 26–63 s a veterano, igual a antes). **Desvio dos alvos H9 na janela do tabuleiro: não causado pela R2-b** (idêntico ao predecessor).
- **Os pilotos de apoio** (que cobrem o tabuleiro) a soldado vão de 0 para 1 morte em 12 e a veterano de 7 para 8; pela regra F1 (nenhuma ferida letal sem `reactionGraceSec` de combate prévio do mesmo atirador) cada uma dessas mortes só pode ser de um atirador que o combatia há pelo menos 0,8 s (veterano) ou 1,2 s (soldado). A diferença está dentro do ruído de uma luta que passou a ser outra (mudam rotas nos dois sentidos).

**Varrimentos completos** (`m01-difficulty-sweep.mjs` 72 corridas; `m01-danger-sweep.mjs` 144 corridas), comparados linha a linha com os da R2-a (`33896528`):

- **Perigo: 144 / 144 linhas idênticas** (todos os campos: morte, tempo até à morte, feridas, colisões, quem matou). É o esperado: os cenários de perigo (reparo e retenção) acabam antes das 06:05.
- **Dificuldade: 46 / 72 idênticas.** As 26 que mudam são as que chegam ao tabuleiro: as 24 de recruta (que completam sempre) e duas de soldado com apoio (sementes 3 e 8, as duas únicas que completam). **Mortes e conclusões não mudam**: recruta 0 mortes em 24 e 24 completas; soldado 22 em 24 (2 completam, as mesmas); veterano 24 em 24; saúde final de recruta 83,7 → 83,3; luta média 243 → 276 s (controlo 252 → 333, apoio 233 → 219). `sweep-difficulty-compare.txt` lista as diferenças campo a campo.

## 6. Achados durante a medição (todos corrigidos antes do golden, salvo indicação)

- **A. Rondas perdidas matavam homens a 900 m** (medição das primeiras rondas reais da secção, 2026-10-24). Uma ronda que falha o alemão visado a 450 m continuava os 1200 m do raio do fuzil do jogador e matou homens do *overwatch* (os quatro que a demolição derruba, GERMAN_FELLED) a 900 m e, na retaguarda polaca, corredores já a salvo a x 931–960. **Correcção**: a ronda dos fuzileiros da secção (`alliedRound`) e a da retaguarda (`rearguardShot`) acabam 40 m para lá do alemão visado (`suppressAlong` ganhou o parâmetro `reach`). Medido em `33896528`: **11 das 48** baixas atribuídas à retaguarda nas 24 rotas estavam a mais de 600 m dos postos dela (9 entre x 927 e 954: o *overwatch* que a demolição de qualquer modo derruba). Com `safeX` 450 e o tecto a retaguarda mata **1,08** homens por rota de controlo (2,5 antes); com as linhas de aproximação os alemães voltam a estar ao alcance do fuzil e as baixas voltam à ordem de 2–3 (§4.2).
- **B. O par não conseguia disparar**: Bąk está deitado e ferido na faixa de fogo do par às 06:04 e a sua caixa de acertos é a de um homem de pé; e a folga de 1,5 m da retaguarda bloqueava um par que está a 1,1–1,2 m dos postos do jogador. **Correcção**: um homem nosso deitado (`WOUNDED` / `DOWN`) não entra nos amigos da linha de fogo nem no traçado, e a folga da secção é 0,8 m (`SECTION.real.clearanceM`); a regra da retaguarda (1,5 m) não mudou.
- **C. A supressão polaca protegia o pelotão.** A regra dos 20 s lia `suppressedUntil` de qualquer origem; com o fogo real da secção os alemães passam a estar suprimidos pelos polacos e a regra deixava de matar o último homem do pelotão (a sorte do pelotão passava a ser da IA). **Correcção**: `actor.playerSuppressedUntil`, posto só pelo `fire()` do jogador; a regra lê só essa. Teste: o pelotão cai com os alemães suprimidos por outro e fica com os suprimidos pelo jogador (`tests/m01-german-ai.test.js`); `tests/m01-cover-combat.test.js` reposto (§8).
- **D. Um save a meio da luta mudava ao restaurar** (apanhado pelo teste de dupla restauração de `tests/m01-deck-assault.test.js`, não pela medição): a primeira versão da migração de saves antigos (todo o homem do assalto suprimido sem `playerSuppressedUntil` ganhava a supressão por sua) reclassificava a supressão que os polacos causavam, num save novo, como do jogador, e o original e o restaurado divergiam ao tick 170. **Correcção**: a chave existe em todo o homem do assalto desde a entrada (`beginDeckAssault`); só um homem do assalto *sem* a chave é de um save antigo e só esse é migrado. Teste de saves antigos (`tests/m01-german-ai-saves.test.js`).
- **E. A busca era inalcançável** como a escrevi: exigia 15 s desde o início da fase, e uma fase de cobertura dura 2,2–5,5 s (mais 4 s suprimido); e no limite não há estação a que ir. **Correcção**: a busca só em cobertura a caminho da linha, sem esse intervalo (acaba no limite e na memória de 12 s). Uma sonda sobre três rotas (238 disparos de homens do assalto) mostrou que **nenhum perde de vista o polaco que viu** (o tabuleiro é um corredor recto e aberto): a busca existe e está provada em cenas (`tests/m01-german-ai-tactics.test.js`), mas não acontece nas 24 rotas.
- **F. «Mirar atrás» de um corredor não serve**: tentei dar à ronda polaca uma antecipação do movimento do alemão; os homens do assalto correm pela faixa, em linha com quem dispara, sem movimento transversal, e não mudou nada (retirado).
- **G. Calibração em 9 variantes** (oito rotas, `pinSec` 2,5 / 4, `closeExtraSec` 0 / 60, a janela e a parte da pressão, a espera após uma baixa): sem prazo extra o assalto só chegava à linha intermédia; com `pinSec` 2,5 a luta era errática; `pinSec` 4 e prazo extra 60 s dão o contraste que se pede: o jogador passivo vê o assalto aproximar-se (230–280 m do jogador, 83–131 m de um posto) e o jogador activo que suprime os alemães vê-os parar na linha 0 (a 380–470 m) com a luta mais curta. As 24 rotas são a medição final (§4); as variantes são a trilha de trabalho, não evidência.
- **H. Quem pressiona os polacos** (cena de teste, não medição): a supressão que alimenta a regra de pressão vem sobretudo dos quatro homens do *overwatch* (x 926–937) que disparam contra o jogador a 900 m e cujas rondas estalam a < 3 m do par (4 s de cada vez), não dos homens do assalto que avançam. Fica em §10.

## 7. Golden: emenda 18 (`german-ai`)

Gerada pela ferramenta oficial (`node tools/verification/m01-integration-golden-audit.mjs --amendment 18 --write`, x86), predecessor **exacto** `3389652895ac52d0bbf191301b4bce55e8e3b673` (a 17 passa a história: `after` = esse commit, o golden 17 fixa a simulação dele). Ficheiros: `tests/fixtures/m01-german-ai-gameplay-baseline.json` (o golden), `docs/verification/m01-runtime/german-ai-r2b-2026-10-24/GOLDEN_AMENDMENT_18.json` (a conta), `tests/m01-animation-contract.test.js` (17 história, 18 viva, o encadeamento e os números abaixo).

- **Prova por tick** (as duas rotas do T47: 19390901 controlo e 7 com apoio): as duas simulações são byte a byte iguais até às 06:05:00 (tick **12123** no controlo, **11707** com apoio; 23 e 22 blocos de 512 ticks são os do golden anterior). A **1.ª diferença** é a chave que todo o homem do assalto ganha na entrada, `actors.52.playerSuppressedUntil` (de_spans_0; ausente no predecessor, `0` agora). Com o estado novo retirado dos dois lados (`stateOnly`: essa chave, `deck.lim` e `deck.gr`, `ai.seen` dos homens do assalto, `timers.deckGrenadeAt`, `timers.section`, `timers.barks`, o estado do diálogo, e os eventos da secção e do assalto), a **1.ª diferença de comportamento** é um homem do par: a voz do pelotão volta-se para disparar a primeira ronda real (controlo, tick 12372, 06:06:40, `facing`) ou ajoelha-se sob a primeira supressão do assalto (apoio, tick 11758, 06:05:20, `crouched`).
- **O enredo e os âncoras**: os 12 objectivos, CP-A..D, os eventos consumidos, as bandeiras do enredo e os sobreviventes (12 / 18) iguais ao predecessor nas duas rotas e nas outras quatro (sementes 3 e 7, com e sem apoio); a hora de batalha de cada evento é a do predecessor (a demolição leste a 22200 = 06:10:00); clipping 0, empilhados 0 nas seis rotas.
- **O que muda** (`movedEvents`): o tempo **real** de seis eventos (debriefing, regresso de Dudek com Bąk, demolição leste, ataque distante de Kozliny, chamada, demolição oeste): controlo **+91,25 s** (a rota acaba aos 1256,3 s, não 1170,1 s; 23402 → 25126 ticks), apoio **−69,15 s** (1094,3 s, não 1167,7 s; 23354 → 21886 ticks). Rondas alemãs por minuto real: 92,2 → 90,5 e 62,5 → 64,6.
- **Entradas que se mexeram** desde o predecessor: `m01-simulation.js`, `mission.json`, `m01-deck-assault.js`, `m01-difficulty.js` (a frase da morte por granada), `m01-audio-events.js` e `m01-section.js`; `m01-squad.js`, `m01-barks.js` e `m01-rearguard.js` não. As goldens 08–16 que registam o módulo do tabuleiro e a tabela de níveis deixam de os comparar com os ficheiros vivos (`tests/m01-animation-contract.test.js`, `unchangedSince`, com a data e a causa).

## 8. Testes

**Novos (29 testes, 3 ficheiros, mais `tests/helpers/m01-deck-scene.js`)**: cenas feitas à mão sobre um save do primeiro tick do assalto de uma rota real (o piloto de `tests/helpers/m01-route.js`, parado nesse tick), e saves a meio da luta de duas rotas reais. Estado, não playtest.

- `tests/m01-german-ai.test.js` (10): as linhas de aproximação (três por homem; `safeX` 450 reproduz o assalto de antes nó a nó; a fronteira 426 / 427), os `tactics` validados ao carregar (18 mutações recusadas), validade do A* (todos os nós e troços livres de sólidos ao raio do corpo, rota do navegador sem desvios), o registo (`lim` e `gr` opcionais), os eventos novos e as palavras da morte por granada, `alliedRound` (mata sem dispersão, não gasta o fluxo principal, não é supressão do jogador; amigo na linha, Bąk deitado, parede, membro), o erro que cresce com a distância e a supressão de 5 s, o ciclo da secção (pausa entre espreitares, o alemão suprimido ou ferido, quem está suprimido não dispara, o registo valida; `npc-shot` com `end` e `hit`), o tiro de apresentação antes do assalto, a regra dos 20 s do jogador e a migração de saves antigos.
- `tests/m01-german-ai-tactics.test.js` (13): as linhas (avança com pressão, não sem ela, nem logo depois de uma baixa; a janela e a metade da pressão; ninguém no tabuleiro), o recuo de linha (baixa à frente conta, atrás não; o homem volta ao nó da linha que deixou), as duas vigas (espera ≤ 6 s, mesma viga, linha 0, sobreposição ≤ 15 % em 50 s), os polacos como alvo (peso ×3, overwatch, alcance, oeste), a supressão de 4 s ao defensor e 1,5 s aos outros, nenhum ferido, a busca (parede, memória, fase, limite; e a cadeia inteira por `deckFire`), a granada (condições, uma por homem e por esquadrão, cenário, F1, nunca contra o jogador que vê a descoberto), a explosão (8 / 34 / 50, parede, alcance 3,5 m, alemães intocados, polacos suprimidos 3 s e nunca feridos), F1 (a primeira granada deixa o jogador a 1; com `reactionGraceSec` de combate prévio mata), a fala 138 de Kowal e o prazo extra.
- `tests/m01-german-ai-saves.test.js` (6): saves a meio da luta (o ciclo do fogo, uma linha de aproximação, aos 120 s, a supressão do jogador) validam, restauram sem editar e continuam iguais ao original com restauros duplos; os mesmos saves sem nenhuma chave da R2-b carregam, migram (a supressão que tinham era do jogador) e continuam; um save com uma granada no ar continua através da explosão; **34 alterações mal formadas são recusadas** (granada, lançador, hora, espoleta, id, número no ar, `deckGrenadeAt`, `ai.seen`, `playerSuppressedUntil`, o ciclo); a rota inteira de cada piloto (nada a oeste de `safeX`, 0 clipping e 0 empilhados no controlo, sobreviventes 12 / 18, a demolição só depois de o tabuleiro estar limpo, rota completa).

**Re-pins datados** (cada um com a causa e a evidência no próprio teste; nenhum teste foi apagado nem enfraquecido; a propriedade testada é a mesma):

| teste | o que mudou | causa |
|---|---|---|
| `m01-deck-assault.test.js` | `safeX` 250; a linha à frente é a linha 0 (x 450–600); os limites do prazo usam `holdBaseSec`; o prazo de `maxSec` vale se ninguém está numa linha de aproximação, senão `maxSec + closeExtraSec`; a ronda do tabuleiro sai de x ≥ `safeX` | R2-b: `safeX` 450 → 250 e as linhas de aproximação |
| `m01-section.test.js` | a prova de neutralidade vai até ao assalto (06:05) e não até à demolição; um tiro da secção a um alemão do tabuleiro depois da entrada não precisa de chamada | a partir das 06:05 a secção dispara rondas reais (os alemães já não são os mesmos com e sem ela, por desenho) |
| `m01-german-retreat.test.js` | os homens que recuam e carregam são `de_spans_7` e `de_spans_9` (eram 8 e 9) | `de_spans_8` cai na luta (x 567) |
| `m01-cover-combat.test.js` | os alemães «suprimidos» passam a sê-lo pelo jogador (`playerSuppressedUntil`) | a regra dos 20 s só lê a supressão do jogador |
| `m01-combat-posture-staging.test.js` | o tiro de Kowal pode sair no tick em que a cobertura da escolta acaba (semente 7, 06:44:30) | um tick a que a luta mais longa chegou; a propriedade (ninguém se levanta sem motivo) igual |
| `m01-animation-contract.test.js` | 17 passa a história (`after` `33896528`), 18 viva; as goldens 08–16 deixam de comparar o módulo do tabuleiro e a tabela de níveis com os ficheiros vivos (`unchangedSince`) | emenda 18 |

O `npm test` completo, o build e o resto da verificação: §9.

## 9. Verificação

- **`npm test` completo**, duas corridas inteiras (`npm test` = `node --test tests/*.test.js`, 169 ficheiros). A **1.ª** (começou às 20:02 sobre a árvore de `a0a2dd64` e acabou às 21:03; 60 min 53 s) deu 1681 / 1684 e apanhou três falhas, todas explicadas e tratadas: **(a)** o teste do contrato do golden 18 correu com o golden ainda por regerar sobre a regra final da granada (o `sourceSha256` do ficheiro no disco, `94fe9ae8…`, fixava a fonte de antes; a fonte viva dava `14e14803…`); o golden foi regerado pela ferramenta às 20:50, a meio da corrida (`dedfe711`), e os testes que o leram depois (a comparação tick a tick das duas rotas) passaram; **(b, c)** os dois testes da casamata (`m01-ckm-candidate-posts`, `m01-ckm-fire-arc`), cuja janela de rota inteira é agora mais longa no controlo (a luta passiva dura mais, §4.4): re-pins datados em `efe252ba`, com a propriedade testada igual (a casamata não vê nenhum alemão: 0 entradas limpas; 135 amostras limpas, os mesmos nove alvos, 0 antes da demolição oeste; 975 amostras antes da demolição leste, antes 881) e a causa e a evidência escritas no próprio teste. A **2.ª**, sobre `efe252ba` (o código e os dados são os de `dedfe711`; depois dele só mudaram os dois testes da casamata e a documentação), deu **1684 testes, 1684 passam, 0 falham, 0 cancelados, 0 saltados** (52 min 29 s). Não repeti a suite depois de acrescentar só ficheiros de documentação e de evidência.
- **`npm run build`**: OK (1,4 s; o aviso do tamanho do chunk do jogo, 1,39 MB, é anterior).
- **Golden**: `node tools/verification/m01-integration-golden-audit.mjs --amendment 18` (sem `--write`: regera sobre a árvore entregue e compara byte a byte) terminou com **`check: identical`**; o mesmo para a 17, agora história (`--amendment 17`: predecessor `c66436d4`, `after` `33896528`): `check: identical`. A 18 por rota (primeira diferença, primeira diferença de comportamento, blocos iguais, tempos reais): §7 e `GOLDEN_AMENDMENT_18.json`.
- **Evidência regenerada sobre a árvore entregue.** A última alteração de código (`a0a2dd64`, a granada também a um defensor imobilizado) veio depois de as medições desta pasta terem sido feitas (as 24 rotas do «depois» às 19:05; os varrimentos e as janelas por nível, mais cedo). Repeti-as sobre `efe252ba` (22:04–22:34) e comparei, linha a linha e sem o rótulo, com os ficheiros desta pasta: as **24 rotas do «depois»** saíram idênticas (3 com a auditoria de clipping e empilhamento, que deu 0 / 0 como antes, e 21 sem ela: a auditoria custa ~9 min por rota; a rota é a mesma e tudo o que ela mede coincide), a coluna **safeX 450** (24 rotas) idêntica, as **cronologias** idênticas (só mudam os rótulos), o varrimento de **dificuldade** (72 corridas), o de **perigo** (144) e a janela do tabuleiro por **nível** (24 × soldado e veterano) idênticos. É o esperado: a regra nova só actua com um alemão a 6–32 m de um polaco (o mais próximo nas 24 rotas: 83 m) e não toca em estado nem em sorteios antes de lançar. As colunas «antes» são do predecessor extraído de git e não dependem do código novo.
- **Não corrido**: `npm run test:browser` (Playwright), qualquer inspecção visual, qualquer jogador humano, revisão crítica independente, medição de CPU por tick. Teste de estado não é playtest.

Reproduzir (nesta árvore; uma rota inteira leva ~1 min, ~9 min com `--audit`; as 24 rotas cabem em ~8 min em três processos, sem a auditoria):

```
node tools/verification/m01-german-ai-metrics.mjs --label after --audit --jsonl <f> --timeline <t>          # as 24 rotas, depois (com clipping e empilhamento)
node tools/verification/m01-german-ai-metrics.mjs --rev 33896528 --label before --jsonl <f>                # o predecessor (extraído de git)
node tools/verification/m01-german-ai-metrics.mjs --set groups.grp_de_spans.deckAssault.safeX=450 --label safex450 --jsonl <f>   # só o fogo real
node tools/verification/m01-german-ai-metrics.mjs --summary <f>                                            # as tabelas
node tools/verification/m01-german-ai-metrics.mjs --snap <dir> --level soldado|veterano [--rev 33896528]   # a janela do tabuleiro por nível (saves de tests/helpers/m01-deck-scene.js entry())
node tools/verification/m01-difficulty-sweep.mjs --jsonl <f>      # 72 corridas
node tools/verification/m01-danger-sweep.mjs --jsonl <f>          # 144 corridas
node tools/verification/m01-integration-golden-audit.mjs --amendment 18      # sem --write regera e compara byte a byte (17 e 18)
```

Ficheiros desta pasta: `metrics-before.jsonl`, `metrics-safex450.jsonl`, `metrics-after.jsonl` (uma linha por rota) e `timelines-*.txt` (a cronologia por rota: entrada, avanços de linha, recuos, baixas com a fonte, feridas do jogador, demolição); `METRICS_SUMMARY_*.json`; `deck-window-{soldado,veterano}-{before,after}.jsonl` e `-compare.txt`; `sweep-difficulty-after.jsonl`, `sweep-danger-after.jsonl` e os `-compare.txt` contra os da R2-a; `GOLDEN_AMENDMENT_18.json`. As variantes de calibração (§6 G) foram corridas fora do repositório e não são evidência; os laboratórios do §4.7 estão em `lab-safex185*.jsonl`.

## 10. Em aberto (para o Capitão e para o proprietário)

1. **`safeX` e as linhas** (o único número a mover): 250 entrega o pedido (< 300 m do jogador, 83–150 m de um posto da retaguarda) e deixa a granada e a busca sem efeito; 450 devolve o assalto de antes com o fogo polaco real. Quem quiser a granada à vista tem de levar os alemães a ≤ 32 m de um polaco: `safeX` ≲ 190 **e** `closeExtraSec` ≳ 140 (§4.7), a 18–40 m da retaguarda, que são três homens contra seis. **Não foi decidido por mim.**
2. **O tempo real da luta do jogador passivo** (+80 s, máximo 361 s): `closeExtraSec` (60), `closeHoldSec` (8–14 s) e `casualtyHoldSec` (20 s) são os botões; não os recalibrei depois de ver o efeito no tempo real. Os âncoras do relógio de batalha não se mexem.
3. **Quem pressiona os polacos** (§6 H): são sobretudo os quatro de *overwatch* a 900 m (4 s de cada vez que uma ronda estala a < 3 m do par) e não o assalto que avança. Com `pinSec` mais baixo os polacos disparam mais e o assalto avança menos; com 2,5 s a luta ficou errática (variante v7 da §6 G). Fica 4 s.
4. **Acertos polacos**: ~1 % por ronda a 150–450 m (a secção: 0,25 acertos por rota). Se o proprietário quer polacos que *matem* mais, o botão é `SECTION.real.sigmaMil` ([5, 4] milésimos) e o da retaguarda, não a lógica; a IA não ganha sozinha (§4.2) e isso foi pedido.
5. **Falas**: nenhuma fala alemã existe no jogo (nem uma): não acrescentei nenhuma. A granada reaproveita a 138 de Kowal (já escrita para a do jogador), cuja nota na `mission.json` e no documento do diálogo foi actualizada. **Nenhuma fala polaca nova**: nada para o falante nativo rever nesta entrega.
6. **A busca** só existe como comportamento latente (§4.5); se se quiser vê-la é preciso um tabuleiro com cobertura que esconda os polacos de quem está de pé (uma mudança de dados do mapa, fora do âmbito).
7. **Apresentação**: o `npc-shot` de uma ronda real traz `end` e `hit`, e há três eventos novos (`enemy-grenade`, `deck-tactic`, `m01-blast.by`); nada da apresentação os usa ainda (a queixa «não consigo perceber o inimigo» a longa distância precisa de rastos, impactos e vozes: R2-c ou outro pacote). A granada alemã é a esfera do renderer das do jogador.
8. **Não corrido**: `npm run test:browser` (Playwright), qualquer inspecção visual, qualquer jogador humano, revisão crítica independente. Os números de CPU por tick não foram medidos (a R2-a mediu 3 %).
9. **O piloto de apoio** subestima as baixas do jogador (dispara no 1.º alemão do elenco ao alcance, que é do *overwatch* a 900 m+): ver §4.6.
