# M01 — Lacuna de disparo da ckm wz.30

Análise estática, só leitura. Verificada em HEAD `1b3a973` (branch `claude/gracious-franklin-u8kdin`).

## 1. Resumo

- Na V7-line a ckm wz.30 tem guarnição, arma, três LODs, clips `aim`/`fire_burst`/`feed`, perfil de áudio e saves schema 2. Tudo existe excepto a decisão de disparo na simulação.
- No runtime só há `idle -> abandon -> retreat` (`src/game/m01-simulation.js:393-402`). Não há alvo, munição, cadência, rounds nem dano para a ckm.
- Duas branches `codex/*` tentaram o disparo e ficaram BLOQUEADAS por geometria: não existe linha livre da boca (25, -2,36, 43) até alvos alemães (secção 4). Ligar o código sozinho não resolve.
- Bloqueio estrutural a decidir primeiro: abertura/seteira da casamata e colliders das pontes. O `TASK_ID` proposto (secção 5) tem uma fase 0 para isso.

## 2. O que já existe

| Camada | O que existe | Ficheiro:linhas | Teste que o prova |
|---|---|---|---|
| Simulação: guarnição | 3 actores aliados `ckm_gunner/loader/reserve`, grupo `grp_ckm_crew`, campo `ckm:{phase,startedAt,visible}`; posição `CKM_POSITION` {24,17; -3; 43} | `src/game/m01-simulation.js:28-31,41-46,92` | `tests/m01-ckm-runtime.test.js:15` |
| Simulação: comportamento | `idle`; ao consumir `east_demolition` passa a `abandon`, após `CKM_ABANDON_SEC=3` a `retreat`; `visible` = sem `west_demolition` | `src/game/m01-simulation.js:387-402` | `tests/m01-ckm-runtime.test.js:15` |
| Save schema 2 | Validação de chaves `phase/startedAt/visible`, fases `idle/abandon/retreat`; reconstrução de guarnição em saves antigos; migração do posto (+2,17 em x) | `src/game/m01-simulation.js:32-39,912-915,947-957` | `tests/m01-ckm-runtime.test.js:30`; `tests/m01-ckm-placement-migration.test.js:18-117` |
| Missão | `grp_ckm_crew` weapon `ckm_wz30`, post `cv_casemate_emb_s`; objectivo "saiu da casamata"; emissor separado `ae_s2_ckm_east` [1045,0,30] | `missions/m01-tczew/mission.json:66,215,740,838` | `tests/m01-animation-contract.test.js:150` (IDs `ckm_*`) |
| Assets | `m01_ckm_wz30_{lod0,lod1,lod2,animations}.glb` + manifest (LOD0 <= 4000 tri; clips arma idle/aim/fire_burst/feed/abandon e operadores gunner/loader x os mesmos) | `assets/models/provisional/m01/weapons/ckm_wz30/`; créditos `ASSET_CREDITS.md:18` | `tests/m01-ckm-wz30-glb.test.js:21,78-127,135-140` |
| Renderer | Carrega kit; clips de operadores por fase; `updateCKM` escolhe LOD e clip `gun_idle`/`gun_abandon`; `hasCKM()` exige apenas clips idle/abandon | `src/render/m01-characters.js:13-15,47-50,72-84,88-93,236-258` | `tests/m01-ckm-runtime.test.js:44`; `tests/browser/m01.spec.js:570` |
| Apresentação | `ckm.phase!=='retreat'` conta como em posição | `src/game/m01-animation-presentation.js:7` | `tests/m01-animation-contract.test.js:139-156` |
| Áudio | Perfil `ckm_wz30` (família mg, cadência 0,1 s); `ckmBurst()` -> `weaponFire('ckm_wz30')` | `src/core/battlefield-audio.js:96-104`; `src/core/audio.js:15,328` | `tests/m01-battlefield-audio.test.js:24-60`; `tests/m01-audio-production.test.js:50-59` |
| Geometria do cano | `gun_muzzle_flash` cai em x=25, y=-2,36, z=43 (seteira mapeada) | `tests/m01-ckm-placement-migration.test.js:126-133` | o próprio teste |

`ckmBurst` não tem nenhum chamador em `src/` (grep em `src`: só a definição, `audio.js:328`).
`ENGINE_CONTRACT.md:7` e os REPORT/HANDOFF abaixo declaram o disparo como tarefa separada e pendente:
`docs/verification/m01-runtime/ckm-crew-runtime-2026-10-03/REPORT.md:17`.

## 3. O que falta para disparar

Precedente MG34 = `src/game/m01-simulation.js` (linhas verificadas em HEAD).

1. **Arco, alvo e decisão de disparo.** Falta tudo. Encaixe: ramo `grp_ckm_crew` em `:393-402` ou chamada análoga a `:704-710` (decisão MG34 do dique, `rounds:7`, `cooldown 6`). Pré-requisito: linha livre (secção 4). Não confirmado: que alvos existem no arco, dependem da geometria por resolver.
2. **Estado de posto/postura.** MG34 tem `updateMG34Posture` (`:353-369`) com fases standing/enter/idle/aim/fire_burst/exit e `MG34_TRANSITION_SEC=1.9` (`:62`). A ckm só tem `idle/abandon/retreat`; precisaria de fases `aim`/`fire_burst` (e `feed`) em `a.ckm`.
3. **Munição e cinta.** Não existe para a ckm. Para o MG34 também não há contador de munição; o limite é a rajada (rounds 4-7, `:533`). Decisão de desenho: cinta finita ou cadência/cooldown apenas.
4. **Cadência/cooldown.** MG34 usa `MG34_INTERVAL=.075` (`:62`) e `a.cooldown`. Perfil sonoro da ckm usa 0,1 s (`battlefield-audio.js:104`); manter um só valor autoritativo em simulação.
5. **Emissão de rounds.** MG34: `burst()` (`:529-542`) planeia a dispersão e `emitMG34Rounds` (`:371-381`) emite eventos `enemy-fire`. A ckm é aliada; é preciso um evento/canal equivalente para fogo aliado contra alemães (não confirmado se `enemy-fire` serve; o nome sugere inimigo).
6. **Dano/hit.** Decidido apenas na simulação. Não há caminho de dano para rounds da ckm. Reutilizar `lineOfSight`/`traceTerrain` da simulação (`:474` usa `this.world.lineOfSight`).
7. **Clarão no mundo.** `m01-view.js:243,296` desenha clarão só para `pose.firing/aiming`, não para a ckm. Não encontrei sprite de clarão de mundo para o MG34 em `m01-characters.js` (não confirmado noutros ficheiros; os sprites de primeira pessoa estão em `src/render/first-person-weapon-fx.js:161-190`).
8. **Áudio em jogo.** Ligar um chamador de `ckmBurst()` (`audio.js:328`) a partir do evento da simulação, não do renderer. Existem renders offline `docs/verification/m01-runtime/battlefield-audio-production-pass-v1-2026-10-07/audio/ckm-burst-30m.wav`.
9. **Save schema 2.** `:951-956` rejeita chaves fora de `phase/startedAt/visible` e fases fora de `idle/abandon/retreat`; qualquer campo novo exige validação nova no estilo `:972-1000` (rajada MG34) e retrocompatibilidade com saves de 86 e 89 actores (`:912-915`).
10. **Clips não ligados.** `aim`, `fire_burst`, `feed` existem nos GLB mas `hasCKM()` (`m01-characters.js:81-84`) e o selector (`:91-93`, `:249`) só usam idle/abandon. Precedente MG34: `m01-characters.js:89-90,126-128`, `m01-actor-pose.js:20,39`.
11. **HUD/eventos de missão.** Não encontrei necessidade confirmada. `mission.json:740,985` só registam a saída da casamata. Fica "não confirmado" até haver desenho.

## 4. Trabalho anterior nas branches excluídas

Ambas partem de `fbaac1e` (ancestral de HEAD). A matriz V6 marca as duas como "Excluir sem aprovação expressa; referência/histórico apenas" (`docs/verification/m01-runtime/final-production-consolidation-v6/DELIVERY_MATRIX.md:78-79`) por não terem caminho `src/assets/missão JSON` no delta, não por falha de testes.

- `origin/codex/m01-ckm-fire-runtime` (`876b162`): 1 ficheiro, `docs/verification/m01-runtime/ckm-fire-arc-2026-10-03/REPORT.md` (+48). Resultado "BLOCKED — no production implementation committed": linha directa da boca até `de_east_0` ~[1055,0,32] bate em `road_collider_pier_01` a ~112,4 m, depois `pier_02` a ~242,4 m; 40/40 posições de `grp_de_east` sem linha livre. Proíbe atalhos: ignorar pilares, mover a boca no renderer, reaproveitar `ae_s2_ckm_east`, inventar seteira.
- `origin/codex/m01-ckm-fire-arc-resolution` (`b242239`): 9 ficheiros (+2042): `tools/m01-ckm-fire-arc.mjs`, `tests/m01-ckm-fire-arc.test.js` (6 testes), relatórios, `arc-map.csv`, `target-lines.csv`, `geometry-summary.json`. "Caminho C": envelope animado ±1,2°/±0,35° 375/375 raios bloqueados; repair 40/40 e withdrawal 50/50 alvos bloqueados. Causa: conflito `missions/m01-tczew/map-layout.json` (casamatas x=0…26, seteira x=25) vs collider do encontro rodoviário x=-22…10; interior da casamata não modelado. Relatou, na sua base, `npm test` 230/230, build PASS, browser 35/35 (HANDOFF da branch).
- Nenhuma alterou `src/game/m01-simulation.js`, renderer, save, mapa ou assets.
- Reutilizável: o scanner e o teste de arco (`git show origin/codex/m01-ckm-fire-arc-resolution:tools/m01-ckm-fire-arc.mjs`); não estão em HEAD (`git ls-files` sem `m01-ckm-fire-arc`). Os colliders vêm de `tools/assets/m01-bridges/` (gerados; não editar à mão, segundo o HANDOFF).
- Não confirmado: se a geometria de HEAD ainda produz o mesmo bloqueio (a medição é de `fbaac1e`; o posto já estava alinhado, ver `tests/m01-ckm-placement-migration.test.js:126-133`).

## 5. Proposta de Task Contract

**TASK_ID:** `M01-CKM-FIRE-RUNTIME-V2`

- **Objectivo:** a ckm da casamata oeste dispara, de forma determinística e guardável, sobre alvos alemães com linha livre, depois de provada uma abertura válida.
- **Fase 0 (decisão, bloqueante):** re-correr o scanner das branches em HEAD. Se continuar 0 raios livres, o Captain escolhe: (a) abertura apoiada por mapa/história, (b) corrigir collider em `tools/assets/m01-bridges/` com regeneração, (c) outro posto documentado. Sem isto, parar e reportar.
- **Âmbito:** decisão de disparo, estado `aim/fire_burst/feed`, rajada e cooldown na simulação; evento para áudio/clarão; ligar clips existentes; validação de save.
- **Ficheiros permitidos:** `src/game/m01-simulation.js`, `src/render/m01-characters.js`, `src/render/m01-view.js` (clarão), chamador de áudio em `src/` (evento), `tests/m01-ckm-*.test.js` novos/estendidos, `tests/browser/m01.spec.js`, docs de evidência em `docs/verification/m01-runtime/`. Fase 0 pode tocar `tools/assets/m01-bridges/` e `missions/m01-tczew/map-layout.json` só com aprovação do Captain.
- **Ficheiros proibidos:** assets GLB/manifest da ckm, `bridge-colliders.json` editado à mão, engine/build fora do âmbito, bancada francesa/aldeia (nunca renomear para Tczew), `ae_s2_ckm_east`.
- **Critérios de aceitação:**
  1. Nenhum disparo sem linha livre da boca (25, -2,36, 43) via trace de produção.
  2. Dois runs A/B com a mesma semente e mesmos inputs dão eventos idênticos por tick.
  3. Saves schema 2 antigos (86 e 89 actores) carregam sem mudar RNG nem actores não-ckm; save a meio de rajada restaura idêntico.
  4. Renderer só apresenta o que a simulação emitiu; nenhum dano/alvo decidido no renderer.
  5. `abandon/retreat` continuam como hoje depois de `east_demolition`.
- **Testes a acrescentar:** Node: arco com linha livre/bloqueada; rajada e cooldown; determinismo A/B; validação e rejeição de save com campos novos; migração de saves antigos; evento -> `ckmBurst`. Browser: sessão com ckm a disparar (clip `fire_burst`, clarão, áudio sem erros de consola) e continuação após save/reload. Não inventar FPS.
- **Riscos:** determinismo A/B por tick e ordem do RNG (MG34 consome gauss na ordem em `:537-540`); compatibilidade schema 2 (`:947-957`); "Simulation guarda somente dados; renderer nunca decide dano"; concorrência com engine/combate (AGENTS.md); bancada francesa intocada; o bloqueio geométrico pode tornar a tarefa inviável sem fase 0.
- **Dependências:** decisão da fase 0; acesso aos scripts das branches `codex/*`; `east_demolition` como fim da janela de fogo.
- **Agente/esforço:** fase 0 Sonnet, esforço médio, ~0,5 dia (só análise, sem alterar produção). Implementação Sonnet, esforço alto, 1-2 dias; revisão Opus `reviewer-critical` (simulação e saves). Estimativa minha, não medida.

## 6. O que muda no jogo / o que não muda (tarefa proposta)

**Muda:** a ckm deixa de ser decorativa antes da demolição leste; passa a haver rajadas, som e clarão da casamata oeste; saves ganham estado de rajada.

**Não muda:** `idle -> abandon -> retreat`, posição `CKM_POSITION`, assets, `ae_s2_ckm_east`, MG34 alemã, mapa e bancada francesa. Nenhum FPS é afirmado.

## 7. Limitações desta análise

Inspecção estática. Nenhum teste, build ou browser foi executado. Números de linha verificados em HEAD `1b3a973`. Resultados das branches `codex/*` são os que elas reportam em `git show`; não foram re-executados. Não relidos: `m01-soldier-visual-variation.test.js:103` e `m01-audio-offline-render.spec.js` (citados pelo explorador, não relidos).
