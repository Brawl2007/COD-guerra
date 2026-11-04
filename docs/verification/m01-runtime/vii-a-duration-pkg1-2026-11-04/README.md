# VII-a · duração do combate (pacote 1): segunda vaga depois de uma pausa — 2026-11-04

Ramo `pkg1-duration` (de `b41d947d`). O commit `2696ed01` (trabalho recuperado depois de um reinício do contentor, sem verificação) foi lido, verificado e completado neste commit. **Não publicado, sem playtest humano, sem revisão crítica independente: nada disto está VALIDADO em jogo.** Os atos novos continuam desligados (`acts.enabled=false`): só se vê com `?act=vii-a` ou `?acts=1`. O ato atual (04:30-07:05) não mudou (ver «Comandos»). Ver o ato: `npm run dev` e `/COD-guerra/?act=vii-a` (README do INC-1).

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
| `node --test tests/m01-act-vii-a.test.js` | **10/10** (4 min): dados (31 alemães, 2 vagas, pausa 30 s, caminhos livres de terra/destroço/parapeito), 18 casos de erro da fábrica, guarda histórica (as duas vagas são dramatização), mundo da área, auditoria barata = completa, **as 18 rotas** (todas completam, 0 atravessamentos, 0 empilhados, vaga ≥ 120 s com os dois pilotos, passivo ≤ 360 s, 2.ª vaga ≥ 40 s e ≥ 8 dos seus homens a disparar, apoio parado na pausa, `flag` sempre coerente com o registo, entradas pelo `delaySec`, estado na linha de estado), pausa e reabastecimento, falas pela ordem da história, morte e CP-E na 1.ª e na 2.ª vaga, golden. |
| `node --test tests/m01-acts.test.js` | **12/12** (1 min 53 s): fábricas ≡ `SQUAD`/`REARGUARD`; esquema 2 do ato atual intacto; esquema 3: restauro idêntico tick a tick (1200 ticks, eventos incluídos) na 1.ª vaga, na pausa, a meio da 2.ª vaga e no último recuo; envelopes adulterados (19, mais um esquema 1 e um save de área sem envelope, que nunca abre o ato atual); registo da vaga adulterado na pausa (26) e a meio da 2.ª vaga (26); o validador aceita todos os estados de 3 percursos; cadeia de atos; fronteira sem renderer/UI/DOM/relógio. |
| `node tools/verification/m01-act-vii-a-golden.mjs` | `check: identical` (a fixture foi regenerada com `--write`: na WIP, e neste commit só mudou o `sha256` de `m01-act-factories.js`; os resumos por segundo ficaram iguais). |
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

Resumo: **ativo 127,9-212,9 s** de luta (antes, na rota de ouro: 40,1 s; agora 134,3 s); **passivo 223,2-258,4 s** (antes: 81,1 s; agora 223,2 s), ato completo em ≤ 280,9 s (4,7 min; o teste exige ≤ 360 s). 0 atravessamentos de sólidos, 0 homens empilhados em todos. O apoio disparou 0-6 vezes na pausa (média de ~2): ver riscos.

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
