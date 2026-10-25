# Abertura 04:30–04:34: a vida do posto, o aviso das 04:31 e os aviões — 2026-10-25 (R1-b)

Ramo local `claude/exciting-bohr-k8v5xm-r1b` (de `77175d85`, a ponta da candidata #80 com as bombas R1-a, a secção polaca R2-a, a IA alemã R2-b e os sapadores R3-a). **Não publicada**, sem revisão crítica independente, **sem playtest humano**. Ordem do proprietário, item 4: «reconstruir a abertura da missão para transmitir que a guerra começa às 04:34»; pacote R1-b do Capitão (simulação + apresentação).

Resumo em quatro linhas. **(1)** Até à 1.ª bomba, os homens do posto deixam de ser uma fila de homens parados: cada um dos 20 homens do plano (11 do elenco, os 6 da guarnição, os 3 sapadores) é uma pequena máquina própria, de 30 actos possíveis, que muda de acto por si, pelo aviso das 04:31 e pelos aviões; a estafeta leva a palavra do sargento ao longo da linha pelo A* da simulação e os sapadores percorrem o cabo que ainda não foi cortado. **(2)** Às 04:31 a linha de Szymankowo fica muda (Pawlak), o sargento manda olhar a leste, a estafeta leva o alerta (cada homem que ela avisa fica logo em alerta) e, aos aviões, cada homem reage a seu tempo (olha para cima, aponta, ajoelha ou encolhe-se, a estafeta volta ao posto a correr, os sapadores voltam ao acampamento, Nowicki olha e aponta 5 s antes de correr). **(3)** O tempo até ao primeiro estímulo de combate que o jogador **vê** (bomba, baixa, tiro) **não mudou**: as âncoras históricas (04:34:00) são as mesmas; o que mudou é o que se vê e ouve antes (o 1.º sinal de guerra à vista aparece cerca de 18 s depois de o jogador ter o controlo; aos 17,8 s para quem entrega a mensagem logo). **(4)** As balas da retaguarda polaca e as rajadas do Kowal passam a dizer onde acabaram (`end` / `hit`, só apresentação) e o renderizador já as desenha; golden emenda 20.

## 1. O que a abertura era antes (medido em `77175d85`, 3 pilotos × 3 sementes)

- **Homens parados.** O pelotão de secção atrás dos sacos de areia numa só pose, os sapadores ajoelhados no chão a «picar» um cabo ainda inteiro, a guarnição de pé onde as bombas cairiam, a tripulação da ckm no clip do canhão; a única vida eram seis actores do pátio da estação (civis, a ~300 m, fora da rota de abertura) em ciclos fixos de 45 s.
- **Medido** (`metrics-before.jsonl`, `tools/verification/m01-opening-metrics.mjs`): actividades **distintas à vista** do jogador (dentro de 120 m, no campo de visão, com linha de vista), média por segundo / máximo / total em toda a abertura: **rápido** (intro saltada, corre ao posto avançado) 1,36 / 3 / 4; **apressado** (vê a intro, corre) 1,92 / 3 / 4; **turista** (vê a intro, o posto, o acampamento, espera os aviões) 1,89 / 6 / 8. A 60 m (em qualquer direcção): 2,4 / 5 / 6, 2,6 / 5 / 6, 3,2 / 6 / 9. Os rótulos eram os do estado: `stand`, `sapper_work`, `ckm_idle`, `rkm_stand`, `clean_rkm`.
- **Primeiro estímulo de combate à vista** (bomba cujo penacho o jogador vê, baixa que vê, tiro): **67,75 s** (rápido), **111,75 s** (apressado), **253,2 s** (turista) de tempo real desde o início da missão; os aviões ouvidos às 17,75 / 61,75 / 190 s. Nada que a guerra tivesse começado era visível antes da 1.ª bomba das 04:34:00 (âncora histórica).

## 2. O que mudou no jogo

Código: `src/game/m01-opening.js` (novo), `src/game/m01-simulation.js`, `src/game/m01-barks.js`, `src/game/game.js` (só o diagnóstico), `missions/m01-tczew/mission.json` (`openingLife`, três falas e duas chamadas), `src/render/m01-opening-pose.js`, `m01-opening-kit.js`, `m01-opening-ik.js` (novos) e `src/render/m01-characters.js`. Ferramentas em `tools/verification/` (métricas, pilotos, capturas no jogo, bancada de actos). Contrato: `missions/m01-tczew/ENGINE_CONTRACT.md` (R1-b).

### 2.1 Os dados (`mission.json` `openingLife`)

- **Por homem**, listas pesadas `[acto, peso, [mín, máx] s, opção]` para as três tensões: `calm` (até ao aviso do ferroviário, `evt_m01_railway_worker_report`, 04:31:00), `warned` (depois dele) e `planes` (de `evt_m01_planes_heard`, 04:33:10 ou a entrega da mensagem); a opção é `first` (o 1.º de cada tensão, antes dos outros), `afterLine` (só depois de Pawlak dar a linha por muda), `delivered` / `undelivered`. Validado ao carregar (`openingPlan`): acto desconhecido, acto de andar numa lista, peso ≤ 0, intervalo invertido, homem inexistente, evento inexistente, dois estafetas, três sapadores, `releaseAt` diferente do início do abrigo, tudo recusado com a razão.
- **Quem faz o quê** (peso entre parênteses onde importa): sargento Zieliński (mapa, binóculos; `order` depois da linha muda; `shout` e `look_up` aos aviões), Kowal (limpa a rkm; aos aviões ajoelha-se), Bąk (café, a verificar a espingarda), Pawlak (telefone de campanha; **a linha muda**), o voz do pelotão leste (cigarro), Nowicki (binóculos; café depois da entrega), Dudek (o saco de enfermeiro), Lipski (ajoelhado a olhar os carris), a tripulação da ckm (cabeça), o reserva da ckm (caixa de munições aberta, a contar carregadores), os seis da guarnição (binóculos, verificar espingarda, cigarro, café, munições, a estafeta `pl_west_1`), os três sapadores (percorrem o cabo).
- **Estafeta** (`courier`): `pl_west_1` (guarnição da faixa), 4,6 m/s (5,4 de regresso aos aviões); percurso **leste** (a 4–10 s do controlo: `pl_west_0` e `ckm_reserve`) e **oeste** (2–5 s depois da ordem do sargento: `pl_west_2` e `pl_west_3`); pára a ~2 m de cada um, dá-lhe a ordem (2,2–3,6 s) e o homem fica logo em alerta; volta ao posto **exactamente** (a 0,8 m o `moveActor` pára por desenho; o último metro é dela).
- **Sapadores** (`sappers`): Krawiec (medidor), `sapper_2` (rolo), `sapper_3` (vigia, ajoelhado com binóculos); descansam 12–26 s no acampamento, vão a uma das duas juntas do cabo (a 1,5 m/s), ajoelham-se e testam-na 8–14 s e voltam; aos aviões voltam ao acampamento a 2,8 m/s e ajoelham-se, e **às 04:33:30** (`releaseAt`) o abrigo de R1-a leva-os como antes.
- **Classificação**: `GAMEPLAY_DRAMATIZATION` / `RECONSTRUCTED` (que o posto estava em alerta e ocupado: HISTORICAL_RESEARCH.md §1-3 e o aviso de Szymankowo; cada acto, cada homem e cada minuto são dramatização). **Nenhum acto é um procedimento de demolição** (§79).

### 2.2 As máquinas (`src/game/m01-opening.js`)

- **Estado, nunca relógio de laço.** Cada homem guarda `actor.act` (`k`, `at`, `until`, `rng`, `n`, `b`, `tn`, `s`, `hx`, `hz`, mais `f`, `to`, `spd`, `w` quando servem); o registo de ninguém em particular é `timers.opening`. O acto dura um tempo tirado do fluxo **do próprio homem** (derivado do estado do fluxo principal, **lido e nunca sorteado**), o seguinte vem pelos pesos da tensão, nunca o mesmo duas vezes (salvo `brace` e `cover`) e a mudança de tensão é reconhecida depois de um atraso do homem (0,4–2,6 s; Nowicki 0–0,15 s). Provado por teste: o fluxo principal tem **0 sorteios e o mesmo estado** do 1.º tick às 04:33:50, o mesmo grão dá a mesma abertura e outro dá outra, e ninguém muda de acto no mesmo tick que um vizinho (mais do que uma vez).
- **A estafeta e os sapadores andam pelo `moveActor`** (o A* da simulação, `openingWalk` para os sapadores); os sapadores ficam **sempre ajoelhados quando parados** (o invariante de T38 que o teste de encenação verifica em 12 sementes).
- **O que não muda**: o evento das 04:34:00 (`closeOpening` no próprio `case E('bombing_0434')`) fecha o registo e todos os actos **sem mexer na postura** (ninguém se levanta nem se ajoelha pela 1.ª bomba); os 6 da guarnição estão **nos seus postos, ao bit**, de pé, como R1-a os encontrava (por isso eles não se ajoelham aos aviões: encolhem-se de pé); Nowicki chega ao ponto de reparo à mesma (0,75 m, mesma posição e rumo às 04:34:00).
- **Guarda do que já existia** (medido contra `77175d85`, rota de controlo, até 04:34:00): os únicos homens cujo estado difere são os do plano (`facing`, `crouched`, `x`, `z`, `target`, `state`); nenhum alemão, nenhum do pelotão leste, nenhum civil nem o jogador; o resto do estado e os eventos são idênticos (campos novos à parte).
- **O rosto**: o acto escreve o rosto quando o seu desejo muda (`act.w`), não todo o tick; o que vira um homem de fora (uma cena, um sistema depois, um teste) é respeitado.

### 2.3 Falas

Não se inventou fala onde existia uma: os aviões usam as 012, 013, 066 (Nowicki) e 067 (Zieliński) de sempre. Novas, só na cadeia do alerta (`opening`, gatilho novo do realizador): `dlg_m01_210` Pawlak «A linha de Szymankowo está muda, sargento.»; `dlg_m01_211` Zieliński «Olhos a leste. Quem tem binóculos, use-os.» (3,2–4,2 s depois, **depois da 210**: o intervalo de seguimento do realizador); `dlg_m01_212` o municiador da ckm «Fita conferida. Trezentos e trinta tiros.»; e as chamadas da estafeta `co_m01_opening_order` («Ordem do sargento: munição e armas, conferir já!», antes do aviso) e `co_m01_opening_alert` («Alerta a leste! Passem a palavra!», depois). **Polaco de autor IA a rever por falante nativo** (campo `note` de cada uma). Com o jogador no posto: ordem da estafeta aos 11,5 s, linha muda aos 18,6 s, ordem do sargento aos 22,4 s, alerta da estafeta aos 53,3 s (`tests/m01-opening.test.js`).

### 2.4 Estado e saves (schema 2 intacto)

`timers.opening` e `actor.act` são **opcionais, validados e ausentes** antes de R1-b e depois da 1.ª bomba; um save antigo carrega sem os inventar (a abertura começa no tick seguinte, só antes das 04:34), um save feito a meio de um acto continua **igual, tick a tick**, também depois de recarregar duas vezes (calma, estafeta a correr, estafeta a avisar, sapadores ajoelhados, aviso, aviões, estafeta a correr para casa), e um registo ou acto corrompido recusa-se inteiro (22 casos) sem tocar na simulação a que foi oferecido. Nenhum campo foi retirado.

### 2.5 Apresentação (só renderizador)

- **Clips**: só os da biblioteca T08 (nenhum novo): `standing_idle`, `_b`, `_c`, `crouched_idle`, `crouched_idle_b`, `call_out`, `fidget_check_rifle`, `sapper_work`, `rkm_clean`, `rkm_crouched_idle`.
- **Poses procedurais** (`m01-opening-pose.js` puro, `m01-opening-ik.js`): inclinação do tronco, cabeça e IK de dois ossos para os braços, aplicados **depois do IK dos pés** e desfeitos pelo `restoreIkPose` do frame seguinte (um homem sem acto fica byte a byte o que era: testado com a bancada de ossos reais). Binóculos aos olhos (cotovelos em baixo), cigarro que sobe à boca de vez em quando, caneca, mapa ao peito, telefone ao ouvido com a outra mão na caixa, a contar carregadores numa caixa aberta ao ventre, saco de enfermeiro, nota estendida, braço a apontar, cabeça para trás, encolhido a olhar para cima, a cabeça da tripulação da ckm a varrer a margem.
- **Adereços procedurais** (caixas e cilindros, sem ficheiro nem terceiros): binóculos, cigarro com brasa e fumo, caneca esmaltada, mapa, nota, telefone e auscultador, caixa de munições, saco de enfermeiro, medidor e rolo de cabo; cada um só existe nos homens cujo plano o usa e só se vê enquanto o acto o pede. **A espingarda só fica ao ombro** (a malha não se desenha) **enquanto as duas mãos trabalham** (binóculos, mapa, telefone, caixa, saco, cabo); com cigarro, caneca ou nota uma mão ainda a segura.
- **Custo**: o pose procedural só até 75 / 45 / 22 m (alta / média / baixa) e para 14 homens por frame, os mais próximos; os adereços não adicionam chamadas de desenho a quem não os mostra. Medido no teste de custo existente (`m01-render-perf`, `m01-frame-cost-allocation`), que passa.
- **Diagnóstico**: `gameDiagnostics().m01.opening` (tensão, estafeta, sapadores, o acto de cada homem) e, por soldado, `opening: {act, pose, props}`; as capturas registam-nos.

### 2.6 `end` / `hit` na retaguarda e no Kowal (item 3)

O `npc-shot` da retaguarda polaca (`rearguardShot`) leva agora onde a bala parou e se acertou (`end`: o ponto da trajectória ou 40 m depois do alemão; `hit`: a resposta do próprio traçado); as rajadas do Kowal (`kowalFire`, `squadCoverFire`) levam `end` 1,2 m depois do alemão à altura dos pés e `hit: false` (supressão sem rasto: ninguém é atingido; o ponto só dá a nuvem de poeira). **Só saída**: o traçado e a supressão já estavam feitos, nada lê estes campos; `tests/m01-combat-ai.test.js` prova que a luta é a mesma tick a tick com o ponto substituído, `tests/m01-rearguard.test.js` que `hit` é a resposta do traçado.

## 3. Medido (`metrics-after.jsonl`, `METRICS_SUMMARY.json`: 3 pilotos × 3 sementes)

| piloto | actividades distintas à vista (média / máx / total) antes → depois | a 60 m (média / máx / total) antes → depois | 1.º estímulo de combate à vista (s) | 1.º sinal de guerra à vista (s) |
|---|---|---|---|---|
| rápido | 1,36 / 3 / 4 → **1,94 / 9 / 19,7** | 2,41 / 5 / 6 → **4,31 / 14 / 26,3** | 67,75 → 67,75 | — → **17,8** (os aviões: entrega a mensagem aos 17,75 s) |
| apressado | 1,92 / 3 / 4 → **3,76 / 10 / 23,7** | 2,61 / 5 / 6 → **6,03 / 14 / 29** | 111,75 → 111,75 | — → **61,8** (os aviões, entregues aos 61,75 s) |
| turista | 1,89 / 6 / 8 → **3,91 / 10 / 29,7** | 3,21 / 6 / 9 → **7,04 / 13 / 34,3** | 253,2 → 253,2 | — → **61,7** (a linha muda de Pawlak, a 8 m, **17,7 s depois do controlo**; a estafeta com a ordem à vista aos 70,1 s) |

- **Leitura honesta.** O «1.º sinal de guerra» é um homem à vista (a menos de 120 m, no campo de visão, com linha de vista) a mostrar um acto que só existe como reacção ao aviso das 04:31 ou aos aviões (linha muda, ordem, olhar para cima, apontar, gritar, encolher-se, ajoelhar). **O primeiro estímulo de combate (bomba, baixa, tiro) é o de antes**, porque as âncoras históricas não se mexem (a 1.ª bomba é às 04:34:00 e os aviões só se ouvem às 04:33:10 ou na entrega da mensagem). **O critério «o jogador percebe em 60 s que a guerra começa»**: cumpre-se para o piloto rápido (17,8 s); para quem vê a cena de abertura (44 s, não interactiva) o sinal vem **61,7–61,8 s depois do início da missão, 1,7–1,8 s acima dos 60 s contados desde o primeiro quadro, e 17,7–17,8 s depois de ter o controlo**: o aviso das 04:31:00 é uma âncora histórica e cai 16 s depois do controlo, e o primeiro homem em alerta a ser visto reage 1,7 s depois. Não se encurtou nada sem mexer nas horas.
- A média baixa do piloto rápido (1,94) é a rota: corre para leste e deixa o posto atrás; o máximo (9) é o que vê quando passa pelo posto e pelo acampamento.
- Uma contagem por rótulo de acto **não é percepção**: não substitui um playtest.

## 4. Capturas no jogo (`captures-before/`, `captures-after/`: o piloto `witness`, o jogador onde ele estava, três frames renderizados, SwiftShader: pixels, nunca FPS)

TODO_CAPTURES

## 5. Bancada de actos (`acts/`: o renderizador real, os clips reais, um homem por imagem a 3 m)

Dezasseis imagens (`tools/verification/m01-opening-r1b-fixture-capture.mjs`, a página `m01-opening-r1b-fixture.html`: o `M01Characters` verdadeiro, os clips T08 verdadeiros, o acto posto à mão em `actor.act` (clone de um actor de uma `M01Simulation` verdadeira) com a forma exacta do que a simulação escreve, um homem de cada vez a 3 m, de frente, SwiftShader; o `report.json` guarda o diagnóstico de cada frame). Vistas uma a uma; **o que cada uma mostra, e o que não mostra bem**:

| imagem | homem | o que se vê |
|---|---|---|
| `binoculars-front.png` | `pl_west_2` | binóculos pretos aos olhos com as duas mãos, cotovelos para baixo; a espingarda não se desenha (as duas mãos trabalham) |
| `smoke-a-front.png` | `east_platoon_voice` | cigarro com a ponta vermelha na mão esquerda à altura do peito, cabeça virada de lado, espingarda baixa na outra mão; a ponta do cigarro é pequena |
| `coffee-b-front.png` | Bąk | caneca esmaltada branca na mão esquerda à altura do peito, espingarda baixa na outra |
| `map-front.png` | Zieliński | folha de mapa aberta nas duas mãos diante do peito, cabeça inclinada sobre ela; lê-se como papel branco |
| `phone-front.png` | Pawlak | auscultador (pequeno, preto) junto à orelha esquerda, a outra mão na caixa verde do telefone de campanha à altura do ventre |
| `ammo-front.png` | `pl_west_0` | caixa de munições aberta, de madeira, segura ao ventre com as duas mãos, cabeça baixa sobre ela; os carregadores lêem-se como blocos escuros na caixa |
| `aid-front.png` | Dudek | cabeça baixa, mãos juntas à cintura (a «verificar o material») e o saco do enfermeiro ao quadril; **é o acto que menos se lê**: sem o saco à vista não se distingue de um homem a olhar para as mãos |
| `track-front.png` | Lipski | ajoelhado, cabeça e tronco inclinados para a frente, uma mão a tocar no chão; visto de frente e de cima lê-se como «ajoelhado a olhar para baixo» |
| `inspect-front.png` | chefe dos sapadores (Krawiec) | ajoelhado no clip `sapper_work`, cabeça baixa sobre o medidor (corpo verde, lâmpada âmbar, antena) segurado junto ao joelho; adereço sem pose procedural |
| `hold-front.png` | ajudante (`sapper_2`) | ajoelhado em `crouched_idle_b`, o rolo de cabo preto nas duas mãos à altura do joelho; adereço sem pose procedural |
| `cover-front.png` | Bąk | ajoelhado, espingarda vertical nas duas mãos, olhar para a frente (o `cover` dos aviões) |
| `brace-front.png` | `pl_west_4` | de pé, tronco inclinado para a frente e cabeça baixa, a espingarda cruzada: o encolher-se dos aviões |
| `lookup-front.png` | `pl_west_3` | cabeça atirada para trás a olhar para o céu, a espingarda à cintura com as duas mãos |
| `point-front.png` | `pl_west_3` | braço direito levantado e dobrado, a mão fechada em arco no alto: lê-se como «aponta para cima», sem o indicador estendido (o dedo não se move: só a mão e o antebraço) |
| `shout-front.png` | Zieliński | o clip `call_out` da biblioteca T08, sem pose procedural: mão direita levada à pala do capacete, cabeça virada; **lê-se como «proteger os olhos para ver os aviões», não como uma boca aberta a gritar** (não há animação de boca; o grito é a fala) |
| `deliver-front.png` | a estafeta (`pl_west_1`) | braço esquerdo estendido com uma folha branca (a ordem do sargento) para quem a recebe |

O que **não** se prova aqui: que se leiam ao amanhecer a 10–20 m, onde a luz azul e as silhuetas escuras tiram os pormenores (capturas no jogo, §4); só que a pose e o adereço estão certos de perto e que cada osso volta ao que era quando o acto acaba (teste `m01-opening-pose`).

## 6. Testes executados

TODO_TESTS

## 7. Golden emenda 20 (`GOLDEN_AMENDMENT_20.json`, `tests/fixtures/m01-opening-gameplay-baseline.json`)

TODO_AUDIT

## 8. Riscos e incertezas

- **Sem playtest humano**; as capturas são do amanhecer escuro e a 6–40 m os homens são silhuetas: os actos pequenos (café, cigarro, binóculos) lêem-se de perto, as grandes mudanças (ajoelhar, correr, caminhar, mapa aberto) de longe.
- **Falas novas em polaco de autor IA** (cinco), por rever por falante nativo; a sequência da cadeia do alerta depende dos intervalos do realizador (documentado e testado).
- **Adereços procedurais** (caixas e cilindros) em vez de activos autorais: legíveis, mas provisórios.
- **A tripulação da ckm só mexe a cabeça** (os clips dela estão ligados à animação do canhão) e a guarnição de seis **não se ajoelha** aos aviões (paridade das baixas de R1-a): encolhe-se de pé.
- O primeiro estímulo de combate **não pode** ser mais cedo sem mexer nas horas históricas (04:34:00); o que se ganhou é o que se vê e ouve antes.
- Um save de R1-b não carrega numa árvore anterior (chaves novas); o contrário (save antigo na nova árvore) sim.

## 9. Como reproduzir

```
node tools/verification/m01-opening-metrics.mjs --label after --seeds 19390901,1,2 --jsonl <ficheiro>      # e --rev 77175d85 --label before
npm run build && CHROME_EXECUTABLE=/opt/pw-browsers/chromium OPENING_OUT=<pasta> npx playwright test -c tools/verification/playwright.opening-r1b.config.js
CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-opening-r1b-fixture-capture.mjs <pasta> [--only binoculars,smoke] [--views front,side]
node tools/verification/m01-integration-golden-audit.mjs --amendment 20          # confere; --write regenera (x86)
node --test tests/m01-opening.test.js tests/m01-opening-pose.test.js
```
