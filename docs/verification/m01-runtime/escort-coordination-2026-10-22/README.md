# M01 — escolta SP-08 e coordenação da secção (2026-10-22)

Ordem do proprietário (2026-10-22): «Corrigir a escolta SP-08 e a coordenação dos soldados.» Resolve as linhas bloqueadas «Corredor 06:17–06:45 (escolta SP-08)» e «Coordenação aliada e callouts» de `docs/direction/COD_WAW_WWII_BENCHMARK.md`.

**Nada disto foi jogado.** Os números são da simulação, nas rotas automáticas do piloto de teste (`tests/helpers/m01-route.js`); não são um playtest nem uma medida de FPS.

## O que mudou no jogo

**SP-08, o corredor (06:10 → demolição oeste)** — `src/game/m01-corridor.js`, estado `timers.corridor` (guardado):

1. **Contar.** Quando o jogador chega ao posto de disparo (`obj_m01_hold_corridor`), Jan conta o pelotão leste um homem de cada vez, à medida que cada um passa o posto (no máximo um a cada 0,5 s reais). O HUD mostra «Corredor · passaram X de Y homens do pelotão leste». Zieliński diz 047 e 048 quando a contagem começa; Jan diz 049 quando ela acaba.
2. **Escoltar.** Se Dudek ainda leva Bąk a leste do posto, Zieliński manda o jogador voltar (fala nova 162, guionada). Com o jogador a menos de 10 m, Dudek mantém o passo de escolta (1,7 m/s). Sozinho anda a 1,6 m/s, como antes, e fica parado enquanto um tiro próximo o suprime. A margem leste dispara sobre a escolta: os portões, o dique (onde vê a estrada de acesso) e os alemães reagrupados no tabuleiro. São rondas `squad`, que suprimem e nunca ferem um aliado. Quando perdem a escolta no terreno morto da estrada, os atiradores continuam a disparar 25 s sobre o último ponto onde a viram. Falas 160 («Atiram sobre nós! Wrona, cubra-me!») e 161.
3. **Cabeça baixa.** No fim da escolta, Zieliński vem para junto de Jan. O beat do pré-roll da demolição oeste é só texto, «Zieliński baixa-lhe a cabeça com a mão.», e só aparece com ele a ≤ 3 m. Antes, a condição «(se o jogador estiver a até 3 m)» aparecia impressa no HUD.
4. **B4 intacta.** `readiness(evt_m01_west_demolition)` continua a esperar Bąk entregue na estação. Fica provado em `tests/m01-partials-correction-01.test.js` e de novo na rota da escolta (`tests/m01-escort-coordination.test.js`).

**Fatia 3, coordenação** — `src/game/m01-squad.js`, estado `timers.squad` (guardado). Depois da demolição leste, a secção deixa de ir em multidão para um só ponto (x −170, z 22) e recua por lanços entre postos de cobertura:

- lanço 0: Pawlak e a voz do pelotão vão dos sacos do posto da secção para os sacos do reparo, por ordem de Zieliński (155) depois da cena da demolição;
- lanço 1: Kowal faz o mesmo quando a escolta passa (156), quando é suprimido (158) ou às 06:36;
- lanço 2: a equipa A recua para trás do ponto de reunião quando a escolta passa os sacos do reparo (157);
- lanço 3: Kowal recua 2 s depois de a equipa A chegar.

Cada homem anda com o `moveActor` da simulação: A* determinista, uma `route()` por tick, em fila. Quem segura um posto fica de joelhos virado para o rio e anuncia a chegada («Em posição! Cubro!», 159). Durante a escolta, Kowal cobre-a com rajadas da rkm sobre o clarão mais recente que vê. Usa a supressão e a cadência de `kowalFire`, o seu fluxo de IA e a troca real de carregador (029). Levanta-se pela regra T38 da rkm. Falas pelo realizador de barks: gatilho novo `squadMove`, condições `pinnedId` e `escorting`. A 163 («Clarão nos portões! Atiram para a estrada!») toca com fogo real dos portões.

**O que ficou intacto:** sobreviventes 12/18, 12 objectivos (sem objectivo novo: SP-08 é sub-estado de `obj_m01_hold_corridor`), CP-A..D, as horas fixas dos eventos e B4. Antes da demolição leste não muda um único byte. O combate principal continua com os aliados fixos nos lugares T38.

## Números (antes `4e2588fa` → depois, mesma ferramenta e mesmo piloto)

`node tools/verification/m01-escort-coordination-metrics.mjs [--rev 4e2588faeb8054cea70f8bd014d3aa0dcd3effba]` → `METRICS_BEFORE.json`, `METRICS_AFTER.json`. Segundos reais do relógio da simulação.

| Rota (semente, piloto) | Parado no posto sem tarefa | Maior troço parado no corredor | Maior intervalo sem contacto, leste→oeste | Momentos de contacto no corredor | Missão |
|---|---|---|---|---|---|
| 19390901 controlo | 233,0 → **0,1** | 257,8 → 24,9 | 30,4 → 33,5 | 56 → 113 | 1187,3 → 1196,6 (19,94 min) |
| 7 apoio | 233,0 → **0,1** | 256,5 → 23,4 | 44,1 → 36,7 | 20 → 50 | 1083,0 → 1087,5 (18,12 min) |
| 3 controlo | 233,0 → 0,1 | 257,8 → 24,9 | 41,2 → 33,1 | 50 → 95 | 1205,5 → 1205,4 (20,09 min) |
| 3 apoio | 233,0 → 0,1 | 256,5 → 23,4 | 52,0 → 36,4 | 25 → 73 | 1153,4 → 1161,5 (19,36 min) |
| 7 controlo | 233,0 → 0,1 | 257,8 → 24,9 | 27,2 → 23,6 | 55 → 133 | 1198,7 → 1206,1 (20,10 min) |
| 19390901 apoio | 233,0 → 0,1 | 256,5 → 23,4 | 43,6 → 42,2 | 21 → 85 | 1148,8 → 1158,2 (19,30 min) |

- O «maior troço parado» de antes (256,5–257,8 s) é a espera de 257,6 s do benchmark. Depois, o troço mais longo (23–25 s) é a contagem no posto, que é uma tarefa. O tempo parado sem tarefa desce de 233,0 para 0,1 s.
- Escolta: o jogador está a ≤ 10 m de Dudek em 80,8–80,9 % da fase de escolta. Dudek fica 11,6–21,5 s parado sob fogo enquanto o jogador não chega. Recebe 76–110 rondas `squad`.
- Kowal faz 23–27 rajadas de cobertura por rota (antes: 0 depois das 06:10). Cada rota tem os quatro lanços. Em cada rota tocam 10–12 das falas novas (155–163).
- **Limite honesto.** Na rota de controlo, o maior intervalo sem contacto piora 3,1 s (30,4 → 33,5 s). É a corrida de volta pela estrada de acesso, onde nenhum alemão vê o jogador; nessa altura ele está a correr, com tarefa. Em 19390901 apoio continua acima de 40 s (42,2 s): esse troço fica antes de o jogador chegar ao posto, entre a demolição leste e a escolta. Do posto até à demolição oeste o máximo é 29,6 s.
- Duração da missão: 18,12–20,10 min nas 6 rotas, dentro de 18–24 min. A entrega de Bąk chega 4–10 s mais tarde do que antes nas rotas em que Dudek é suprimido antes de o jogador chegar.
- Guarda: clipping 0 e pares sobrepostos 0 nas 6 rotas; vida mínima do jogador (recruta) igual ou próxima da de antes (68–100).

## Golden (emenda 14)

`node tools/verification/m01-integration-golden-audit.mjs --amendment 14 --write` (x86), depois o modo de verificação. Predecessor (reposto na integração, 2026-10-22): a golden da emenda 13 (H9 D3/D4, WP1) em `3eb21b38` (candidata #80 + WP1); escrita primeiro contra a emenda 12 em `4e2588fa`, com as mesmas diferenças medidas (1.ª diferença: x de Kowal às 06:10:00, tick 17220 / 15134; 23746 -> 23933 e 21660 -> 21750 ticks). A emenda 13 passa a histórico (`after: 3eb21b38`); a emenda 12 mantém `after: efb8eb00`. O encravamento da ckm (WP2) é a emenda 15, sobre esta.

- Primeira diferença, nas duas rotas: `$.state.actors.3.x` (Kowal) às 06:10:00, ticks 17220 (controlo) e 15134 (apoio 7). Antes ele partia para x −170; agora segura o lugar T38 (x −71,1). É comportamento logo à primeira, por isso a primeira diferença de comportamento é o mesmo caminho.
- Invariantes: os 12 objectivos, CP-A..D, os eventos consumidos, as flags, os sobreviventes e as 07:05:00 são idênticos ao predecessor; os eventos de hora fixa ficam à hora; clipping 0 e sobrepostos 0 na rota viva e nas sementes 3 e 7 com e sem apoio.
- Ticks: 23746 → 23933 (controlo), 21660 → 21750 (apoio 7).

## Saves antigos

`tests/m01-escort-coordination.test.js` retira `timers.corridor`, `timers.squad` e os avistamentos `leon_dudek` a um save do meio da escolta e ao checkpoint CP-D. Os dois carregam, validam, recriam os registos e acabam a missão às 07:05. Os lanços que um save antigo já fez não são repetidos.

## Testes

- Node focados: `tests/m01-escort-coordination.test.js`, `m01-barks`, `m01-combat-posture-staging` (re-pin com data: Kowal levanta-se para a cobertura), `m01-ckm-fire-arc` (re-pin com data: 1206 → 1203 amostras, 42427 → 42289), `m01-animation-contract` (emenda 14 viva, 12 histórico), `m01-partials-correction-01`.
- Browser: `tests/browser/m01-escort-hud.spec.js` (contador «passaram X de Y» no HUD, a subir de um em um; linha e marcador da escolta) e `tests/browser/m01-pacing-hud.spec.js`, em Chromium/SwiftShader na porta 4195.

## Resultados (SHA `10f963bf`)

- `node --test tests/*.test.js`, corrido em duas metades: 830/830 + 641/641 = **1471/1471**.
- Golden 14 em modo de verificação: `check: identical`.
- `npm run build`: OK.
- Browser (Chromium/SwiftShader, porta 4195):
  - `m01-escort-hud.spec.js`: 2/2.
  - `m01-pacing-hud.spec.js`: 6/6. Uma primeira corrida deu 4 falhas, todas por timeout de carregamento com a máquina sob carga média de 15 a 20; repetida com a máquina livre, passou.

## Por fazer

- Playtest humano da escolta e dos lanços.
- Polaco das falas 155–163 escrito por IA; precisa de revisão por falante nativo.
- Sem voz gravada.
- Coordenação no combate principal (05:30–06:10), que continua com os lugares T38 fixos.
