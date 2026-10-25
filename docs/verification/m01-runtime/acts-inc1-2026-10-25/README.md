# M01 R4 INC-1: condutor de atos e Ato VII-a «Perímetro norte, manhã» — 2026-10-25

Ramo local `claude/exciting-bohr-k8v5xm-r4inc1` (de `1d201f43`, ponta da candidata #80 com R1-b). **Não publicado**, sem revisão crítica independente, **sem playtest humano**. Plano: `docs/direction/M01_R4_EXPANSION_PLAN.md` §3.4 (INC-1 = WP-0 + WP-1), opção B do proprietário. **O jogo distribuído não muda:** `missions/m01-tczew/acts.json` tem `enabled: false`.

## Como jogar (QA)

```bash
npm ci && npm run dev            # http://127.0.0.1:5173/COD-guerra/
```

| URL | O que faz |
|---|---|
| `/COD-guerra/` | O jogo de sempre (sem atos novos, saves de esquema 2, debrief às 07:05). |
| `/COD-guerra/?act=vii-a` | Liga os atos nesta página e **começa diretamente no Ato VII-a** (o menu diz «QA · Ato VII-a»). |
| `/COD-guerra/?acts=1` | Liga os atos nesta página: a missão começa às 04:30 e, **depois da chamada no abrigo**, em vez do debrief aparece o cartão de transição e o Ato VII-a; o debrief vem no fim do VII-a. «Continuar» abre o save mais recente (esquema 3 do VII-a, ou o de esquema 2 do ato atual; um save de esquema 2 já concluído abre o VII-a). |
| `?acts=0` | Força desligado (o mesmo que sem parâmetro). |

Com `?debug=1`, `window.gameDiagnostics().m01.act` diz o ato ativo. Os saves do VII-a vivem noutra chave (`cod-guerra:checkpoint:m01:acts:v3`): a chave de esquema 2 nunca é escrita por eles e uma versão com o interruptor desligado nunca os lê.

## O que é jogável

Cartão de entrada (9 s, Espaço salta) → o jogador chega pelo sul a 80 m da linha com Zieliński, Pawlak e Kowal (os lanços de Pawlak e Kowal usam a fábrica do squad) → objetivo «Junte-se à secção no parapeito norte» (marcador) → **CP-E** no fim do cartão → a vaga alemã retoma o avanço quando o jogador chega ao parapeito (ou ~65 s depois do cartão): duas MG34 e dois atiradores de apoio na orla (z ≈ −1320), nove homens em três faixas que avançam por lanços de 22–24 m entre montes de terra, ajoelham-se atrás deles, levantam-se para disparar, apertam até ~50 m, e recuam pelo próprio caminho quando as baixas (7), a supressão média (75 s) ou o relógio (200 s) os quebram → a linha polaca (7 fuzileiros da companhia, nomes genéricos), Zieliński, Pawlak, o rkm do Kowal (rajadas de 3–5, carregador real) e a ckm wz.30 (fita, rajadas de 8 com plano de rondas reais, «Fita nova!») respondem → «Repelidos. Por agora.» → cartão de fim → debrief com o parágrafo novo `db_np_01` (T08/T16).

Tudo com fogo real: cada tiro alemão é uma ronda com arco e tempo de voo (`m01-fire` makeRound/traceRound), acerta no mundo, no jogador (tabela de dificuldade D35: probabilidade exposto/abrigado, dano, limite por rajada), num homem da linha (pode morrer) ou suprime (≤ 3 m); os nomes da secção e a guarnição da ckm só são suprimidos (o enredo precisa deles). Os tiros polacos são raios com dispersão em milésimos (modelo da retaguarda), dano por parte, supressão a 3 m. Granadas do jogador, recarga, alça, caixas de munições (E reabastece até 40).

## Arquitetura (WP-0)

| Ficheiro | Papel |
|---|---|
| `missions/m01-tczew/acts.json` | Tabela de atos e interruptor (`enabled:false`). **Desvio ao plano:** o plano pedia o bloco em `mission.json`, mas `mission.json` é entrada fixada por sha256 no golden da emenda 20 (`tests/fixtures/m01-opening-gameplay-baseline.json` `inputsSha256`; `tests/m01-animation-contract.test.js` linha 764): mudar um byte quebrava o `check: identical`. |
| `src/game/m01-acts.js` | `M01ActRunner`: cria a simulação inicial (desligado: `new M01Simulation()` como sempre), `next/enter` (transição), `envelope` (esquema 2 = o próprio `sim.checkpoint`; esquema 3 = `{schema:3, missionId, act, carry, actSave}`), `load` (despacha por `schema` **antes** de qualquer simulação: o texto de esquema 2 vai, intacto, para `M01Simulation.loadCheckpoint`). `carryFrom` puro (nível, eventos consumidos, flags `m01.*`, munição, semente derivada sem consumir o RNG). |
| `src/game/m01-act-factories.js` | Fábricas: `makeSquadPlan(BW_SQUAD_SPEC)` ≡ `SQUAD`, `makeLinePlan(definition)` ≡ `REARGUARD` (igualdade profunda e mesmas mensagens de erro), `squadStep` ≡ `updateSquad` (600 situações geradas), `makeApproachPlan` (o assalto do tabuleiro generalizado a uma linha de aproximação: mesmas fases e chaves do registo `deck`). Os módulos do ato atual (`m01-squad`, `m01-rearguard`, `m01-deck-assault`) **não mudam** (entradas fixadas no golden). |
| `src/world/m01-area-world.js` | `M01AreaWorld extends TczewWorld`: o mundo do ato atual (pontes como as demolições as deixaram) mais o parapeito, os montes de terra e o destroço; adereços do kit T12 (sacos, caixas, arame). `TczewWorld` não muda. |
| `src/game/m01-area-sim.js` | `M01AreaSimulation`: o mesmo contrato que o jogo/HUD/renderer/áudio leem; save `actSave` de esquema 1 validado (`validateAreaSnapshot`). Nenhuma importação de renderer/UI/DOM/relógio de parede (teste). |
| `src/game/game.js`, `src/main.js` | Só com o runner (interruptor ligado): transição em `complete`, save na chave nova, «Continuar». Desligado: as linhas de sempre. |
| `src/ui/m01-hud.js` | `actCardFrame` (cartões dos atos novos) e `sim.clockLabel` (só «MANHÃ · ~07:00», nunca hora exata). Cenas do ato atual iguais. |
| Renderer | `m01-terrain-envelope` (região da área → relevo plano), `m01-view` (reconstrói relevo/paisagem distante na mudança de área; `M01AreaDressing`: campo com o solo procedural, crateras, chamuscado, orla de árvores), `m01-characters` (`updateAreaCKM`: a ckm no ninho norte; o `updateCKM` do ato atual fica byte a byte), `m01-props-runtime` (capacidade cresce com o mundo maior), `m01-prop-layout` (`world.areaProps`). |

**Fatia NP:** x −620…−220, z −1350…−1050 (400 × 300 m), dentro de `north_perimeter`. **Desvio:** deslocada 80 m para leste do plano (x −700…−300) porque a silhueta da cidade da paisagem distante (`m01-far-landscape`, árvores a x ≤ −653) fica dentro da região protegida e a paisagem recusa construir-se (erro «Far bodies intersects protected participant envelope», visto no 1.º arranque). **Checkpoint:** a ordem fixou «CP-E»; o plano chamava CP-F à chegada (os nomes do plano deslizam uma letra). **Sem Bofors** (sem asset licenciado; o tiro AT das ~07:00 já aconteceu, o destroço arde).

## Enquadramento histórico (o que aparece como facto e o que não)

- `DOCUMENTED`, fonte única (T08, certeza BAIXA): ~07:00, ataque vindo do norte com veículos blindados; um veículo destruído por canhão AT; infantaria repelida por metralhadoras. No ecrã: «~07:00 … hora de fonte única (T08)», cartões, debrief.
- `GAMEPLAY_DRAMATIZATION`: a chegada da secção como reforço; o número de homens; os movimentos; a duração do ato; as falas (português, nomes de cena). `RECONSTRUCTED`: parapeito, ninho da ckm, montes de terra, crateras, sítio do destroço, orla de árvores.
- **Não inventado:** o veículo é uma caixa de casco genérica, sem torre, rodas nem lagartas visíveis, sem tipo; tropas «alemãs vindas do norte», sem insígnias SS (D-2 pendente); nenhuma hora exata no HUD (`clockLabel`). Um teste proíbe nomes de modelos de blindados, insígnias SS e armas proibidas nos dados da área.
- Cronologia: o cartão diz «manhã, pouco depois da chamada» e «o ataque de ~07:00 vindo do norte continua»; o relógio interno (07:05 em diante) só serve à luz e ao som.

## Testes (comandos e resultados reais)

| Comando | Resultado |
|---|---|
| `node --test tests/m01-acts.test.js` | 10/10: interruptor desligado e tabela válida; fábricas ≡ `SQUAD`/`REARGUARD`; `squadStep` ≡ `updateSquad` (600 casos); desligado = `M01Simulation` igual e `envelope === sim.checkpoint`; **esquema 2** (CP-A, estado corrente, veterano) carrega pelo runner (ligado e desligado) com estado igual ao de `loadCheckpoint` direto; **esquema 3 a meio da vaga** restaura igual e o futuro é igual tick a tick (1200 ticks, eventos incluídos); 14 envelopes adulterados recusados com mensagem; cadeia: rota de ouro do ato atual até ao fim → `carry` puro → VII-a no cartão com as pontes demolidas; save de esquema 2 concluído abre o VII-a; debrief = parágrafos do ato atual intactos + `db_np_01` depois de `db_03`; fronteira (sem renderer/UI/DOM/relógio). |
| `node --test tests/m01-act-vii-a.test.js` | 6/6: dados (400 × 300 m, dentro de `north_perimeter`, caminhos alemães livres de coberturas); guarda histórica; o mundo da área não muda nada do ato atual (adereços, obstáculos, relevo); **18 rotas** (piloto passivo e ativo × recruta/soldado/veterano × sementes 19390901/3/7) completam, **0 atravessamentos, 0 homens empilhados**, vaga ≥ 20 s (passivo) / ≥ 10 s (ativo), rondas reais, ckm a disparar; morte → CP-E; **golden do VII-a igual byte a byte**. |
| `node tools/verification/m01-act-vii-a-golden.mjs` | `check: identical` (fixture `tests/fixtures/m01-act-vii-a-gameplay-baseline.json`, escrita por `--write`, x86_64). |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 20` | **`check: identical`** (as duas rotas de ouro e as quatro de guarda; 0 atravessamentos, 0 empilhados; corrido sobre a árvore de `379f76bb`–`0507323f`, interruptor desligado). Nenhuma entrada fixada do ato atual mudou até ao fim: o diff de `1d201f43` ao HEAD sobre `m01-simulation.js`, `mission.json`, `map-layout.json`, `m01-squad/rearguard/deck-assault/section/barks/opening/pacing/animation-presentation/fire/aim.js`, `tczew-world.js`, `spatial.js`, `m01-navigation.js` e `tests/helpers/m01-route.js` é vazio. |
| `npm test` (completo, uma vez, em `34b2e8e0`) | **1794/1797**. 3 guardas de texto-fonte falharam: `m01-animation-resolver` (o «caminho dos atores» de `m01-characters.js` não pode ter `stopAllAction`: o método novo da ckm estava antes de `updateCKM`), `m01-audio-director` (conta 6 ganchos `audioDirector?.` em `game.js`: havia um 7.º) e `m01-terrain-material` (chama `syncSolids` numa vista falsa sem `syncAreaTerrain`). Corrigidas no commit final (método movido para depois de `get diagnostics`, `rebuildSounds()` na transição, chamada opcional). Os 7 ficheiros afetados (`m01-terrain-material`, `m01-animation-resolver`, `m01-audio-director`, `m01-soldier-visual-variation`, `game`, `m01-acts`, `m01-act-vii-a`) voltaram a correr: **106/106**. A suite completa **não** foi repetida no SHA final. |
| `npm run build` | OK. |
| `CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test tests/browser/m01-act-vii-a.spec.js` | 3/3 (build de produção, Chromium/SwiftShader, controlos e pointer lock reais; 0 erros de página): `?act=vii-a` arranca no cartão, HUD «MANHÃ · ~07:00», objetivo; saves de esquema 3 (chegada, linha a meio da vaga, oeste, destroço, fim → debrief com `db_np_01`); save concluído do ato atual → debrief sem o parágrafo novo com o interruptor desligado, cartão de transição para o VII-a com `?acts=1` e envelope de esquema 3 com `carry.from = act_bw_0430_0705`. |

Medido nas rotas do golden (semente 19390901, recruta): passivo — vaga às 14,5 s, quebra às 72 s, repelida às 95,6 s, 8 alemães caídos, 1 polaco da linha morto, 113 rondas alemãs, 5 rajadas da ckm, fim aos 103,7 s; ativo (atirador a ritmo humano: 0,8 s na mira, ≤ 1 tiro/2,5 s) — quebra às 41,7 s, 12 caídos, fim aos 62,7 s. **O combate é curto** (30–60 s até a vaga quebrar): número a afinar no playtest.

## Capturas (vistas uma a uma; SwiftShader, 1280 × 720, qualidade por omissão do browser de teste, salvo nota)

- `01-entry-card.png` — cartão de entrada a meio da escrita; linhas legíveis; diz fonte única e dramatização.
- `02-arrival-default-view.png` / `03-spawn-north.png` — chegada: campo aberto com o solo procedural (manchas em faixas algo artificiais), a secção a correr para a linha, orla de árvores ao fundo (formas simples, lidas como silhueta), marcador «Parapeito norte 81 m», HUD só com «MANHÃ · ~07:00», legenda do Zieliński. O parapeito lê-se como uma faixa baixa no horizonte.
- `04-line-north-midwave.png` — do parapeito, de pé, a norte: montes de terra (caixas), arame, destroço escuro ao centro, crateras; **os alemães a 70–140 m quase não se veem** (poucos píxeis, uniforme escuro em campo escuro): realista mas difícil; a afinar (contraste, ADS).
- `05-line-west-ckm.png` — ao longo da linha para oeste: parapeito contínuo, Zieliński ajoelhado, caixas de munições, a silhueta da cidade (paisagem distante) à esquerda. A ckm fica a 30 m e é pequena na imagem.
- `05b-wreck-aimed.png` — vista para o destroço: casco genérico escuro sem detalhe, fumo da coluna pouco visível neste fotograma.
- `06-end-card.png`, `07-debrief.png` — cartão final e debrief completo, com o parágrafo `db_np_01` no lugar certo.
- `08-transition-card-from-roll-call.png` — o cartão de entrada aberto a partir do save concluído do ato atual.

Honestamente: a fatia é **jogável e coerente**, mas visualmente provisória — terreno plano com textura repetitiva, montes de terra em caixa, árvores geométricas, destroço sem forma, soldados distantes difíceis de ver. Nada disto é validado.

## Riscos e decisões do proprietário

- **Ligar o interruptor** (`acts.json enabled`) só depois de playtest; até lá só QA por URL.
- Duração/intensidade do VII-a (30–60 s de combate; D-3), número de alemães, visibilidade a 70–140 m.
- D-2 (SS-Heimwehr próxima): mantido «tropas alemãs vindas do norte», sem insígnias.
- O plano punha `acts` em `mission.json`; fica em `acts.json` para não mexer no golden 20 (mudar implica nova emenda).
- Fatia deslocada 80 m para leste (silhueta da cidade da paisagem distante); traçado real das trincheiras continua bloqueado (P4, mapa de 1939).
- Com o interruptor ligado, um save antigo do VII-a só é apagado quando o novo jogo grava o seu 1.º checkpoint do ato atual: «Continuar» antes disso abre o VII-a antigo (só QA; a corrigir antes de ligar).
- `?act=` desconhecido mostra erro (só QA). O primeiro carregamento do VII-a reconstrói o relevo e a paisagem distante atrás do cartão (custo não medido em Chromebook).
