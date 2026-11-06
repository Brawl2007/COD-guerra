# VII-a · duração do combate (pacote 1): segunda vaga depois de uma pausa — 2026-11-04

Ramo `pkg1-duration` (de `b41d947d`). O commit `2696ed01` (trabalho recuperado depois de um reinício do contentor, sem verificação) foi lido, verificado e completado neste commit. **Não publicado, sem playtest humano: nada disto está VALIDADO em jogo.** Houve uma revisão crítica em 2026-11-04 (secção «Revisão crítica»); as suas correções estão no commit seguinte. Os atos novos continuam desligados (`acts.enabled=false`): só se vê com `?act=vii-a` ou `?acts=1`. O ato atual (04:30-07:05) não mudou (ver «Comandos»). Ver o ato: `npm run dev` e `/COD-guerra/?act=vii-a` (README do INC-1).

> **Atualização 2026-11-04 (ramo `vii-a-r2`, secção «Segunda ronda» no fim):** três decisões do Capitão superaram partes do que se lê abaixo — há **CP-F na pausa** (já não «só há o CP-E»), as MG34 disparam **supressão** na pausa e quando presas (já não «a pausa é silenciosa»), e os dados da duração mudaram (pausa de 40 s, 2.ª vaga em dois grupos, limiares): os números das secções anteriores são os do commit `19cf713c`/`57ba50f3`.

## O problema

Medido no INC-1 (golden `b41d947d`, semente 19390901, recruta, relógio do ato; a vaga começa aos 14,5 s): piloto ativo — a única vaga quebrava aos 41,7 s, repelido aos 54,6 s (**40,1 s de luta**), ato a acabar aos 62,7 s; piloto passivo — quebra aos 72,0 s, repelido aos 95,6 s (**81,1 s de luta**). O proprietário achou o combate curto.

## O que o jogador vê agora

1. **1.ª vaga**, como antes: 9 atacantes em três faixas, por lanços entre montes de terra, com o apoio da orla (2 MG34 + 2 atiradores, z ≈ −1320). Quebra aos 7 caídos, aos 75 s de supressão média ou aos 200 s.
2. **Pausa (30 s).** Quando a 1.ª vaga quebra, os atacantes recuam pelo próprio caminho. **O apoio fica nos postos** e dispara quando vê alguém e não está preso ao solo (as MG34 de todas as vagas saem só na quebra final). A pausa conta-se a partir de o último atacante da 1.ª vaga ter saído do campo (caídos ou recuados). Zieliński diz a pausa (`np_013`: «a metralhadora deles ainda está lá», ou `np_014` se já não resta nenhuma MG34). Na pausa dá para reabastecer nas caixas (E).
3. **2.ª vaga.** Da linha de entrada (z = −1385, orla das árvores), 16 atacantes em **quatro colunas** (x −573…−297, desfasadas das da 1.ª: −507…−349), cada faixa 6 s depois da anterior e os homens de uma faixa 4 s uns depois dos outros (`delaySec`, 0-30 s), mais 2 MG34 próprias (z ≈ −1330) que entram com ela. Sete estações (−1352…−1212), fecha a 45 s. **Limiares próprios, um pouco mais duros:** quebra aos 12 caídos da própria vaga (contando as suas 2 MG34), 90 s de supressão média, 200 s (a 1.ª: 7, 75 s, 200 s). Zieliński: «Outra vaga!» (`np_015`).
4. **Quebra final:** recuam todos, também o apoio das duas vagas (`np_016`), «Repelidos. Por agora.» (`np_011`), cartão de fim, debrief.
5. `mission.status`: «Linha norte · N atacantes no campo · M caídos» → «vaga a recuar» → «**pausa** · 2 atiradores na orla» (ou «campo livre») → «**2.ª vaga** · N atacantes no campo · M caídos». O objetivo e a fase (`NP_ATTACK`) são os mesmos nas duas vagas.
6. O fogo alemão é o de sempre: rondas reais com arco e tempo de voo, ferimento do jogador pela tabela D35 (probabilidade exposto/abrigado, dano, limite por rajada), supressão a 3 m, `playerWeight` por nível. **Só há o CP-E** (a chegada): morrer na 2.ª vaga repete a 1.ª.

Alemães: 13 (9 + 4) + 18 (16 + 2) = 31 homens no elenco; os da 2.ª vaga esperam inativos na linha de entrada (nunca desenhados, atingidos ou contados) até lhes chegar a vez.

## Dados, fábrica, histórico

- `missions/m01-tczew/areas/np/act.json`, `grp_np_de.assault`: a 1.ª vaga é o bloco de sempre; **`echelons`** lista as seguintes (`id`, `lullSec` 5-180, `overwatch`, `lanes` com `delaySec` por faixa ou por homem, `stations`/`limitStation` opcionais, `closeAfterSec`, `breakPinnedSec`, `breakOut`, `maxSec`). Sem `echelons` o assalto é o do INC-1 (teste).
- `makeApproachPlan` (`src/game/m01-act-factories.js`) valida tudo e pára o jogo com mensagem clara: chave desconhecida («echelon second: unknown key brakOut»), `lullSec`, limiares, `breakOut` maior do que os homens da própria vaga, estações, `delaySec` (0-metade do `maxSec`), faixa ou homem repetidos, e que **nenhum caminho cruze terra, o destroço ou o parapeito** (`areaPlanSolids`). 18 casos de erro testados.
- **Honestidade histórica.** T08 (fonte única, certeza baixa) diz só que uma companhia atacou do norte e que a infantaria foi repelida por metralhadoras. As duas vagas, a pausa, os efetivos e os limiares são `GAMEPLAY_DRAMATIZATION` (`h_np_echelons`, `evt_np_wave_2`, `echelonsNote`, o cartão de entrada «duas vagas e a pausa entre elas: dramatização», o parágrafo `db_np_01` do debrief). Um teste garante o texto, a classificação e que `evt_np_wave_2.trigger.lullSec` é a pausa dos dados.
- Falas novas em português europeu: `np_013` (pausa), `np_014` (pausa sem MG34), `np_015` (2.ª vaga vista), `np_016` (quebra final).

## Saves (actSave)

- `AREA_SAVE_SCHEMA` 1 → **2** (o envelope continua esquema 3). `timers.wave = {at, casualties, brokenAt, repelledAt, closeCalled, ech, echs:[{at, casualties, brokenAt, closed, seen}], lullUntil}` (brokenAt/repelledAt: a quebra da **última** vaga e o fim). Guarda-se a vaga em campo, o cronómetro da pausa e os registos de cada vaga já entrada.
- **Saves antigos:** um `actSave` de esquema 1 (só existia com `?act=vii-a`/`?acts=1`, QA) é **recusado com mensagem, não migrado**: «Checkpoint do ato inválido: esquema 1, anterior à segunda vaga do ato (os saves de teste antigos não são migrados: recomece o ato).» (o elenco passou de 13 para 31 alemães; o ato recomeça em segundos). O caminho «Continuar» → `acts.load` devolve `{ok:false,error}` e o jogo mostra-o no ecrã `save-error` (lido em `game.js`; a mensagem é testada em `tests/m01-acts.test.js`, o ecrã não foi exercitado no browser).
- `validApproachWave` recusa (19 envelopes adulterados, 26 registos adulterados numa save na pausa e 26 numa save a meio da 2.ª vaga, todos recusados com mensagem): chaves a mais ou a menos, vaga sem registo ou registo a mais, tempos fora de ordem (a 2.ª vaga entra pelo menos `lullSec` depois da quebra da 1.ª), quebra final/pausa/fim impossíveis, `flag` incoerente com o registo, homens da 2.ª vaga fora do sítio (em campo antes da vez, à espera mexidos, entrados antes de `at + delaySec`), atacantes da 1.ª vaga vivos em campo na pausa, um homem fora do campo que não acabou o recuo (`clear`), um homem da 1.ª vaga à espera na linha de entrada. Teste de propriedade: o validador **aceita** o estado de três percursos amostrado a cada 0,5 s (passivo/soldado/19390901, ativo/recruta/3, ativo/veterano/7 com 7 mortes), passando por todos os estados da luta (`pending`, `active`, `lull`, `broken`, `repelled`).
- Restaurar na pausa, a meio da 2.ª vaga, na 1.ª vaga e no último recuo dá o **mesmo futuro tick a tick** (1200 ticks, eventos incluídos).

## Comandos e resultados reais

Sem `npm test` completo (pedido: só os testes focados). Árvore final, sem repetir suites no mesmo SHA.

| Comando | Resultado |
|---|---|
| `node --test tests/m01-act-vii-a.test.js` | **10/10** no commit anterior; **12/12** depois da revisão (4 min): dados (31 alemães, 2 vagas, pausa 30 s, caminhos livres de terra/destroço/parapeito), 18 casos de erro da fábrica, guarda histórica (as duas vagas são dramatização), mundo da área, auditoria barata = completa, **as 18 rotas** (todas completam, 0 atravessamentos, 0 empilhados, vaga ≥ 120 s com os dois pilotos, passivo ≤ 360 s, 2.ª vaga ≥ 40 s e ≥ 8 dos seus homens a disparar, apoio parado na pausa, `flag` sempre coerente com o registo, entradas pelo `delaySec`, estado na linha de estado), pausa e reabastecimento, falas pela ordem da história, morte e CP-E na 1.ª e na 2.ª vaga, golden. |
| `node --test tests/m01-acts.test.js` | **12/12** no commit anterior; **13/13** depois da revisão (2 min): fábricas ≡ `SQUAD`/`REARGUARD`; esquema 2 do ato atual intacto; esquema 3: restauro idêntico tick a tick (1200 ticks, eventos incluídos) na 1.ª vaga, na pausa, a meio da 2.ª vaga e no último recuo; envelopes adulterados (19, mais um esquema 1 e um save de área sem envelope, que nunca abre o ato atual); registo da vaga adulterado na pausa (26) e a meio da 2.ª vaga (26); o validador aceita todos os estados de 3 percursos; cadeia de atos; fronteira sem renderer/UI/DOM/relógio. |
| `node tools/verification/m01-act-vii-a-golden.mjs` | `check: identical` (a fixture foi regenerada com `--write`: na WIP, e neste commit só mudou o `sha256` de `m01-act-factories.js`; os resumos por segundo ficaram iguais). Depois da revisão (commit seguinte): só mudaram os `sha256` de `m01-area-sim.js`, `m01-act-factories.js` e `act.json`; os resumos por segundo, os tempos e o `final` das duas rotas ficaram idênticos. |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 20` | **`check: identical`** (46 min; as duas rotas de ouro e as quatro de guarda: 0 atravessamentos, 0 empilhados). Corrido com a árvore de `2696ed01`; nenhum ficheiro que o ato atual fixa mudou desde `b41d947d` (ver a linha do `git diff` mais abaixo), por isso o resultado vale para este commit. |
| `node --test` de `m01-aircraft`, `m01-demolition`, `m01-grading`, `m01-impostors`, `m01-water`, `m01-simulation-boundary` (varrem `src/` por padrões proibidos) | 69/69. |
| `node --test` de 10 ficheiros que importam `game.js` (`m01-audio-director`, `m01-ckm-live-presentation`, `m01-consolidation-lifecycle`, `m01-damage-decals`, `m01-difficulty-death-ui`, `m01-difficulty-ui`, `m01-long-range-fx`, `m01-partials-audio-pressure`, `m01-partials-completion`, `m01-player-shot-feedback`) | 113/113. |
| `git diff b41d947d --stat` sobre as entradas fixadas pelo golden do ato atual (`m01-simulation.js`, `mission.json`, `map-layout.json`, `m01-squad/rearguard/deck-assault/section/barks/opening/pacing/animation-presentation/fire/aim.js`, `tczew-world.js`, `spatial.js`, `m01-navigation.js`, `tests/helpers/m01-route.js`) e `src/render`, `src/ui` | vazio. |
| `npm run build` | OK (10 s). |
| `CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test tests/browser/m01-act-vii-a.spec.js` | **3/3** (7,7 min, build de produção, Chromium/SwiftShader): arranque `?act=vii-a`; saves de esquema 3 em spawn, 1.ª vaga (norte, oeste, destroço), **pausa** («Linha norte · pausa · …») e **2.ª vaga** («Linha norte · 2.ª vaga · …») sem erros de página, fim e debrief; transição a partir do ato atual. |

## Durações (18 percursos de `tests/m01-act-vii-a.test.js`: mesmo piloto, 50 ms por tick)

Todos os tempos em segundos. «Repelido» = do início da vaga ao fim da luta (limiar do teste: ≥ 120 s). Os pilotos de teste não são jogadores: o ativo é um atirador a ritmo humano (0,8 s na mira, ≤ 1 tiro/2,5 s), o passivo nunca dispara. No passivo **os três níveis dão percursos idênticos** (medido); no ativo as mortes repõem o CP-E (a tabela é a da última vida).

| piloto | nível | semente | 1.ª vaga quebra | pausa a partir de | 2.ª vaga entra | 2.ª vaga quebra | **repelido** | fim do ato (relógio) | mortes | alemães caídos (1.ª/2.ª) | polacos mortos | tiros do apoio na pausa (MG34 vivas) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| passivo | recruta | 19390901 | 42,6 | 66,5 | 96,5 | 202,5 | **223,2** | 245,7 | 0 | 27 (7/12) | 2 | 0 (1) |
| passivo | recruta | 3 | 35,7 | 60,5 | 90,6 | 222,5 | **258,4** | 280,9 | 0 | 23 (7/12) | 6 | 1 (1) |
| passivo | recruta | 7 | 50,7 | 72,1 | 102,2 | 223,1 | **257,0** | 279,6 | 0 | 24 (7/12) | 5 | 6 (1) |
| passivo | soldado | 19390901 | 42,6 | 66,5 | 96,5 | 202,5 | **223,2** | 245,7 | 0 | 27 (7/12) | 2 | 0 (1) |
| passivo | soldado | 3 | 35,7 | 60,5 | 90,6 | 222,5 | **258,4** | 280,9 | 0 | 23 (7/12) | 6 | 1 (1) |
| passivo | soldado | 7 | 50,7 | 72,1 | 102,2 | 223,1 | **257,0** | 279,6 | 0 | 24 (7/12) | 5 | 6 (1) |
| passivo | veterano | 19390901 | 42,6 | 66,5 | 96,5 | 202,5 | **223,2** | 245,7 | 0 | 27 (7/12) | 2 | 0 (1) |
| passivo | veterano | 3 | 35,7 | 60,5 | 90,6 | 222,5 | **258,4** | 280,9 | 0 | 23 (7/12) | 6 | 1 (1) |
| passivo | veterano | 7 | 50,7 | 72,1 | 102,2 | 223,1 | **257,0** | 279,6 | 0 | 24 (7/12) | 5 | 6 (1) |
| ativo | recruta | 19390901 | 22,7 | 25,5 | 55,6 | 119,8 | **134,3** | 156,9 | 0 | 28 (7/12) | 1 | 2 (2) |
| ativo | recruta | 3 | 25,6 | 33,2 | 63,3 | 127,3 | **136,9** | 159,5 | 0 | 31 (7/12) | 1 | 0 (2) |
| ativo | recruta | 7 | 19,7 | 23,5 | 53,5 | 122,4 | **134,6** | 157,2 | 0 | 29 (7/12) | 0 | 0 (0) |
| ativo | soldado | 19390901 | 30,1 | 35,9 | 65,9 | 116,1 | **128,2** | 150,8 | 1 | 27 (7/12) | 1 | 4 (2) |
| ativo | soldado | 3 | 21,7 | 34,0 | 64,0 | 117,5 | **129,6** | 152,2 | 0 | 25 (7/12) | 2 | 0 (1) |
| ativo | soldado | 7 | 19,5 | 24,4 | 54,4 | 112,4 | **127,9** | 150,4 | 0 | 28 (7/12) | 1 | 0 (0) |
| ativo | veterano | 19390901 | 42,6 | 66,5 | 96,5 | 169,6 | **186,5** | 209,0 | 5 | 25 (7/12) | 1 | 0 (1) |
| ativo | veterano | 3 | 29,9 | 39,2 | 69,3 | 135,1 | **150,5** | 173,1 | 1 | 30 (7/12) | 2 | 3 (1) |
| ativo | veterano | 7 | 50,7 | 72,1 | 102,2 | 201,3 | **212,9** | 235,4 | 7 | 29 (7/12) | 4 | 6 (1) |

**Atenção: este limiar vale nas 3 sementes testadas, não na cadeia real.** Na cadeia real a semente do VII-a deriva do RNG do ato 1 (`m01-acts.js:44`), por isso é qualquer uma; o que está acima são só as sementes 19390901, 3 e 7. Ver a secção «Revisão crítica».

Resumo: **ativo 127,9-212,9 s** de luta (antes, na rota de ouro: 40,1 s; agora 134,3 s); **passivo 223,2-258,4 s** (antes: 81,1 s; agora 223,2 s), ato completo em ≤ 280,9 s (4,7 min; o teste exige ≤ 360 s). 0 atravessamentos de sólidos, 0 homens empilhados em todos. O apoio disparou 0-6 vezes na pausa (média de ~2): ver riscos.

## Revisão crítica (2026-11-04, revisor independente) e correções

**Medido pelo revisor, não por este pacote** (12 sementes além das 3 dos testes × 3 níveis, mesmos pilotos): piloto ativo **93,2-203,7 s** de luta, com **11 de 26 percursos abaixo de 120 s** (o limiar de 120 s do teste **não se mantém** fora das 3 sementes testadas); a 2.ª vaga, em 6 percursos, durou **30,9-38,8 s** (o teste exige ≥ 40 s só nas sementes testadas); piloto passivo **196-325 s**. Conclusão honesta: o objetivo «≥ 120 s de luta» é verdadeiro para o piloto ativo nas 3 sementes testadas e **não** é uma garantia da cadeia real. Os limiares dos testes ficam como estão (valem nas sementes testadas) e **não** foram usados para afinar os dados. Não se mexeu em efetivos, limiares nem pausa neste commit; reforçar a duração do piloto ativo nas sementes curtas é uma decisão de desenho por tomar (mais estações, pausa maior, mais homens: ver risco 1).

Correções feitas a seguir à revisão (ramo `pkg1-review-fixes`):

1. **Validador (`validApproachWave`) deixava passar estados que a máquina nunca escreve.** Agora recusa, com a razão na mensagem do erro: um homem vivo em campo de uma vaga já quebrada que não esteja em `fallback` (a máquina põe-no em `fallback` no próprio tick da quebra e ninguém dessa vaga entra depois), e, depois da quebra final, o mesmo para todos (também o apoio); mais caídos contados do que mortos (no total e em cada vaga: os da vaga e o seu apoio); `lullUntil` anterior à quebra + `lullSec`. Os testes de registos adulterados ganharam estes casos (`tests/m01-acts.test.js`); o caso que dava `lullUntil = brokenAt` como legítimo foi corrigido. O teste de propriedade (3 percursos a cada 0,5 s) continua a passar: sem rejeições a mais.
2. **`near()` da fábrica amostrava 50 pontos por troço** (a cada 1,7 m num troço de 85 m, mais do que a profundidade de uma terra expandida, 1,54 m): agora é um teste exato segmento × caixa expandida. Teste: uma caixa de 0,2 m num troço de 85 m, entre duas amostras antigas, é recusada. **Sem tempo limite depois da quebra:** um homem em `fallback` que não chega a nenhum nó em `fallbackStallSec` (30 s, nos dados; a fábrica exige pelo menos 1,33 × o troço mais longo à `fallbackSpeed`, 21,7 s) é retirado do campo como um recuo acabado (`clear`, inativo): logo se nenhum polaco nem o jogador tem linha de visão para ele, senão ao fim do dobro (60 s). Sem estado novo: o relógio de progresso é `deck.since`, que o recuo reescreve em cada nó.
3. `areaPlanSolids` passou a incluir a frente do ninho da ckm (`np_parapet_nest`), como o mundo constrói; nenhum caminho a cruza.
4. Esta secção.

## Capturas (SwiftShader, 1280 × 720, qualidade por omissão do browser de teste)

- [`01-lull-overwatch-only.png`](01-lull-overwatch-only.png): save a 10 s do fim da pausa; HUD «Linha norte · pausa · 2 atiradores na orla · 10 caídos». Do parapeito, a norte, **não se distingue nenhum alemão** (o apoio está a ~160 m).
- [`02-second-echelon.png`](02-second-echelon.png): 25 s dentro da 2.ª vaga; HUD «Linha norte · 2.ª vaga · 16 atacantes no campo · 12 caídos». Também **não se distingue nenhum atacante** (estão a ~170-230 m; no INC-1 já se registou que alemães a 70-140 m quase não se veem). A visibilidade **não foi tratada aqui** (não se mexe em renderer) e o teste de browser só confirma o estado e o HUD, não que o jogador veja a vaga.
- [`smoke-lull-ech2.json`](smoke-lull-ech2.json): diagnóstico da página nas duas capturas (0 erros de página).

## Riscos, decisões e o que não foi verificado

1. **Efetivo da 2.ª vaga: 16 + 2, não «~9-12».** Variantes de 12 homens deram **83-103 s no mínimo** no piloto ativo (< 120 s): uma minha (12 + 2 MG34 em 3 × 4 faixas, quebra aos 11, as mesmas estações) deu 102,3 s; as outras são varreduras do autor do WIP (não commitadas). A atual dá 127,9 s. O limiar de 120 s e o efetivo pedido não cabem juntos com este piloto: escolheu-se o limiar. Quem quiser menos homens tem de aceitar uma luta mais curta ou outro mecanismo (pausa maior, mais estações).
2. **Margem curta:** o ativo mais curto fica a 7,9 s do limiar de 120 s. É determinista, mas qualquer ajuste de dados mexe nele (o teste dos 18 percursos e o golden avisam).
3. **A pausa é silenciosa para o jogador mais vezes do que o pedido («as MG34 continuam a disparar»).** As MG34 ficam e disparam quando veem alguém e não estão presas, mas a linha polaca (7 fuzileiros, Kowal, ckm) prende-as: numa pausa seguida tick a tick a MG34 esteve presa por supressão durante a pausa toda. 0-6 disparos do apoio em 30 s (média ~2); em 2 de 12 percursos já não resta nenhuma MG34 no início da pausa. Fogo «às cegas» de supressão sobre o parapeito não foi feito (regra nova de combate, fora do pedido); se o proprietário quiser pausa barulhenta, é a próxima decisão.
4. **Um só checkpoint (CP-E):** com o ato ~2,5× mais longo (passivo 245,7 s contra 103,7 s; ativo 156,9 s contra 62,7 s, rotas de ouro), morrer na 2.ª vaga repete tudo. Um CP-F na pausa é natural, mas muda os checkpoints do ato (fora do pedido).
5. **Visibilidade e orçamento do renderer:** até 22 alemães ativos em simultâneo (4 da 1.ª vaga + 18); o renderer desenha 18/24/48 atores (baixa/média/alta), os mais próximos primeiro, e os polacos já ocupam ~12. Em baixa/média os alemães mais longe não são desenhados. Não visto no ecrã além das duas capturas acima.
6. Pilotos automáticos não são jogadores; sem playtest, sem FPS; golden só em x86_64.
7. A pausa de 30 s e os limiares são dramatização (podem mudar com o playtest); o `lullSec` está nos dados.

---

## Segunda ronda (2026-11-04, ramo `vii-a-r2`): CP-F na pausa, fogo de supressão das MG34 e duração robusta

Ramo `vii-a-r2`, de `57ba50f3` (o tronco do pacote 1). As três decisões do Capitão desta ronda são **reversíveis**: estão registadas em `act.json` (`note` do CP-E e do CP-F, `fire.suppress.note`, `h_np_suppress`, `echelonsNote`) e aqui. **Não publicado, sem playtest, sem `npm test` completo: nada disto está VALIDADO em jogo.** Os atos novos continuam desligados (`acts.enabled=false`; `?act=vii-a` ou `?acts=1`). O ato atual (04:30-07:05) não mudou: nenhum ficheiro que o golden da emenda 20 fixa foi tocado (`git diff 57ba50f3 --stat` na tabela de comandos).

### Decisão 1 · CP-F na pausa

- Segundo checkpoint, **«CP-F · Perímetro norte — pausa»** (`cp_np_f_pausa`), guardado **no fim do tique em que a 1.ª vaga quebra** (o assalto começa a recuar; a pausa de 40 s conta-se a partir de o último atacante ter saído do campo). É dado: `checkpoints` do ato e a chave nova, opcional, `checkpoint` do escalão (`echelons[0]`, a 2.ª vaga: «o checkpoint que se guarda quando a vaga anterior quebra»). A fábrica valida-a (id `cp_…`, sem repetir) e `areaActPlan` exige que seja um checkpoint do ato e não o da chegada.
- Só se guarda com o jogador vivo, dentro dos limites (um contador de «fora da área» em marcha acabaria a vida restaurada de imediato) e sem cartão; se não puder nesse tique, tenta nos seguintes enquanto a 2.ª vaga não entra. `hpOnCheckpoint` aplica-se como nos outros checkpoints: soldado e veterano voltam a 100 de vida ao guardar; recruta fica como está.
- **Caminho do jogo: o do CP-E, sem tocar em `game.js`.** `saveCheckpoint` emite `checkpoint`; o jogo guarda `acts.envelope(sim)` (envelope de esquema 3, `actSave` = o checkpoint) e mostra o cartão «CP-F · Perímetro norte — pausa · <nível>». Morrer na 2.ª vaga repõe o CP-F (relógio de volta à pausa, a 1.ª vaga a recuar, a 2.ª outra vez à espera na linha das árvores); morrer na 1.ª repõe o CP-E.
- Um save da pausa de antes deste ramo (só CP-E) carrega e guarda o CP-F no tique seguinte (testado). Reverter: apagar o checkpoint e a chave `checkpoint` da 2.ª vaga.

### Decisão 2 · Fogo de supressão das MG34 (GAMEPLAY_DRAMATIZATION)

- **Memória.** Cada MG34 guarda onde viu o último clarão: `actor.ai.seen = {x, y, z, at, who}` (os pés do atirador, quando, quem). Actualiza-se (`noteFlash`) quando um polaco (fuzileiro, Zieliński, Pawlak, Kowal, a ckm) ou o jogador dispara e a MG34 tem linha de vista, dentro do alcance (420 m): a de um homem de pé, olho a olho (o clarão vê-se por cima do parapeito); e quando ela própria dispara a alguém. Sem sorteios.
- **Fogo.** Sem alvo à vista e com o clarão a ≤ `memorySec` (30 s), a MG34 dispara uma rajada curta de 3-5 rondas **reais** (`makeRound`, `kind:'area'`, arco e tempo de voo, a dispersão da própria MG34) ao tronco de um homem de pé nesse sítio, a cada 4-8 s. **Presa ao solo** (suprimida pela linha) dispara às cegas, a coberto, com a pausa ×2 (8-16 s); antes ficava calada. Só sorteia do fluxo próprio do homem. Quando não está presa levanta-se para disparar (como nas rajadas apontadas) e a linha pode matá-la.
- **Só atinge o que as rondas atravessam** (`traceRound`: parapeito, terra, o ar por cima dele, quem estiver no caminho) e pela **mesma tabela D35** (probabilidade exposto/abrigado, dano, limite de uma ferida por rajada em soldado/veterano, supressão a 3 m). Testado: uma rajada sobre um sítio vazio não fere nem prende ninguém; sobre um homem de pé a céu aberto fere-o uma vez (o limite do nível), pelo dano do nível. O `playerWeight` e a dispersão reduzida de `aimErrorScale` só valem para o fogo apontado ao jogador, não para este.
- Dados: `grp_np_de.assault.fire.suppress` (`weapon`, `memorySec`, `rounds`, `pauseSec`, `pinnedPauseFactor`), validado pela fábrica (chave desconhecida, arma, tamanho da rajada ≤ a rajada apontada, pausas). Sem a chave, as MG34 comportam-se como antes. Reverter: apagar `suppress`.
- Medido (rajadas das MG34 desde a quebra da 1.ª vaga até à entrada da 2.ª; piloto ativo em recruta e soldado × 15 sementes, os 24 percursos sem mortes; passivo, 15): ativo, antes **média 1,8** (mediana 2; 6 de 24 sem nenhuma), depois **média 5,7** (mediana 5; 2 de 24 sem nenhuma; 4,7 delas de supressão); passivo, antes média 4,1 (mediana 3), depois **8,6** (mediana 9). Há 1,7 MG34 vivas (de 2) no começo da pausa e 1,1 no fim: a que se levanta para disparar é por vezes morta pela linha; os dois percursos sem rajadas (semente 5) já não tinham nenhuma.

### Decisão 3 · Duração robusta (dados, sem código)

Alvo: piloto ativo **≥ 110 s** da entrada da vaga ao fim da luta em **≥ 90 %** de 15 sementes × 3 níveis (as 3 do golden — 19390901, 3, 7 — mais 12: 1, 2, 4, 5, 6, 8…14; as do revisor não estão documentadas), e piloto passivo com o ato acabado em **≤ 6 min**. Dados de `grp_np_de.assault` (`act.json`):

| campo | antes (`57ba50f3`) | depois |
|---|---|---|
| pausa entre as vagas (`lullSec`; `evt_np_wave_2`; textos) | 30 s | **40 s** |
| 2.ª vaga, entrada (`delaySec` das faixas) | 4 colunas escalonadas, 0-30 s | **2 grupos**: oeste (`far_west` 0-12 s, `west_mid` 6-18 s) e leste (`east_mid` 36-48 s, `far_east` 42-54 s) |
| 2.ª vaga, `breakOut` | 12 de 18 | **14** de 18 |
| relógio de cada vaga (`maxSec`) | 200 s / 200 s | **120 s / 120 s** (para o passivo acabar < 6 min; a 2.ª vaga do passivo quebra por relógio na maioria das sementes) |
| 1.ª vaga, `breakOut` | 7 de 13 | 7 (igual: ver abaixo) |

**Variantes medidas** (piloto ativo, recruta + soldado × 15 sementes = 30 percursos, salvo a base: 45; o resto igual à base):

| variante | mudança | ativo: mín. / ≥ 110 s | passivo: fim do ato máx. |
|---|---|---|---|
| base | `57ba50f3` + CP-F + supressão, dados antigos (3 níveis) | 97,4 s · 41/45 | 347,2 s (sem supressão) |
| V1 | pausa 40 s, 2 grupos, 1.ª vaga 8, 2.ª vaga 12, `maxSec` 2.ª 150 | 111,3 s · 30/30 | 345,6 s |
| V2 | V1 com 1.ª vaga 9, 2.ª vaga 13, `maxSec` 120/120 | 116,9 s · 30/30 | 299,6 s |
| V4 | V2 com os flancos primeiro e o centro depois | 112,9 s · 30/30 | — |
| **V5 (final)** | pausa 40 s, 2 grupos oeste/leste, 1.ª vaga 7, 2.ª vaga 14, `maxSec` 120/120 | **120,7 s · 30/30** | **311,7 s** |

A 1.ª vaga ficou em 7: com 9 caídos (V2) **não sobrava ninguém da sua assalto para recuar** em 5 de 15 percursos (média 0,8 homens; com 7: 2,5; com 8: 1,6) e o «Estão a recuar!» seria dito sobre um campo vazio. A memória do clarão não influi (20, 30 e 40 s deram percursos idênticos: o clarão renova-se enquanto a linha dispara, ou a MG34 morre antes). Escolheu-se o pareamento oeste/leste e não flancos/centro por o piso ser mais alto (2.ª vaga com no mínimo 49 s contra 42,6 s).

### Durações: 15 sementes × 3 níveis (piloto ativo) e 15 sementes (passivo)

«Luta» = da entrada da vaga (`timers.wave.at`) ao fim da luta (todos fora do campo): o relógio da última vida (uma morte repõe o CP-E ou o CP-F e o relógio com ela). Todos os tempos em segundos, mesmo piloto e 50 ms por tique, gerados por `tools/verification/m01-act-vii-a-duration-sweep.mjs --audit` (os pilotos não são jogadores). Entre parênteses, as mortes do percurso (cada uma repõe o último checkpoint: a luta contada é a da última vida).

**Antes** (medido nesta ronda em `57ba50f3`, as mesmas sementes e níveis): ativo mín. 93,2 s, p10 110,6 s, mediana 140,1 s, máx. 259,9 s, **≥ 110 s em 41/45 (91,1 %)**; passivo luta 196,4-324,7 s, o ato acaba no máximo aos 347,2 s (12,8 s de folga). **Depois** (dados desta ronda, piloto ativo):

| semente | recruta | soldado | veterano |
|---|---:|---:|---:|
| 19390901 | 139,6 | 159,9 (1 m.) | 218,8 (6 m.) |
| 3 | 142,4 | 160,6 | 155,1 (1 m.) |
| 7 | 131,9 | 147,7 (1 m.) | 230,0 (8 m.) |
| 1 | 138,3 | 144,3 | 140,9 (1 m.) |
| 2 | 143,2 | 169,6 (1 m.) | 159,5 (1 m.) |
| 4 | 120,7 | 134,1 | 225,3 (4 m.) |
| 5 | 143,0 | 157,8 | 160,0 (2 m.) |
| 6 | 134,1 | 130,1 (1 m.) | 169,0 (5 m.) |
| 8 | 142,9 | 254,2 (5 m.) | 252,2 (9 m.) |
| 9 | 134,0 | 129,2 | 157,0 (1 m.) |
| 10 | 144,4 | 226,5 (3 m.) | 220,7 (7 m.) |
| 11 | 163,5 | 147,6 | 228,8 (6 m.) |
| 12 | 193,5 | 158,3 | 230,2 (8 m.) |
| 13 | 160,9 | 155,2 | 244,8 (11 m.) |
| 14 | 140,8 | 143,4 | 219,3 (5 m.) |

- **recruta**: 15 percursos, luta 120,7-193,5 s (mediana 142,4), ≥ 110 s em **15/15**, 0 mortes, o ato acaba (relógio) no máximo aos 216,0 s.
- **soldado**: 15 percursos, luta 129,2-254,2 s (mediana 155,2), ≥ 110 s em **15/15**, 12 mortes, o ato acaba (relógio) no máximo aos 276,7 s.
- **veterano**: 15 percursos, luta 140,9-252,2 s (mediana 219,3), ≥ 110 s em **15/15**, 75 mortes, o ato acaba (relógio) no máximo aos 274,7 s.
- **Todos**: 45 percursos, mín. **120,7 s**, p10 134,0 s, mediana 157,0 s, máx. 254,2 s; **≥ 110 s em 45/45 (100,0 %)**.
- Auditorias dos mesmos percursos: **0 atravessamentos de sólidos, 0 pares empilhados**.

Passivo (nível recruta; em veterano os 15 percursos saíram iguais em todas as colunas):

| semente | repelido | o ato acaba | 1.ª vaga | pausa + recuo | 2.ª vaga | caídos alemães | polacos mortos |
|---|---:|---:|---:|---:|---:|---:|---:|
| 19390901 | 261,3 | 283,9 | 49,3 | 60,4 | 120,0 | 21 | 7 |
| 3 | 221,3 | 243,8 | 35,7 | 64,8 | 109,3 | 28 | 5 |
| 7 | 263,1 | 285,7 | 61,2 | 45,9 | 120,0 | 24 | 5 |
| 1 | 235,8 | 258,4 | 33,7 | 46,2 | 120,0 | 20 | 5 |
| 2 | 260,6 | 283,2 | 38,1 | 66,5 | 120,0 | 16 | 7 |
| 4 | 246,5 | 269,1 | 46,0 | 48,9 | 120,0 | 23 | 5 |
| 5 | 270,1 | 292,7 | 61,8 | 61,0 | 120,0 | 23 | 5 |
| 6 | 259,2 | 281,7 | 40,6 | 67,4 | 120,0 | 23 | 4 |
| 8 | 262,2 | 284,8 | 57,1 | 49,1 | 120,0 | 18 | 5 |
| 9 | 211,7 | 234,3 | 32,0 | 50,6 | 116,6 | 29 | 4 |
| 10 | 251,0 | 273,5 | 48,3 | 56,4 | 120,0 | 23 | 7 |
| 11 | 245,1 | 267,7 | 39,7 | 49,5 | 120,0 | 25 | 6 |
| 12 | 250,1 | 272,7 | 32,7 | 61,5 | 120,0 | 23 | 5 |
| 13 | 289,2 | 311,7 | 62,1 | 71,2 | 120,0 | 22 | 6 |
| 14 | 250,3 | 272,9 | 29,4 | 65,0 | 120,0 | 17 | 7 |

Passivo: luta 211,7-289,2 s, o ato acaba **no máximo aos 311,7 s** (limite 360 s; antes 347,2 s), a 2.ª vaga quebra pelo relógio (120,0 s) em 13 de 15 sementes; 0 atravessamentos e 0 empilhados.

**Sementes de controlo 101-120** (nunca vistas na afinação), piloto ativo × 3 níveis: **60/60 percursos ≥ 110 s** (mín. 113,8 s, p10 126,9 s, mediana 154,7 s, máx. 243,6 s; recruta: 114,4-174,2 s (20/20 ≥ 110 s, 0 mortes); soldado: 113,8-206,1 s (20/20 ≥ 110 s, 3 mortes); veterano: 128,8-243,6 s (20/20 ≥ 110 s, 80 mortes)). O piso é mais baixo (113,8 s contra 120,7 s) mas não cai abaixo do limiar. É controlo do piloto, não prova de jogo.


### Saves (esquema 2 mantido)

- `AREA_SAVE_SCHEMA` continua **2** e o envelope **3**. Estado novo, todo opcional: `checkpointsReached` com `cp_np_f_pausa` e `ai.seen` nas MG34. Saves escritos por `57ba50f3` carregam sem migração (testado com um da pausa, sem CP-F nem `seen`). Um save deste ramo recusa-se numa build antiga (`checkpoints` desconhecido): só afeta saves de QA.
- Validação nova (`validateAreaSnapshot`, `validGermanAi`): `ai` de cada alemão (`rng` inteiro de 32 bits; `seen` só numa arma de `fire.suppress`, com as 5 chaves, número finito, `at` ≤ relógio, dentro da área ± 30 m e de um polaco ou do jogador), `checkpointsReached` sem repetidos e **o checkpoint da pausa só existe com a quebra da vaga anterior registada**. 13 adulterações de `ai` e 5 de `checkpointsReached` (CP-F sem a quebra anterior, repetidos) recusadas com mensagem, além das que já havia.
- Um save no CP-F valida (`validApproachWave` e `validateAreaSnapshot`, também como `resumeCheckpoint`) e **restaura com o mesmo futuro tique a tique** (1200 tiques, eventos incluídos): o envelope aberto pelo `runner`, aberto outra vez, e a simulação a repor o seu próprio checkpoint depois de 300 tiques (o caminho da morte) dão três futuros idênticos. 36 KB.

### Comandos e resultados reais

Sem `npm test` completo (pedido: só os focados). Árvore final, sem repetir suites no mesmo SHA; tempos com a máquina partilhada (carga 7-10 em 4 núcleos).

| Comando | Resultado |
|---|---|
| `node --test tests/m01-acts.test.js tests/m01-act-vii-a.test.js tests/m01-simulation-boundary.test.js` | **34/34** (17 + 15 + 2; 740 s no total com a máquina partilhada). `m01-acts`: envelopes, CP-F (guardado, válido, restaurado igual tique a tique, morte na 2.ª vaga → CP-F, adulterações, save antigo da pausa), registo `ai` dos alemães, save/restauro nos quatro pontos da luta. `m01-act-vii-a`: dados (CP-F, `suppress`, dois grupos), 30 casos de erro da fábrica (10 novos: `suppress` e `checkpoint`), guarda histórica, **as 18 rotas** (CP-F no tique da quebra, ≥ 110 s, 0 atravessamentos, 0 empilhados, o apoio dispara na pausa), fogo de supressão (cadência, metade preso, esquecimento, só atinge o que atravessa, tabela do nível), clarão, morte/checkpoint, golden. |
| `node --test tests/m01-act-vii-a-seeds.test.js` | **2/2** (336 s): ativo, soldado, 15 sementes, ≥ 110 s em 15/15 (mín. 129,2 s); passivo nas 5 sementes mais lentas, o ato acaba até aos 311,7 s. |
| `node --test tests/m01-area-visual.test.js` | 6/6 (o único outro ficheiro de `tests/` que lê `m01-area-sim.js`). |
| `node tools/verification/m01-act-vii-a-golden.mjs --write` e depois sem `--write` | escrito; **`check: identical`** (a fixture passou a ter `checkpoints` por rota; mudaram os `sha256` das entradas e os percursos). |
| `node tools/verification/m01-act-vii-a-duration-sweep.mjs --mode active --audit` | 45 percursos (15 sementes × 3 níveis): **45/45 ≥ 110 s**, mín. 120,7 s; **0 atravessamentos, 0 empilhados**. |
| `... --mode passive --levels recruta --audit` | 15 percursos: luta 211,7-289,2 s, o ato acaba até aos **311,7 s**; 0 atravessamentos, 0 empilhados. |
| `... --mode active --set held20` | 60 percursos (sementes 101-120 × 3 níveis): **60/60 ≥ 110 s**, mín. 113,8 s. |
| `git diff 57ba50f3 --stat` sobre as entradas fixadas pelo golden do ato atual (`m01-simulation.js`, `mission.json`, `map-layout.json`, `m01-squad/rearguard/deck-assault/section/barks/opening/pacing/animation-presentation/fire/aim.js`, `tczew-world.js`, `spatial.js`, `m01-navigation.js`, `tests/helpers/m01-route.js`), `src/render`, `src/ui` e `game.js` | **vazio** (não se correu a auditoria da emenda 20: nenhuma das suas entradas mudou). |
| `npm run build` | OK (10 s). |
| `CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test tests/browser/m01-act-vii-a.spec.js` (numa porta própria, 4199, porque a 4173 estava ocupada por outro agente) | **5/5** (16,1 min; build de produção, Chromium/SwiftShader, com a máquina a carga 10-16): arranque `?act=vii-a`; saves de esquema 3 (chegada, 1.ª vaga a norte, a oeste e para o destroço, pausa, 2.ª vaga, fim e debrief); **o jogo guarda o CP-F** quando a 1.ª vaga quebra (`localStorage` com CP-E + CP-F, cartão «CP-F · Perímetro norte — pausa · Recruta»); **uma morte na 2.ª vaga volta ao CP-F** («A retomar em CP-F · Perímetro norte — pausa · Recruta», relógio de volta à pausa); transição a partir do ato atual. Sem erros de página. A 1.ª tentativa, com carga 16, falhou por tempo: a leitura do relógio do HUD antes de ele pintar e o limite de 10 min do caso das oito páginas; o `settle` espera agora pelo rótulo do ato e esse caso tem 25 min. |

Não corridos: `npm test` completo; os outros dois ficheiros de browser do VII-a (`m01-act-vii-a-actors`, `m01-act-vii-a-visual`); a auditoria da emenda 20 (46 min; as entradas do ato 1 não mudaram). Os PNG rastreados que o Playwright reescreve foram repostos com `git checkout`; ficam os dois JSON novos desta ronda: [`smoke-cpf-stored.json`](smoke-cpf-stored.json) (o jogo guardou `checkpointsReached` = CP-E + CP-F e `flag` = lull a 1 s da quebra) e [`smoke-cpf-death.json`](smoke-cpf-death.json) (a morte a 25 s da 2.ª vaga mostra «A retomar em CP-F · Perímetro norte — pausa · Recruta» e repõe o relógio da pausa).

### Riscos, decisões e o que não foi verificado

1. **Pilotos não são jogadores.** O ativo é um atirador a ritmo humano mas de pontaria quase perfeita a 220 m: **abate os homens da 2.ª vaga à medida que saem das árvores** (em `active/recruta/7` só 2 homens da 2.ª vaga chegaram a disparar; no passivo 17-18). A duração do piloto ativo vem em boa parte de a 2.ª vaga só ter de ser vencida até aos 14 caídos com os 8 homens do 2.º grupo a chegar 36-54 s depois do começo da vaga: um jogador humano vê um combate diferente. Sem playtest, sem FPS; golden só em x86_64.
2. **Afinação sobre as 15 sementes.** Os dados foram escolhidos a olhar para elas (sobretudo recruta e soldado). As 20 sementes 101-120, nunca vistas na afinação, são o controlo: os 60 percursos (3 níveis) deram **≥ 110 s** (mín. 113,8 s contra 120,7 s nas 15 do ajuste): fora das sementes ajustadas a margem é menor, mas o limiar aguenta.
3. **A pausa é mais ruidosa mas não sempre.** A MG34 que se levanta para disparar é por vezes morta pela linha polaca (1,7 vivas no começo da pausa, 1,1 no fim) e cada uma só dispara uma rajada a cada 4-8 s enquanto livre e com um clarão na memória (8-16 s presa). Se o proprietário quiser uma pausa sempre barulhenta, a alternativa é disparar **sempre às cegas a coberto** (uma linha em `areaBurst`: `a.crouched=true` e a mesma origem): as MG34 passariam a ser invulneráveis ao fogo da linha enquanto houvesse clarão para recordar. Não se fez: muda o equilíbrio do combate.
4. **O fogo de supressão fere o jogador** pela tabela D35 quando as rondas o atravessam: nas varreduras de afinação (V5, ativo, recruta + soldado, 30 percursos) foram 17 feridas de rondas `area` contra 91 de todas as outras (16 %); em veterano (duas feridas matam) não se mediu a parte das `area`. O jogador que dispara de pé do mesmo sítio recebe o fogo da MG34 4-8 s depois; mudar de posição ao longo do parapeito safa-o. A ckm, o clarão mais visível, também é prendida mais vezes: nas rotas de ouro dispara **6 rajadas no passivo (antes 11) e 5 no ativo (antes 10)**, e no passivo morrem **7 dos 7** fuzileiros da linha (antes 2; nas 15 sementes passivas morrem 4-7, antes 2-7): a linha polaca sofre mais, os essenciais (Zieliński, Pawlak, Kowal, ckm) ficam presos mas nunca morrem.
5. **CP-F em recruta guarda a vida como está** (como os outros checkpoints dessa dificuldade: `hpOnCheckpoint` nulo); um recruta com 3 de vida repõe o CP-F com 3 de vida. A pausa tem caixas de munições mas não cura.
6. **Janela antes do CP-F:** morrer na 1.ª vaga repete a 1.ª vaga (CP-E); o CP-F só existe depois da quebra. Um save antigo da pausa guarda o CP-F no tique seguinte (comportamento novo, testado).
7. **O relógio da 2.ª vaga (120 s) quebra-a sozinha** quando a linha não a vence (em 13 de 15 passivos): «os atacantes recuam exaustos». É dramatização como as vagas e a pausa (`h_np_echelons`).
8. **1.ª vaga a 7 e 2.ª a 14:** a 2.ª perde 14 de 18 homens antes de quebrar (78 %), a 1.ª 7 de 13 (54 %); números de jogo, não história (T08 não dá efetivos).
9. **Não vistas no ecrã:** as rajadas de supressão (rastreadoras, impactos no parapeito, som: usam os mesmos eventos `enemy-fire`/`round-impact` das outras rajadas; `kind:'area'` não é lido pelo renderer nem pelo áudio) nem a pausa mais barulhenta; o teste de browser só confirma estado, HUD e erros de página. As capturas `01-lull-overwatch-only.png` e `02-second-echelon.png` de cima não foram refeitas.
10. Os outros dois ficheiros de browser do VII-a (`m01-act-vii-a-actors`, `m01-act-vii-a-visual`) constroem saves com o mesmo piloto e **não foram corridos** nesta ronda.
