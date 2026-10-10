# M01-BATTLE-READOUT-DISPLAY-ROUNDS-V1 (T22) — evidência local

Estado: **IMPLEMENTADO, À ESPERA DO CI x86 E DA REVISÃO DO CAPTAIN**. Nada foi enviado ao remoto (sem push). M01 continua **PROTÓTIPO JOGÁVEL**.

| Campo | Valor |
|---|---|
| Tarefa | T22 `M01-BATTLE-READOUT-DISPLAY-ROUNDS-V1` (pré-requisito da prioridade T23, frente leste visível) |
| Branch | `claude/m01-display-fire-readout-v1` |
| Base | `21a6f76` (pilha T44 + T20 + docs) |
| Desenho | `.agent/runs/M01-SIM-CHAINS-DESIGN/DESIGN.md`, secção T22; compatível com `.agent/runs/H9-DIFFICULTY-DESIGN/DESIGN.md` |
| CI x86 | **pendente**: o workflow `.github/workflows/m01-display-fire-readout-v1.yml` corre no primeiro push desta branch e produz o artefacto `m01-display-fire-readout-v1-<sha>` (TAP, linhas do golden e das 12 sementes, build, browser) |

## O que muda no jogo

Nada que o jogador veja: o `mission.json` não tem perfis de fogo de exibição. Muda a API de leitura (`displayFire`, `battleReadout`) e o renderer sabe desenhar o que lá vier. O golden, o RNG principal, as gravações, os eventos e o HUD ficam como estavam.

## O que muda no código

- `src/game/m01-display-fire.js` (novo): lista **separada e não persistida** de tiros só visuais (`kind:'display'`), com `Random` próprio. Nunca traça o mundo, suprime, fere, emite eventos nem escreve em actores, jogador, flags ou `enemyFire`. Máximo 120 em voo (uma rajada que não cabe é saltada inteira, nunca truncada). Perfis lidos de `groups[].displayFire`.
- `src/game/m01-simulation.js`: `reset` cria `this.display`; `restoreSnapshot` recria-o vazio com semente `(s.rng ^ 0x5bd1e995 ^ floor(s.clock*20))`; `updateCombat` chama `updateDisplayFire` uma vez depois de `landRounds`; getters `displayFire` (cópia só de leitura) e `battleReadout` (calculado em cada leitura). `snapshot()`, validador, `landRound`, `enemyFire`, cadências e dano ficam intactos.
- `src/render/m01-view.js`, só `updateFire`: segundo ciclo de traçantes depois do dos tiros de jogo (a prioridade no lote de 48 é do jogo; o fogo de exibição usa no máximo 24) e clarão de boca para o `firedAt` de exibição nos últimos 0,15 s (qualquer equipa, sem duplicar o clarão de um tiro de jogo).
- `tests/m01-display-fire.test.js` (novo, 32 testes) e o workflow `.github/workflows/m01-display-fire-readout-v1.yml`.

Semente do RNG de exibição: `rng.state ^ 0x5bd1e995` à construção; depois de um restore, `rng.state ^ 0x5bd1e995 ^ floor(clock*20)` (a lista em voo não é gravada, por isso recomeça vazia e determinista).

### Formato de um perfil (para a T23)

```json
{ "id": "dp_pl_ckm", "shooters": ["pl_east_0", "pl_east_1"], "weapon": "ckm_wz30", "rounds": [5, 9], "intervalSec": [6, 14],
  "tracerEvery": 3, "targetGroup": "grp_de_east", "from": "evt_m01_train963_arrives", "until": "evt_m01_east_platoon_withdraws" }
```

Obrigatórios: `id`, `weapon`, `rounds` (inteiros), `intervalSec`, exactamente um de `shooters` (actores) ou `origin` `[x,y,z]` (ex.: Panzerzug), e exactamente um de `targetGroup`, `targetIds` ou `targetBox` `[minX,maxX,minZ,maxZ]`. Opcionais: `interval` (0,075 s), `tracerEvery` (0 = sem traçantes), `bias`/`cone` em mrad (2/1,4 e 0,7/0,5), `from`/`until` (eventos consumidos). `weapon` é uma etiqueta de exibição: pode diferir da arma de jogo do actor. Os ids de evento são validados contra o `mission.json`.

## Evidência local (aarch64, Node v24.21.0; o CI x86 é a autoridade, D11)

| Verificação | Resultado |
|---|---|
| `tests/m01-display-fire.test.js`, tudo menos as sementes (`--test-skip-pattern='^route seed'`) | **20/20** |
| mesmo ficheiro, 12 sementes `route seed N` em dois blocos (`M01_DISPLAY_FIRE_SEEDS`) | **12/12** (460 s + 449 s) |
| `tests/m01-animation-contract.test.js` | 13 passam, **7 falham, as mesmas 7 da base** (ver abaixo) |
| `tests/m01-cover-threat.test.js`, `m01-runtime.test.js`, `m01-hud-presentation.test.js` | **33/33** |
| testes que tocam `updateFire`/traçantes (`mg34-prone-presentation`, `damage-decals`, `aircraft-runtime`, `consolidation-lifecycle`, `demolition`, `mg34-prone-runtime`) | **78/78** |
| 16 ficheiros vizinhos (`game`, `ckm-placement-migration`, `combat-feedback`, `cover-combat`, `cover-origin`, `continuous-fixes`, `ckm-runtime`, `support-runtime`, `player-shot-feedback`, `battlefield-fx`, `battlefield-fx-polish-v3`, `impostors`, `panzerzug`, `poses`, `tczew-data`, `station-evacuation`) | **120/120** |
| `tests/m01-schema2-determinism.test.js` | ficheiro inteiro: `timeout 900` esgotado (**exit 124**, infra: o ficheiro precisa de cerca de 15 min nesta placa; na base a rota mais pesada demora 371 s, aqui 358 s). Repetido em duas metades, cada uma abaixo de 900 s: **5/5 + 13/13 = 18/18** |
| `npm run build` (depois `dist/` apagado) | OK |
| browser | não corre localmente; é o passo do workflow |

### RNG principal e isolamento (12 sementes)

`seed-sweep.json`: para 19390901 e 1–11, `route()` completo com um perfil sintético (5 perfis: MG do dique, atiradores do portão a apontar para a margem oeste onde está o jogador, aliados a apontar para leste, grupo-alvo, origem fixa tipo Panzerzug) e uma simulação simples em lockstep com os mesmos controlos.

- `rng.state`, eventos e relógio iguais **em todos os ticks** (12/12); estado completo (`snapshot(false)`) igual em 4000 ticks seguidos a partir do comboio 963 e de 250 em 250 ticks fora dessa janela, mais no fim e no checkpoint de respawn.
- Não é vácuo: cada semente cria 12 600–13 100 tiros de exibição (7 400–7 800 traçantes, até 57 em voo, 13 atiradores com clarão) de cada um dos 5 perfis.
- O fluxo do `rng.state` e um fluxo de valores de jogo, por tick, são **idênticos ao código anterior à mudança** (cópia limpa de `21a6f76` via `git archive`, `pre-change-base-capture.jsonl`): mesmos ticks, `rng` final, vida e hashes nas 12 sementes (`allProfiledEqualPreChangeBase: true`).
- Controlo positivo no teste: simulações que vazam (um `rng.next()`, uma escrita num actor, na vida do jogador, em `enemyFire`, um evento) são detectadas.

### Golden (`tests/fixtures/m01-anim-gameplay-baseline.json`)

Byte-idêntico (`git diff 21a6f76 HEAD` vazio; sha256 `c775d6d46d8401c8284a93fca290fbdae1cb34966a9e8d32743829fb6e40e3c8`). `m01-animation-contract` em aarch64 falha antes e depois da mudança exactamente nos mesmos 7 testes (os 2 hashes por tick de 19390901 e 7, que divergem do golden x86 em 6 e 3 blocos por flutuação de vírgula flutuante, e 5 testes que falham em cadeia: a variável `completed` só é atribuída quando o golden de 19390901 passa, e os cinco rebentam com `TypeError: Cannot read properties of undefined (reading 'checkpoints')`). As duas saídas de texto são idênticas (tempos à parte): `animation-contract-aarch64-compare.txt`. As listas **completas** de blocos do `GameplayDigest` das duas rotas (41 e 40 blocos) também são idênticas entre a base e a mudança: `golden-blocks-aarch64-base.json`, `golden-blocks-aarch64-after.json`.

## Desvios do desenho e limites

- `intensity` do `battleReadout` = parte dos atiradores do sector que dispararam (jogo ou exibição) nos últimos 20 s, em 0..1. O desenho dizia "tiros em 20 s / máximo do perfil", mas não existe histórico de tiros (guardá-lo exigiria mexer em `burst`, fora do âmbito) nem máximo por perfil.
- Sectores vêm de `groups[].sector` (e `members`): hoje só `s2_east_bridgehead` tem homens mapeados com armas (`s3` tem um civil, que não conta como atirador); `s1`, `s4`, `s5` mostram 0 até a T21/T23 decidirem o mapeamento do esquadrão, dos sapadores e da guarnição do ckm.
- O clarão de exibição não se desenha num actor inimigo que acabou de disparar em jogo (há clarão seu): evita duplicar, e esconde o de exibição nesses 0,25 s.
- A baforada de chegada do `pz7_75mm` do desenho fica para a T23 (o âmbito desta tarefa é o ciclo de traçantes e o clarão).
- `makeRound` usa `Math.log`/`Math.cos` na dispersão: os tiros de exibição podem diferir em ulps entre aarch64 e x86. Não entram em nenhum hash, gravação ou evento.
- O ponto de injecção dos testes é `sim.display.profiles`; um restore reconstrói a lista a partir do `mission.json` (hoje vazia), por isso um perfil injectado tem de ser reatribuído depois de restaurar.

## Ficheiros desta pasta

`seed-sweep.json` (12 sementes), `pre-change-base-capture.jsonl` (captura da base, 13 corridas), `animation-contract-aarch64-{base,after,compare}.txt`, `golden-blocks-aarch64-{base,after}.json`, `scratch-*.mjs` (scripts usados para a captura da base, os blocos do golden e a comparação), `test-runs.txt` (comandos e contagens).
