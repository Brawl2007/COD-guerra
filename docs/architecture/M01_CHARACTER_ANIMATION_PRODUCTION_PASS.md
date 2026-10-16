# M01 — Passo de produção: animação, locomoção e comportamento visual dos soldados

**Estado: plano de produção, sem código.** M01 continua **PROTÓTIPO JOGÁVEL**. Este documento desenha o passo que elimina soldados estáticos, robóticos, a deslizar, a girar de repente, a repetir a mesma pose, a disparar sem reacção corporal e sem transições. Divide o trabalho em cinco TASK_IDs independentes para Claude Code. Não é evidência de implementação, playtest nem medição de FPS.

Autor do passo: Character Animation Tech Lead (Claude). Data: 2026-10-07.

## 0. Resumo

1. A simulação passa a publicar um **contrato de apresentação** mínimo e autoritativo por actor (velocidade comandada, odómetro, marcha, yaw corporal suavizado, instantes de postura, supressão, impacto, morte e recarga). Tudo é dado determinístico, opcional no schema 2, validado atomicamente e tolerante a saves antigos, como `mg34Prone` e `stationDrag` já fazem.
2. O renderer deixa de escolher um clip inteiro por frame com `stopAllAction()`. Um **resolver puro** (sem estado, sem RNG, sem câmara) transforma actor + relógio num plano por camadas: postura, locomoção, tronco/arma, reacção aditiva, yaw/olhar, IK e fidelidade. Um **player** liga o plano a acções persistentes do `AnimationMixer`, com fundidos em tempo de missão.
3. A fase da passada deriva do **odómetro** autoritativo, não do relógio nem de histórico do renderer: pés plantados, mesma fase em LOD, culling, pausa e reload.
4. O yaw do corpo é suavizado **na simulação** (`bodyYaw`), com limite angular; o renderer só o lê. Facing de combate, boca do cano e hitboxes continuam com `facing`.
5. Morte, flinch, supressão e recarga ganham instantes autoritativos (`diedAt`, `hitAt`, `suppressedAt`, `reload`) e variantes escolhidas por hash estável de ID + instante. Nenhum RNG de jogo entra na apresentação.
6. A biblioteca de clips cresce com sprint, crouch walk, carry walk, turn-in-place, agachar/levantar, deitar/levantar genéricos, mortes, flinches, idles variados, cobertura, vault e beats da chamada, todos com metadados de velocidade, contactos, família de pega e máscara.
7. Guarnições (MG34 deitada com municiador, ckm) e evacuações (arrasto da estação, Bąk ao ombro) continuam adaptadores especializados com precedência sobre o resolver genérico, completados com as fases que lhes faltam.
8. Fidelidade por distância: três tiers de actualização/camadas, chaveados pelo relógio da missão, dentro dos limites 18/24/28 actores com skinning. Orçamento de CPU é alvo a medir com o benchmark do Chromebook, não resultado antecipado.

## 1. Âmbito, base analisada e fronteiras

### 1.1 Base

`main` (`72bbcdd`) só tem os humanos procedurais: não contém a integração dos GLB. A análise usa o trunk integrado mais recente que contém `src/render/m01-characters.js` com variação visual, MG34 deitada, arrasto da estação, ckm e a auditoria de determinismo:

| Referência lida sem merge | SHA | O que fornece |
| --- | --- | --- |
| `codex/m01-battlefield-fx-polish-v3` (trunk integrado, 2026-10-06) | `e08755be169c8ae5ddf12978b9beb3cc25b4ba43` | `m01-characters.js`, `m01-actor-pose.js`, `m01-viewmodel.js`, `m01-soldier-variation.js`, `spatial.js` com prone MG34, `m01-simulation.js` com `mg34Prone`/`stationDrag`/`ckm`/`resumeCheckpoint` |
| `codex/m01-production-integration-checkpoint-1` | `f9aa1add5705ead80ec378c3f423650f854b19a6` | checkpoint de integração contido no trunk acima |
| `codex/m01-runtime` (staging) | `beec7cd9333cfac38fdc361da481ad4a942e1e37` | integração original dos soldados, armas, estação, ckm |
| `codex/m01-soldier-locomotion-animation` | `cd91d65f0c022678ed24785eb44233bab137eb3c` | `docs/architecture/SOLDIER_ANIMATION_SYSTEM.md`: contrato de arquitectura V1 e auditoria do runtime |
| `codex/m01-rifleman-locomotion-runtime` | `93aaa5c4a5651f22b4c696005501a2ac1014860a` | piloto de quatro riflemen: medição real dos clips, métrica de deslizamento, padrões de teste (não integrado no trunk) |
| `codex/m01-soldier-visual-variation-pass` | `63318225c015d7dc50390bed32897b0305237aa1` | tarefa paralela de variação visual (integrada no trunk) |
| `codex/m01-schema2-determinism-audit` | `5f3cc34f53c61beec52255d67f8babd7194c9f7f` | comparação A/B de futuros por tick (`tests/helpers/m01-determinism.js`) |
| `codex/m01-mg34-prone-runtime` | `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b` | modelo de referência: postura autoritativa, geometria síncrona, hitboxes/boca do cano por fase |
| `codex/m01-chromebook-benchmark` | `7edcdce5dc06ed438417c820d7294a9aaa2bd607` | instrumento de medição para o orçamento |

Cada TASK_ID deve partir da staging/trunk indicada pelo utilizador no momento de começar e confirmar o HEAD remoto. Nunca partir de `main`.

### 1.2 Fronteira com a tarefa de variação visual

A tarefa `M01-SOLDIER-VISUAL-VARIATION-PASS-V1` é dona de: `src/render/m01-soldier-variation.js`, o descritor `soldierVisualVariant`, a selecção de cabeças/capacetes/equipamento/divisas em `M01Characters.create()`, cores e fullness dos proxies, cache de geometria/material privados, `visuals.apply`, `tests/m01-soldier-visual-variation.test.js` e o spec de navegador correspondente.

Este passo **não toca** nada disso. Regras:
- As alterações a `create()` limitam-se à criação das acções do mixer e ao registo de sockets; a chamada `this.visuals.apply(root,actor,key,visual)` e o campo `v.visual` ficam intactos.
- A variação de animação usa um domínio de hash próprio (`m01-soldier-anim/v1|id|…`), nunca a string de identidade `m01-soldier-visual/v1`.
- Nenhuma malha, atlas, material ou geometria de variação é alterada por animação; IK e aditivos só escrevem rotações/posições de ossos.
- Os testes de variação têm de continuar verdes em todas as TASKs, e o descritor visual de cada instância tem de ser byte-idêntico antes e depois de qualquer plano de animação.

### 1.3 O que já existe e se preserva

- Rig de 61 ossos (28 no LOD2), metros, +Y, frente −Z, ossos `weapon`, `weapon_bolt`, `weapon_clip`, `weapon_mag`, `carry_socket`; sockets por arma no `extras` do nó raiz.
- 25 clips no GLB dos soldados (15 base + 10 `rkm_*`), `drag_wounded`, quatro transições de agarrar/soltar, três clips MG34 de pé, nove deitados, dez da guarnição ckm e cinco da arma ckm.
- Amostragem pelo relógio guardado da missão: pausa congela, restauro reproduz o mesmo frame (`tests/m01-poses.test.js`, `m01-mg34-prone-presentation.test.js`).
- Limites de skinning 18/24/28 por qualidade, LOD por distância, fallback para proxies procedurais quando falta um GLB/clip.
- Adaptadores especializados provados: MG34 deitada, arrasto da estação, guarnição ckm (idle/abandon/retreat), transporte de Bąk no `carry_socket`.

### 1.4 Regra de ouro

O renderer e a animação **nunca** decidem gameplay: posição, `facing` de combate, postura que muda hitboxes, tiros, dano, supressão, morte, RNG, relógios, saves. Toda a decisão fica na simulação como dado; a animação é uma função pura desses dados e do relógio da missão. Qualquer necessidade nova de dado é proposta como campo opcional validado no schema 2, nunca como estado escondido no renderer.

## 2. Arquitectura recomendada

```text
M01Simulation (autoritativa, determinística, schema 2)
  ├─ campos existentes: x/y/z, facing, crouched, state, suppressedUntil, shot, firedAt, alive,
  │  carriedBy, task, pose, mg34Prone, stationDrag, ckm, rounds, cooldown
  └─ NOVO contrato de apresentação por actor (Anexo A):
       motion{speed, odometer, gait, gaitSince}, bodyYaw, posture/postureSince,
       suppressedAt, hitAt/hitYaw, diedAt/deathYaw, reload{startedAt,duration,mode},
       cover{nodeId,type,side,height}, carry{phase,startedAt,duration}
            │  (leitura; nunca escrita)
            ▼
AnimationResolver  — função pura (actor, actors, clock, clipMeta, availability) → AnimationPlan
            │  sem estado, sem RNG, sem câmara/qualidade
            ▼
AnimationPlan { posture, base:{clipA,phaseA,clipB,phaseB,weightB,rate}, upper:{clip,time,weight}|null,
                additive:[{clip,time,weight}], yaw:{body,aimOffset,turn}, ik:{feet,hands}, events, missing[] }
            │
            ▼
FidelityPolicy (distância + qualidade → tier N/M/F/proxy, hz chaveado pelo relógio, camadas activas)
            │
            ▼
AnimationPlayer — acções persistentes do AnimationMixer por instância; tempos absolutos; pesos explícitos;
                  mixer.update(0); IK pós-amostragem; sockets → boca do cano/flash
            │
            ▼
M01Characters (instâncias skinned, LOD, variação visual intacta) · M01View proxies (actorPose com odómetro)
```

### 2.1 Contrato de apresentação na simulação (Anexo A)

Um único ponto de escrita, no fim de `updateActors`, calcula por actor:
- `motion.speed`: módulo do deslocamento XZ efectivo do tick (depois da colisão) dividido por `dt`; 0 quando parado. `motion.odometer`: metros acumulados do deslocamento efectivo (monótono). `motion.gait`: classe discreta derivada da velocidade comandada do próprio `moveActor`/`evacuate*`/retiradas (`idle`, `walk`, `run`, `sprint`, `crouch_walk`, `carry`, `drag`), com `gaitSince` = relógio em que a classe mudou.
- `bodyYaw`: persegue `facing` com taxa limitada (180°/s parado, 360°/s em movimento, ilimitado em prone/montado/sentado/ferido/transportado, onde `bodyYaw = facing`). Rotação mais curta; nunca ultrapassa 60° de diferença parado (acelera para fechar).
- `posture` (`stand`/`crouch`/`prone`) e `postureSince`: `crouched` continua autoritativo para saves antigos; `posture` só acrescenta `prone` genérico (sapadores sob fogo deitam-se de facto, como diz o HUD).
- `suppressedAt`: actualizado sempre que `suppressedUntil` aumenta. `hitAt`/`hitYaw`: em `fire()` e granadas, quando um actor sofre dano. `diedAt`/`deathYaw`: em todos os pontos onde `alive` passa a `false`.
- `reload`: riflemen sem ferrolho animado de recarga passam a decrementar `rounds` por tiro e, a zero, entram em `reload{startedAt,duration:3.4,mode:'clip'}` dentro do `cooldown` existente (9–18 s), sem alterar cadência real.
- `cover`: quando parado dentro de um `coverNode` (`world.coverAt`), com tipo, lado e altura; só dado, sem reserva nem LOS.
- `carry` em Bąk: `pickup`/`carry`/`putdown`, como `stationDrag`.

Tudo é derivado do estado da simulação, sem RNG, com validação atómica e defaults para saves sem os campos (Anexo A.3). A comparação A/B de futuros (`tests/helpers/m01-determinism.js`) cobre os campos novos automaticamente porque compara snapshots inteiros.

### 2.2 Resolver puro

`resolveAnimation(actor, actors, clock, clipMeta, availability)` devolve o plano sem ler câmara, qualidade, `performance.now()` ou estado anterior. Precedência (do mais específico ao genérico):

1. adaptadores especializados: MG34 deitada (`mg34ProneSample`), arrasto da estação, guarnição ckm, Bąk transportado/transportador;
2. morte (`diedAt`) e ferido;
3. postura + locomoção genéricas;
4. camada superior (arma) e aditivos (flinch, recuo, respiração, olhar);
5. fallbacks quando falta um clip, registados em `plan.missing` e nos diagnósticos.

A fase de locomoção é `((odometer / strideM) + phaseOffset(id)) mod 1` para os clips in-place, com `strideM` lido dos metadados do clip (distância de um ciclo à velocidade nominal). A taxa de reprodução é `speed / nominalSpeedMps`, limitada a [0,5, 1,8]; a classe de marcha vem de `motion.gait`, e o clip da classe é o que minimiza `|log(rate)|` entre os disponíveis na família.

Variação determinística: `hashAnim(id)` dá deslocamento de fase, índice de idle, cadência de fidgets (9–17 s) e desvio de ±4 % na taxa dos loops não locomotores. Mortes e flinches escolhem a variante por `hashAnim(id, diedAt)` / `hashAnim(id, hitAt)`.

### 2.3 Player no Three.js

- Uma instância mantém acções persistentes: `baseA`, `baseB` (fundido), `upper`, até dois aditivos. Nunca `stopAllAction()`/`reset()` por frame; os tempos são absolutos (`action.time = …`), os pesos explícitos (`setEffectiveWeight`), e `mixer.update(0)` avalia o frame. Padrão já provado no piloto de riflemen.
- Máscaras por osso: o Three.js normaliza pesos por propriedade e não tem máscaras nativas. No carregamento, cada clip ganha duas vistas: `*_lower` (root, hips, pernas, pés) e `*_upper` (spine_01..03, pescoço, cabeça, clavículas, braços, mãos, dedos, `weapon*`). Camada superior = acção sobre a vista `upper`; base = vista `lower` quando há camada superior, vista completa quando não há. Sem tracks duplicados por osso, não há média 50/50 indesejada.
- Aditivos: `AnimationUtils.makeClipAdditive` com `AdditiveAnimationBlendMode` para flinch, recuo, respiração e olhar; referência = frame 0 da pose de descanso da família.
- Fundidos em tempo de missão: `weightB = smoothstep((clock − startedAt) / duration)`, com `startedAt` autoritativo (`gaitSince`, `postureSince`, `firedAt`, `suppressedAt`, `hitAt`, `diedAt`, `reload.startedAt`). Um fundido interrompido parte do vector de pesos corrente, calculado da mesma forma.
- IK pós-amostragem (tier N): pés ao solo e pino das mãos nos sockets durante fundidos entre famílias de pega. Só escreve ossos; nunca a raiz XZ nem dados do actor.
- Proxies (`actorPose`): passam a usar `motion.odometer` para a passada e `diedAt` para a queda, para que actores longe também não deslizem nem caiam instantaneamente.

### 2.4 Política de fidelidade (LOD)

| Tier | Distância (preset baixo/médio/alto) | Malha | Amostragem | Camadas |
| --- | --- | --- | --- | --- |
| N | < 25 m (alto: LOD0 < 14 m) | LOD1 (alto LOD0) | cada frame | base + fundidos + superior + aditivos + IK pés/mãos + fidgets |
| M | 25–60 m | LOD1/LOD2 | cada frame, chaveada a 30 Hz pelo relógio | base + fundidos + superior + flinch/recuo; sem IK |
| F | 60 m até ao limite skinned (100/130/160) | LOD2 (28 ossos) | 15 Hz chaveada pelo relógio | base + postura + morte; corte seco permitido |
| proxy | além do limite/contagem (18/24/28) | lotes instanciados | 10 Hz chaveada | passada por odómetro, mira/recuo, queda por `diedAt` |

"Chaveada pelo relógio" significa: a instância só reamostra quando `floor((clock + offset(id)) · hz)` muda. O frame de pausa e o frame de reload coincidem porque dependem só do relógio. Mudar de tier nunca muda o plano semântico, só quantas camadas e com que frequência se avaliam.

### 2.5 Assets e metadados

Cada clip glTF guarda em `extras`: `semantic`, `family` (pega: `port`, `low_ready`, `aim`, `hands_free`, `prone`, `crew_mg34`, `crew_ckm`, `carry`, `drag`), `mask` (`full`, `upper`, `lower`, `additive`), `loop`, `nominalSpeedMps`, `cycleDuration`, `strideM`, janelas de contacto dos pés (do instrumento de auditoria do piloto, a 240 Hz), `events` e `interrupt`. O teste dos GLB verifica que os metadados coincidem com a medição real (padrão `clip-audit.json`).

## 3. Falhas a eliminar — lista priorizada

Prioridades: **P0** bloqueia a leitura "não robótico"; **P1** visível a < 60 m na rota normal; **P2** polimento próximo; **P3** cenas específicas. Evidência refere o trunk de 1.1.

| # | Falha visível | Causa no código actual | Prioridade | Dono | TASK |
| --- | --- | --- | --- | --- | --- |
| F1 | **Pés deslizam** em toda a locomoção: seguidores a 3,6 m/s tocam `walk` (1,10 m/s nominal); medic a 4,5 m/s; `de_spans` a 1,5 m/s; pelotão a 5,5 m/s toca `run` (3,25 m/s). Deriva média medida no piloto antes da correcção: 0,41 / 0,36 / 2,25 m/s | `M01Characters.sample()` usa `clock + offset` como tempo do clip; não há velocidade nem odómetro; `moveActor` não publica velocidade | P0 | sim + renderer + assets | A, B, C |
| F2 | **Giros instantâneos**: `facing` salta em `moveActor` a cada tick, em `burst()` para a mira e em `stageRollCall`; a raiz roda directamente com `facing`; não há turn-in-place nem torção do tronco | `v.root.rotation.set(0,-a.facing-π/2,0)`; nenhum yaw suavizado | P0 | sim + renderer + assets | A, B, C |
| F3 | **Cortes secos** entre todos os clips genéricos (idle↔walk↔run, pé↔agachado, mira↔descanso, trabalho↔abrigo); `sapper_work_pinned` fica congelado no frame 0,8 s | `stopAllAction()` + `setTime()` sempre que o nome do clip muda; o sapador suprimido segura um frame fixo | P0 | renderer + sim (instantes) | A, B |
| F4 | **Morte instantânea e idêntica**: `fallen` é amostrado no frame final (1,4 s) no instante da morte; todas as mortes têm a mesma pose; proxies deitam-se num frame | não existe `diedAt`; o renderer não pode reproduzir a queda determinísticamente após reload | P0 | sim + renderer + assets | A, B, C |
| F5 | **Sem reacção ao impacto**: `state='HIT_REACTION'` é ignorado pelo renderer; nenhum flinch de quase-acerto; alemães suprimidos passam a ajoelhar num frame | não há `hitAt`/`hitYaw`/`suppressedAt`; sem camada aditiva | P0 | sim + renderer + assets | A, B, C |
| F6 | **Pelotão desliza agachado**: um tiro a < 3 m marca `suppressedUntil` em quem corre; `actorPoseName` devolve `pinned` e `moving=false` enquanto a simulação continua a mover o homem 1 s | `pinned` não considera velocidade | P0 | renderer (via `motion.speed`) + assets (`run_under_fire`) | B, C |
| F7 | **Poses repetidas e sincronizadas**: um só idle, um só `pinned`, um só `seated`, um só `run`; só a fase difere | sem variantes nem fidgets; sem variação de taxa | P1 | assets + renderer | C, B |
| F8 | **Agachar/levantar sem transição; sem crouch walk**: `crouched` alterna num frame; actor agachado em movimento toca `crouched_idle` a deslizar | sem `postureSince`; sem clips de transição e de marcha agachada | P1 | sim + assets + renderer | A, C, B |
| F9 | **Sapadores**: trabalho congelado sob fogo em vez de abrigo; o HUD diz "deitados" mas o corpo ajoelha-se curvado; pés/joelhos flutuam na encosta do aterro | `sample()` segura `sapper_work_pinned` t=0,8; não há prone genérico nem alinhamento ao terreno | P1 | sim (`posture:'prone'`) + assets (`sapper_cover`, prone) + renderer (IK/terreno) | A, C, E |
| F10 | **Transporte de Bąk** desliza (Dudek a 3 m/s e a 4,5 m/s com `carry_wounded` a 0,645 m/s nominal); sem agarrar/pousar | velocidade de simulação incompatível com a marcha de transporte; sem fases `pickup`/`putdown` | P1 | sim + assets + renderer | A, C, D |
| F11 | **Retirada do pelotão**: 5,5 m/s em `run` de 3,25 m/s (deriva 2,25 m/s); todos em passo certo; baixas caem num frame a 1 km | falta `sprint`; fase por relógio; F4 | P1 | assets + renderer + sim | C, B, A |
| F12 | **MG34**: municiador sem actor/associação; `mg34_prone_reload` e `mg34_loader_prone_feed` não ligados; o corte da rajada aos 4/6 tiros é seco em vez do fundido de 0,2 s do manifesto; `mg34_reload` de pé sem modelo de munição | não há decisão/dados de recarga na simulação; o player não funde | P1 | sim + renderer | D, B |
| F13 | **ckm**: só idle/abandon/retreat; `aim`/`fire_burst`/`feed` por ligar; a guarnição sobe de −3 m ao terreno a flutuar 1,2 m/s | sem decisão de fogo nem fases de pontaria/alimentação; sem caminho de saída | P1 | sim (decisão explícita) + renderer + mapa | D |
| F14 | **Soldados estáticos minutos a fio** (hold_access, posto avançado, chamada): respiração de 4 s em loop | sem fidgets, olhar, troca de apoio, verificação da arma | P1 | assets + renderer | C, B |
| F15 | **Mira sem entrada/saída** (0,30/0,22 s na ficha do wz.29) e `aim` corta para idle 2,5 s depois do tiro; proxies erguem a arma num frame | fundidos inexistentes; `aiming` é booleano | P2 | renderer | B |
| F16 | **Sem cobertura, lean ou peek**: Zieliński/Kowal disparam de pé ao lado dos sacos; o jogador vê NPC à frente da cobertura em vez de atrás | não há `cover` por actor nem clips de cobertura | P2 | sim (derivado) + assets + renderer | A, C, B |
| F17 | **Pop de LOD/proxy** aos 100/130/160 m e 15/40/45 m; custo de 89 `actorPose` por frame + 18 mixers sem escalonamento | sem tiers de actualização; sem orçamento medido | P2 | renderer + benchmark | E |
| F18 | **Mãos saem da arma** em qualquer fundido entre famílias de pega (port arms ↔ mira); boca do cano continua certa (osso `weapon`) mas as mãos derivam | fundido entre clips com IK cozido independente por osso | P2 | renderer (pino IK) + assets (famílias) | E, C |
| F19 | **Terreno ignorado**: raiz na altura do ponto; nas rampas de 6 m do aterro e no dique as botas flutuam/penetram | sem IK de pés nem inclinação da raiz | P2 | renderer | E |
| F20 | **Hitbox vs silhueta**: aliado `pinned` (anca 0,38 m) tem hitbox de pé; Bąk transportado tem hitbox 1,15 m acima do transportador. Não afecta tiros hoje (aliados não são alvo de raios), mas quebra o invariante para qualquer posture genérica futura | posturas visuais sem dado autoritativo | P2 | sim (posture) + testes | A |
| F21 | **Vault inexistente**: `world.move` bloqueia e o actor contorna | sem traversal link | P3 | sim + assets + renderer; só onde o percurso o exigir | C (clip), D (contrato opcional) |
| F22 | **Chamada das 07:05**: cantil e caneca não existem; oito homens com o mesmo `seated` | beats da cutscene só em texto | P3 | assets + renderer (relógio da cena) | C, B |
| F23 | **Civis e ferroviários** sem clips próprios; `grp_railway_workers` sem actores | fora do rig de soldado | P3 | fora deste passo (registado) | — |

## 4. Máquina de estados de animação

A máquina é **por camadas**; cada camada tem o seu conjunto de estados e lê só dados autoritativos. Os adaptadores especializados (MG34 deitada, arrasto, ckm, transporte) são máquinas próprias com precedência.

### 4.1 Camada P — postura (dono: simulação)

| Estado | Dado autoritativo | Hitbox |
| --- | --- | --- |
| STAND | `posture='stand'` (ou `crouched=false`) | de pé |
| CROUCH | `posture='crouch'` / `crouched=true` | −0,48 m |
| PRONE (genérico) | `posture='prone'` | caixas orientadas por `facing`, como a MG34 (Anexo A.4) |
| SEATED | `pose='seated'` | sem alvo (chamada) |
| WOUNDED | `state='WOUNDED'` / `task='station_wounded'` | deitado |
| CARRIED / DRAGGED | `carriedBy` (+ `task`) | segue o transportador |
| DEAD | `alive=false`, `diedAt` | nenhum (não é alvo) |
| MOUNTED_MG34 / MOUNTED_CKM | `mg34Prone.phase`, `ckm.phase` | adaptador existente |

### 4.2 Camada L — locomoção (por postura; dono: resolver, dados: `motion`)

| Estado | Entrada | Clip (existente / **novo**) | Fase/taxa |
| --- | --- | --- | --- |
| IDLE | `speed<0,05` | `standing_idle`, **`standing_idle_b/c`**, `crouched_idle`, **`crouched_idle_b`** | relógio + offset(id); taxa 1±0,04 por id |
| FIDGET (one-shot) | IDLE há mais de 9–17 s (por id), sem combate | **`fidget_look`, `fidget_shift`, `fidget_helmet`, `fidget_check_rifle`** | arranca em `floor((clock+offset)/período)`; cancelado por `firedAt`/`suppressedAt` |
| WALK | `gait='walk'` (1,2–2,2 m/s) | `walk` | fase por odómetro; taxa `speed/1,10` |
| RUN | `gait='run'` (2,2–4,4 m/s) | `run` | fase por odómetro; taxa `speed/3,25` |
| SPRINT | `gait='sprint'` (> 4,4 m/s) | **`sprint`** (nominal 5,3 m/s, ~196 passos/min) | fase por odómetro |
| RUN_UNDER_FIRE | RUN/SPRINT ∧ `clock<suppressedUntil` | **`run_under_fire`** (cabeça baixa) ou aditivo **`duck_additive`** | mesma fase |
| CROUCH_WALK | CROUCH ∧ `speed>0,05` | **`crouch_walk`** (nominal 1,2 m/s) | fase por odómetro |
| TURN_L / TURN_R | `speed<0,05` ∧ `|facing−bodyYaw|>35°` | **`turn_left_90`, `turn_right_90`** (0,5 s, passos in-place; a rotação vem de `bodyYaw`) | arranca quando o limiar é cruzado; `bodyYaw` dá o ângulo |
| CARRY_WALK | `gait='carry'` (transportador de Bąk) | `carry_wounded` re-autorado como **`carry_walk`** (nominal 1,6 m/s) | fase por odómetro |
| DRAG_WALK | `gait='drag'` (arrasto da estação) | `drag_wounded` (0,65 m/s, existente) | fase por odómetro |
| PRONE_IDLE / PRONE_FLINCH | PRONE | **`prone_idle`**, **`prone_flinch`** | relógio / `suppressedAt` |

### 4.3 Camada U — tronco e arma (máscara `upper`; dono: resolver, dados: `firedAt`, `shot`, `reload`, `aiming` derivado)

| Estado | Entrada | Clip | Notas |
| --- | --- | --- | --- |
| READY_PORT | em movimento | `walk`/`run` já têm a arma ao peito; vista `upper` do mesmo clip | sem camada extra |
| READY_LOW | parado, sem mira | vista `upper` de `standing_idle` | — |
| AIM_IN → AIM | `firedAt` iminente não existe; usa a regra actual (`SUPPRESS` recente, SUPPORT em GUARD) com entrada de 0,30 s a partir do instante em que `aiming` passa a verdadeiro (`firedAt−1,05` para riflemen que vão disparar não é conhecido: a mira entra no `firedAt` do primeiro tiro e mantém-se 2,5 s; a entrada antecipada só existe quando a simulação publicar intenção) | `aim` (loop 2 s) | AIM_OUT 0,22 s |
| FIRE_BOLT | `clock−firedAt∈[0,1,17)` | `fire_bolt` (eventos `fire` 0, `eject` 0,6, `chambered` 1,0) | recuo aditivo no tronco |
| BURST (rkm/MG34 de pé) | `firedAt`, `shot`, `rounds` | `rkm_fire_burst`, `mg34_fire_burst` | corte em `rounds·intervalo` com fundido 0,2 s |
| RELOAD_CLIP | `reload.startedAt` | `reload_clip` (3,4 s), `rkm_reload`, `mg34_reload` | locomoção permitida só a `walk` (política por arma) |
| CREW_* | adaptadores | `ckm_wz30_*`, `mg34_prone_*`, `mg34_loader_prone_*` | precedência total |

### 4.4 Camada R — reacções aditivas (dono: resolver; dados: `hitAt`, `hitYaw`, `suppressedAt`, `firedAt`, eventos de explosão da simulação)

| Estado | Entrada | Clip aditivo | Duração |
| --- | --- | --- | --- |
| FLINCH_HIT | `clock−hitAt<0,35` | **`hit_front/back/left/right`** por `hitYaw−bodyYaw` | 0,35 s, pico aos 0,08 s |
| FLINCH_NEAR_MISS | `clock−suppressedAt<0,45` | **`near_miss_duck`** | 0,45 s |
| BLAST_DUCK | demolição/bomba a < 60 m (`sectors.damage[].started`) | **`blast_duck`** | 0,8 s |
| RECOIL | por tiro (`firedAt + k·intervalo`) | **`recoil_rifle`, `recoil_auto`** | 0,22 s |
| BREATH / LOOK | sempre | **`breath_additive`**, **`look_additive`** (olhar para a ameaça/alvo quando existir) | loop por id |

### 4.5 Camada Y — yaw e olhar

- `yaw.body = bodyYaw` (sim). `yaw.aimOffset = clamp(facing − bodyYaw, ±60°)`, repartido 1/3 por `spine_01..03` (tier N/M). Pitch da mira: clamp ±25° (de pé), ±15° (agachado), ±8° (prone). Olhar da cabeça: alvo/ameaça com ±70° yaw, só quando não há clip que já fixe a cabeça (mira, recarga, prone).
- TURN_IN_PLACE arranca na camada L quando parado com erro > 35°; termina quando o erro cai abaixo de 5°.

### 4.6 Estados especializados e cenas (precedência)

| Sistema | Fases autoritativas | Clips | Lacunas a fechar (TASK D) |
| --- | --- | --- | --- |
| MG34 deitada (atirador) | `standing→enter→idle→aim→fire_burst→aim→exit→standing` (1,9 s; 4–7 tiros a 0,075 s) | nove `mg34_prone_*` | fundido 0,2 s nos cortes 4/6; `reload` 4,8 s após N rajadas (dado de munição mínimo) |
| MG34 municiador | **`mg34Prone.loader`** (ID associado), `loader.phase` (`idle`/`feed`/`leave`) sincronizada com o atirador | `mg34_loader_prone_idle/feed/leave` | associação por ID de um `de_east_*` adjacente do dique, morte/retirada limpam a associação |
| ckm | `idle→abandon→retreat` (3 s) + **`aim`/`fire_burst`/`feed`** com `startedAt` e plano de rajada como a MG34 | `ckm_wz30_{gunner,loader}_*`, `ckm_wz30_gun_*` | política de fogo é decisão de gameplay (ver 11); saída da casamata por rampa/escada |
| Arrasto da estação | `grab→drag→release` (1,6 s) | `station_drag_*`, `drag_wounded` | pés na encosta; nada mais |
| Bąk ao ombro | **`carry.phase`** `pickup→carry→putdown` (1,6 s cada) | **`carry_pickup_{carrier,patient}`, `carry_putdown_*`**, `carry_walk`, `carried` | velocidade de transporte 1,6 m/s (ver 11) |
| Chamada 07:05 | `scene.elapsed` (já guardado) | **`seated_pass_canteen`, `seated_receive_canteen`, `seated_cup_turn`, `seated_b`** | beats aos 3 s e 38 s do timeline |
| Vault | **`vault{nodeId,startedAt,duration,from,to}`** opcional; a simulação move a raiz ao longo do arco | **`vault_low`** (0,9 s, cobertura ≤ 1,1 m) | só se um percurso o exigir |
| Cobertura | `cover{nodeId,type,side,height}` derivado | **`cover_low_idle`, `cover_low_peek_fire_l/r`, `cover_high_idle`, `cover_high_lean_l/r`, `cover_return`** | AI de cobertura não existe em M01; os clips servem posições fixas (posto avançado, sacos) |

## 5. Transições

Todas as durações são tempo de missão medidas a partir de um instante autoritativo. "Fundido" = pesos explícitos entre duas acções persistentes; "autorado" = clip de transição com continuidade verificada no frame inicial/final (padrão das transições do arrasto).

| De → para | Gatilho (dado) | Duração | Mecanismo | Continuidade |
| --- | --- | --- | --- | --- |
| IDLE → WALK/RUN/SPRINT | `gaitSince` | 0,20 s | fundido; fase do alvo = odómetro | pé de apoio do idle coincide com a janela de contacto do alvo (escolha do offset) |
| WALK ↔ RUN, RUN ↔ SPRINT | `gaitSince` | 0,25 s | fundido com fase partilhada (normalizada) | mesma fase normalizada; cadência muda com a taxa |
| qualquer → IDLE | `gaitSince` | 0,25 s | fundido | último pé plantado fica no chão |
| STAND ↔ CROUCH | `postureSince` | 0,45 s | **`stand_to_crouch` / `crouch_to_stand`**; fallback fundido 0,35 s | hitbox muda em `postureSince` (já é assim); a cabeça visual fica dentro do envelope (I7) |
| CROUCH ↔ PRONE | `postureSince` | 1,2 s | **`prone_enter` / `prone_exit`**; fallback: nenhum (postura só é aceite com clips) | hitboxes interpoladas por `progress`, como a MG34 |
| STAND → PRONE | `postureSince` | 1,65 s | por CROUCH (soma) | — |
| parado, erro de yaw > 35° → TURN | `bodyYaw`, `facing` | 0,5 s por 90° | clip in-place + rotação por `bodyYaw` | nunca roda mais de 180°/s parado |
| READY → AIM | `aiming` sobe | 0,30 s | fundido da vista `upper` | mãos pinadas nos sockets no tier N |
| AIM → READY | `aiming` desce (2,5 s após `firedAt`) | 0,22 s | fundido | idem |
| AIM → FIRE_BOLT → AIM | `firedAt` | imediato / fim do clip | tempo absoluto do clip | o clarão lê o socket do frame amostrado |
| AIM/READY → RELOAD → READY | `reload.startedAt` | 0,15 s / fim | tempo absoluto | durante a recarga a locomoção fica em `walk` ou IDLE |
| qualquer → FLINCH (aditivo) | `hitAt` | 0,35 s | aditivo, não interrompe a base | sem mudança de hitbox |
| IDLE/em movimento → PINNED (parado) | `suppressedAt` | 0,30 s | fundido + `near_miss_duck` | se a simulação aceitar `prone`, segue CROUCH→PRONE |
| PINNED → IDLE | `suppressedUntil` | 0,45 s | fundido | — |
| vivo → DEATH | `diedAt` | 1,4–1,8 s | **`death_front/back/left/right/crumple`** por `hashAnim(id,diedAt)`; fallback `fallen` desde `diedAt` | corpo fica; nunca volta a levantar-se com LOD, culling ou reload |
| MG34 `fire_burst` → `aim` (corte 4/6) | `startedAt + rounds·0,075` | 0,20 s | fundido documentado no manifesto | sem eventos de tiro após o corte |
| sapador `work` → `cover` | `suppressedAt` | 0,35 s | fundido para **`sapper_cover`** (ou `prone_enter` se `posture='prone'`) | mãos largam o cabo; retomam em `suppressedUntil` com 0,45 s |
| Bąk `pickup` → `carry` → `putdown` | `carry.startedAt` | 1,6 s | autorado em par, como o arrasto | socket `carry_socket` liga no `grip_ready` do par |

Regras gerais: um fundido só acontece entre clips da mesma família de pega ou com pino de mãos activo; fundidos cruzados sem pino caem para 0,15 s. Qualquer transição cujo instante não exista na simulação é proibida (fica corte seco e entra em `plan.missing`), em vez de inventar um relógio no renderer.

## 6. Invariantes

| # | Invariante | Como se prova |
| --- | --- | --- |
| I1 | A apresentação nunca escreve em actores, RNG, relógios, eventos ou saves. | `deepEqual` do snapshot e de `rng.state` antes/depois de cada `update` (padrão existente) |
| I2 | Mesmo (snapshot, relógio) ⇒ mesmas matrizes de ossos, em todos os tiers, incluindo amostragem chaveada, pausa, reload e troca de LOD. | matrizes iguais após `restoreSnapshot`; dois renderers independentes; repetição com o mesmo relógio |
| I3 | Câmara e qualidade não mudam o plano semântico (clips, fases, pesos), só a fidelidade. | planos iguais nos três presets e com câmaras diferentes |
| I4 | Nenhum `performance.now()`, `Date`, `requestAnimationFrame` ou histórico do renderer entra no plano. | revisão estática + teste de pausa (relógio fixo ⇒ matrizes fixas) |
| I5 | Deslizamento: deriva média do apoio ≤ 0,10 m/s e P95 ≤ 0,25 m/s a 0,65 / 1,5 / 1,6 / 3,6 / 4,5 / 5,5 m/s, em LOD0 e LOD2, proxies incluídos. | instrumento do piloto (`m01-rifleman-clip-audit` + métrica de deriva) estendido a todas as marchas |
| I6 | `|facing − bodyYaw| ≤ 60°` sempre; prone/montado/sentado/ferido têm `bodyYaw = facing`; o clarão e os tiros usam o socket da arma do frame amostrado, nunca um yaw do renderer. | teste de simulação (rotações de 180° comandadas) + teste de boca do cano ≤ 2 mm (padrão MG34) |
| I7 | Para actores alvo (inimigos): centro visual da cabeça dentro da caixa `head` expandida 0,25 m e pélvis dentro da união `torso ∪ legs`, em todas as posturas e transições amostradas a 0,1 s. Qualquer silhueta que viole isto exige postura autoritativa. | teste geométrico sobre a timeline das transições |
| I8 | Mãos nos sockets: `hand_r` a ≤ 3 cm de `grip_r` e `hand_l` a ≤ 5 cm de `grip_l` em todas as frames de fundidos no tier N, excepto janelas de ferrolho/recarga/alimentação definidas pelos eventos do clip. | teste com mixer real sobre a matriz de transições |
| I9 | Saves sem os campos novos carregam e renderizam com defaults; campos malformados são rejeitados atomicamente sem alterar origem nem destino. | padrão `mg34Prone`/`stationDrag` (casos de corrupção) |
| I10 | A comparação A/B de futuros por tick continua sem divergência com os campos novos. | `tests/m01-schema2-determinism.test.js` + rotas completas |
| I11 | Morte: nenhum actor com `alive=false` mostra pose viva; o corpo persiste enquanto activo; a queda arranca em `diedAt`; sem clarão após a morte. | testes existentes da MG34 estendidos a riflemen |
| I12 | Adaptadores especializados (MG34 deitada, arrasto, ckm, transporte) amostram byte a byte como hoje enquanto a TASK D não os alterar. | testes existentes intactos |
| I13 | Variação visual intacta: `m01-soldier-variation.js` byte a byte, descritor visual igual antes/depois do plano, testes de variação verdes. | hash do ficheiro + `deepEqual(v.visual)` |
| I14 | Orçamento: ≤ 3 acções activas por instância; nenhuma instância skinned acima dos limites 18/24/28; proxies e skinned nunca duplicam o mesmo actor. | contadores nos diagnósticos |
| I15 | Nenhuma mudança a hitboxes, tiros, dano, supressão, relógios, gates, CP-A..D, RNG ou IDs além do contrato do Anexo A, e esse contrato é só dado. | diff de `spatial.js`/combate; rotas completas com resultados iguais onde a simulação não mudou de propósito |

## 7. Testes

### 7.1 Node — unidade (sem GLB)

- Resolver: tabela de decisão por entrada (postura, `motion`, `firedAt`, `reload`, `suppressed*`, `hitAt`, `diedAt`, `cover`) ⇒ plano esperado; idempotência; ausência de estado; variação por hash estável e independente de ordem/seed.
- Transições: para cada linha de 5, pesos ao longo do tempo (0, meio, fim), interrupção a meio, mudança de tier a meio.
- Contrato (sim): `motion` reconstruído do deslocamento efectivo; `odometer` monótono; `bodyYaw` com taxa limitada e caminho mais curto; `suppressedAt`/`hitAt`/`diedAt`/`reload` nos pontos certos; validação e rejeição atómica; defaults para saves antigos; `posture='prone'` só nos casos previstos, com hitboxes orientadas.
- Determinismo: `compareContinuation` com saves durante marcha, giro, flinch, morte, recarga, prone de sapador, transporte de Bąk; dt variável e zero; double load.

### 7.2 Node — integração com GLB real (loader CPU sem texturas)

- Matrizes iguais após reload/pausa/LOD/culling para os três tiers e proxies (I2).
- Deriva de pés por marcha e LOD (I5), incluindo proxies.
- Boca do cano ≤ 2 mm vs `muzzlePosition` para riflemen, rkm e MG34 durante fundidos (I6).
- Envelope de hitbox (I7) e sockets das mãos (I8) sobre a matriz de transições.
- Morte: nenhuma pose viva após `diedAt`; variante estável por hash; proxies caem ao longo de 1,4 s.
- Fallbacks: cada clip novo em falta ⇒ plano com `missing` preenchido, sem excepção, sem alteração de gameplay.
- Metadados vs medição: `extras` de cada clip coincidem com a auditoria a 240 Hz (velocidade, contactos, duração).

### 7.3 Navegador (Playwright, build de produção, continuação de saves reais)

Um spec por momento, cada um a partir de um snapshot alcançado pela rota de controlos (`tests/helpers/m01-route.js`): (a) pelotão em sprint na retirada; (b) sapadores a trabalhar → suprimidos → a retomar; (c) secção parada no posto avançado (fidgets, idle variado); (d) Dudek com Bąk ao ombro; (e) MG34 deitada com municiador em `feed`; (f) chamada com beats. Cada spec: olha para a cena por input relativo, pausa real, verifica `gameDiagnostics().m01.characters.actors[]` (clip, fase, pesos, tier, `missing`), recarrega a página e exige o mesmo plano/frame, captura PNG/JPEG. Sem retries, sem timeouts aumentados, sem alegar playtest ou FPS.

### 7.4 Ferramentas

- `tools/verification/m01-animation-clip-audit.mjs`: estende a auditoria do piloto a todos os clips de locomoção (contactos, velocidade nominal, passada).
- `tools/verification/verify-m01-animation.mjs`: galeria isolada de 12 faixas (idle×3, walk, run, sprint, crouch walk, turn, flinch, morte×2, cobertura), dois instantes por faixa, pausa/restauro.
- Benchmark: `tools/m01-chromebook-benchmark.mjs` (branch `codex/m01-chromebook-benchmark`) com cenas "retirada" e "reparo sob fogo", registando tempo de `characters.update` por frame; sem FPS declarados sem o aparelho.

## 8. Critérios de aceitação

| Falha | Critério mensurável |
| --- | --- |
| F1, F11 | Deriva média ≤ 0,10 m/s e P95 ≤ 0,25 m/s em todas as velocidades comandadas e LODs (I5); fase contínua através de LOD/culling/reload (matrizes iguais). |
| F2 | Nenhum frame com `|Δyaw visual| > 180°/s` parado ou `> 360°/s` em movimento; turn-in-place visível quando parado com erro > 35°; clarão/tiros inalterados (≤ 2 mm). |
| F3 | Zero chamadas a `stopAllAction()` no caminho genérico; todas as transições de 5 com pesos contínuos; cortes secos só no tier F, registados. |
| F4 | A queda arranca em `diedAt` e dura 1,4–1,8 s; ≥ 4 variantes; escolha estável por hash; sem pose viva após a morte; proxies também caem. |
| F5 | Flinch aditivo em 100 % dos danos (`hitAt`) e quase-acertos (`suppressedAt`); sem alteração de hitbox; HP intacto. |
| F6 | Homem suprimido em movimento nunca toca `pinned`; usa `run_under_fire`/`duck_additive`; a deriva de pés mantém-se dentro de I5. |
| F7, F14 | ≥ 3 idles de pé, 2 agachados, 2 sentados, 2 `pinned`; fidgets a cada 9–17 s por id; dois actores com IDs diferentes nunca têm fase, variante e cadência iguais em simultâneo (teste de dispersão). |
| F8 | STAND↔CROUCH em 0,45 s com clip autorado; CROUCH_WALK ao mover agachado; hitbox muda em `postureSince` e a cabeça fica no envelope (I7). |
| F9 | Sapadores suprimidos deitam-se (`posture='prone'`, hitbox orientada) com entrada/saída de 1,2 s; `sapper_cover` sem trabalho de mãos; joelhos/pés a ≤ 2 cm do terreno no tier N. |
| F10 | Transporte a 1,6 m/s com `carry_walk` (deriva dentro de I5); `pickup`/`putdown` em par de 1,6 s; Bąk continua entregue antes da prontidão da demolição oeste (rota completa). |
| F12 | Municiador associado por ID, `feed` sincronizado com `reload` (4,8 s), morte/retirada limpam; cortes 4/6 com fundido 0,2 s; sem tiros inventados. |
| F13 | `aim`/`feed` ligados a dados; `fire_burst` só com política aprovada; saída da casamata sem flutuação (rampa/escada ou clip `climb`). |
| F15 | AIM_IN 0,30 s / AIM_OUT 0,22 s com mãos nos sockets (I8). |
| F16 | Nas posições fixas com `cover`, o NPC usa o clip de cobertura correspondente ao tipo/lado; nunca atravessa a geometria (teste de penetração do tronco contra o colisor da cobertura). |
| F17 | Tiers N/M/F/proxy activos, chaveados pelo relógio; I2 mantido; relatório do benchmark com o custo por tier. |
| F18 | I8 em todos os fundidos do tier N. |
| F19 | Botas a ≤ 2 cm do terreno (sem penetração > 1 cm) nas rampas do aterro no tier N; pélvis desce ≤ 12 cm; raiz XZ e hitboxes inalteradas. |
| F20 | I7 para todas as posturas; `pinned` só sem alvo ou com `posture` aceite. |
| F22 | Beats da chamada aos instantes do timeline, lidos de `scene.elapsed`; reload a meio da cena reproduz o mesmo frame. |

Critério global: Node e navegador verdes sem retries, build verde, I1–I15 cobertos por teste, galeria inspeccionada, status/evidências actualizados, e nenhuma alteração de resultado de missão fora das decisões explícitas da secção 11.

## 9. Divisão em TASK_IDs para Claude Code

Cada tarefa é independente: tem fallback quando as outras não existem, ficheiros próprios e testes próprios. Todas: branch própria a partir da staging/trunk indicada; PR pequeno para essa staging (nunca `main`); `npm test`, `npm run build`, suíte focada de navegador; evidência com capturas inspeccionadas e contagens reais; sem FPS, sem playtest alegado; não tocar `m01-soldier-variation.js` nem os seus testes.

### TASK A — `M01-ANIM-CONTRACT-SIM-V1` (simulação: contrato de apresentação)

- **Entrega:** campos opcionais do Anexo A em `src/game/m01-simulation.js` (um ponto de escrita no fim de `updateActors`; `hitAt`/`diedAt` nos pontos de dano/morte; `reload` nos riflemen; `posture='prone'` para sapadores suprimidos no local do reparo; `carry` em Bąk; `cover` derivado), validação atómica, defaults para saves antigos, `diagnostics` por actor. `actorHitboxes`/`eyePosition` em `src/world/spatial.js` só para `posture='prone'` genérico (caixas orientadas, reutilizando a abordagem MG34).
- **Decisões a confirmar com o utilizador antes de mudar velocidades (secção 11):** transporte de Bąk a 1,6 m/s.
- **Fora de âmbito:** renderer, clips, RNG, combate, gates, CP-A..D, mapa.
- **Testes:** unidade do contrato; `compareContinuation` nos momentos de 7.1; rotas completas (ajuda/ignora) com resultados iguais excepto onde a velocidade de transporte mudou; corrupção; legacy 86/89.
- **Pronto quando:** I1, I9, I10, I15 provados; `tests/m01-schema2-determinism.test.js` verde; `DEVELOPMENT_STATUS.md`/`ENGINE_CONTRACT.md` actualizados com os campos.

### TASK B — `M01-ANIM-LOCOMOTION-RESOLVER-V1` (renderer: resolver + player + proxies)

- **Entrega:** `src/render/m01-animation-resolver.js` (puro) e `src/render/m01-animation-player.js` (acções persistentes, máscaras `upper/lower` geradas no carregamento, aditivos, fundidos em tempo de missão), integração em `M01Characters.update()` com precedência dos adaptadores; `actorPose` com odómetro e `diedAt`; tiers N/M/F/proxy chaveados pelo relógio; diagnósticos (`plan`, `missing`, tier).
- **Fallback sem TASK A:** `motion` ausente ⇒ velocidade observada entre amostras do mesmo relógio (como o piloto), `bodyYaw` ausente ⇒ `facing`, `diedAt` ausente ⇒ pose final, `hitAt` ausente ⇒ sem flinch. **Fallback sem TASK C:** só idle/walk/run/crouched_idle/aim/fire_bolt/reload_clip/pinned/fallen; o resto em `missing`.
- **Fora de âmbito:** campos de simulação, clips, IK de pés/mãos, variação visual.
- **Testes:** 7.1 (resolver/transições), 7.2 (I2, I3, I4, I5 com clips existentes, I6, I11, I13, I14), spec de navegador (a) e (c).
- **Pronto quando:** F1 (com clips existentes, taxa limitada), F2 (fallback de chase no renderer até A existir, sem estado persistido além do frame), F3, F4 (com `diedAt` quando existir), F6 e F15 resolvidos nos testes; piloto de riflemen substituído, com a sua métrica e auditoria portadas.

### TASK C — `M01-ANIM-CLIP-LIBRARY-V2` (assets: `tools/assets/m01-soldiers/src/clips.mjs` e novos geradores)

- **Entrega:** clips novos do Anexo B com metadados `extras` (família, máscara, velocidade nominal, passada, contactos, eventos), continuidade verificada nos extremos (padrão das transições do arrasto), re-autoria de `carry_wounded` → `carry_walk` 1,6 m/s mantendo o antigo intacto, galeria por clip, `tests/m01-soldiers-glb.test.js` estendido; manifesto com SHA-256 dos ficheiros preservados.
- **Fora de âmbito:** `src/`, simulação, LOD de malhas, texturas, cabeças/equipamento.
- **Testes:** GLB (ossos, tempos, continuidade, metadados vs medição a 240 Hz, clipe/arma escalados, raiz in-place), mixer real nos contactos (pés ≤ 15 mm; mãos nos sockets).
- **Pronto quando:** todos os clips do Anexo B existem com metadados coerentes, capturas inspeccionadas, nenhum clip antigo alterado.

### TASK D — `M01-ANIM-CREWS-EVACUATION-V1` (sim + renderer: guarnições e evacuações)

- **Entrega:** MG34 — associação `mg34Prone.loader` por ID, munição mínima (rajadas por tambor), fase `reload` 4,8 s com `feed` sincronizado, `leave` na retirada, fundidos 0,2 s nos cortes; ckm — fases `aim`/`feed`/`fire_burst` como dados com plano de rajada, política de fogo gated por decisão explícita (secção 11), saída da casamata por caminho sem flutuação; Bąk — `carry.phase` pickup/carry/putdown com o par de clips (fallback: ligação imediata ao socket como hoje); estação — pés na encosta via tier N quando a TASK E existir, nada mais.
- **Fora de âmbito:** resolver genérico, clips genéricos, variação.
- **Testes:** padrão `m01-mg34-prone-runtime/presentation` para municiador/recarga; `m01-ckm-runtime` para as fases; `m01-station-drag-runtime` intacto; determinismo com saves a meio de `feed`/`reload`/`pickup`; morte de qualquer membro limpa associações; sem tiros/clarões inventados.
- **Pronto quando:** F10, F12, F13 fechados; I12 mantido para o que não mudou; evidências por continuação de saves reais.

### TASK E — `M01-ANIM-FIDELITY-IK-BUDGET-V1` (renderer: IK, terreno, fidelidade, orçamento)

- **Entrega:** `src/render/m01-foot-ik.js` (amostragem do terreno por pé com `world.heightAt`, pélvis ≤ 12 cm, pitch/roll do pé, IK analítica de dois ossos portada do gerador), `src/render/m01-hand-pin.js` (pino nos sockets durante fundidos), inclinação da raiz para ajoelhado/prone/ferido em rampas, política de fidelidade com contadores, relatório do benchmark por tier (sem FPS declarados), módulo activável por preset.
- **Independência:** desenvolvido como módulos puros com harness próprio sobre o player existente; a ligação ao plano da TASK B entra atrás de um interruptor, por omissão desligado até B existir.
- **Fora de âmbito:** simulação, clips, hitboxes.
- **Testes:** I7, I8, I2 com IK ligado (determinístico), botas ≤ 2 cm do terreno nas rampas, raiz XZ/hitboxes inalteradas, custo por tier medido com o instrumento.
- **Pronto quando:** F17, F18, F19 fechados no tier N; relatório de orçamento publicado como medição, não como aprovação.

Ordem de merge recomendada (não obrigatória): A → B → C → D → E. Qualquer uma pode entrar primeiro graças aos fallbacks.

## 10. Considerações transversais

- **Facing.** `facing` continua a ser a direcção de combate instantânea (tiros, boca do cano em prone, raios). `bodyYaw` é a direcção do corpo, suavizada na simulação. A mira usa `aimOffset`; o corpo persegue. Nunca rodar a raiz com um yaw calculado no renderer quando `bodyYaw` existe.
- **Foot planting.** Fase por odómetro autoritativo + taxa por velocidade + escolha de clip por `|log(rate)|` + janelas de contacto nos metadados. O pé de apoio no arranque é escolhido para coincidir com a janela de contacto do clip de destino. IK só corrige altura/inclinação, nunca a posição XZ do apoio.
- **Weapon sockets.** Fonte única: `extras.sockets` da arma (`grip_r`, `grip_l`, `muzzle`, `butt`, `rear_sight`, bolt/clip/mag). Pino de mãos, clarão e teste de boca do cano lêem os mesmos sockets. Famílias de pega definem que fundidos são permitidos.
- **Muzzle alignment.** O clarão, o fumo e os tiros usam o socket da arma do frame amostrado; a simulação continua a calcular origens com `eyePosition`/`muzzlePosition`. Teste ≤ 2 mm já existente para MG34 é estendido a riflemen, rkm e ckm.
- **Hitbox compatibility.** Postura que altera silhueta além do envelope é autoritativa (`crouched`, `posture`, `mg34Prone`); aditivos cabem dentro do envelope (flinch ≤ 12 cm na cabeça); I7 testa transições.
- **Deterministic simulation.** Só relógio da missão e instantes guardados; hashes por ID; sem RNG; A/B por tick cobre os campos novos; amostragem chaveada pelo relógio em vez de por frame.
- **Animation blending.** Máscaras por vistas de clip (sem média 50/50), aditivos nativos do Three.js, pesos explícitos, fundidos em tempo de missão com pesos iniciais do vector corrente.
- **Distance LOD.** Tiers N/M/F/proxy com camadas e Hz decrescentes; limites 18/24/28 mantidos; troca de LOD sem mudança de plano; proxies também animam por odómetro e `diedAt`.
- **CPU budget.** Alvos a medir no preset baixo: resolver ≤ 10 µs por actor (o protótipo mediu 34 µs numa versão não optimizada), mixer ≤ 0,15 ms por instância do tier N, total animação ≤ 3 ms por frame com 18 instâncias e 89 proxies. Instrumento: benchmark do Chromebook; sem números de FPS antes do aparelho.
- **Browser/Three.js.** `AnimationMixer` sem máscaras nativas (resolvido por vistas), `setTime` avalia o frame, `SkeletonUtils.clone` por instância, skinning de 61 ossos no vertex shader, `InstancedMesh` para proxies, SwiftShader no CI (testes de estado e continuação de saves, capturas inspeccionadas), pointer lock com os padrões já usados nos specs.

## 11. Riscos e decisões em aberto (para o utilizador)

1. **Velocidade de transporte de Bąk** (3 → 1,6 m/s): muda o instante de entrega; verificar na rota completa que a prontidão da demolição oeste (06:45) se mantém. Alternativa sem mudar gameplay: autorar `carry_jog` a 3 m/s, pouco credível com um ferido ao ombro.
2. **Sprint do pelotão**: manter 5,5 m/s e autorar `sprint` (recomendado) ou baixar a velocidade (altera a janela 06:10–06:45).
3. **Sapadores deitados sob fogo** (`posture='prone'`): coerente com o HUD e sem efeito nos tiros (aliados não são alvo), mas muda `eyePosition` dos sapadores; confirmar que nenhuma regra usa a sua linha de visão.
4. **Política de fogo da ckm**: decisão de gameplay; este passo entrega `aim`/`feed`/`fire_burst` como dados prontos e deixa o disparo real desligado até ordem.
5. **Recarga dos riflemen** por `rounds`: sem efeito na cadência, mas altera os valores de `rounds` nos snapshots; rever fixtures que os leiam.
6. **Fallback de yaw no renderer** (antes da TASK A): chase sem estado persistido além do frame; aceitável como provisório, mas o frame após reload pode diferir até 60° durante 0,3 s. Fica resolvido com `bodyYaw` autoritativo.
7. **Variação visual**: qualquer refactor de `create()` deve ser revisto com o dono dessa tarefa; a regra 1.2 é bloqueante.

## Anexo A — Contrato de dados (schema 2, campos opcionais por actor)

### A.1 Campos

| Campo | Tipo | Escrita (simulação) | Default legacy |
| --- | --- | --- | --- |
| `motion.speed` | número ≥ 0 (m/s) | deslocamento XZ efectivo / dt, fim de `updateActors` | 0 |
| `motion.odometer` | número ≥ 0 (m), monótono | soma do deslocamento efectivo | 0 |
| `motion.gait` | `idle` · `walk` · `run` · `sprint` · `crouch_walk` · `carry` · `drag` | classe da velocidade comandada (tabela: 0 ⇒ idle; ≤ 2,2 ⇒ walk; ≤ 4,4 ⇒ run; > 4,4 ⇒ sprint; `carriedBy` activo no outro ⇒ carry/drag; `crouched` ⇒ crouch_walk) | derivado de `state` (`ADVANCE`/`RETREAT` ⇒ walk; pelotão ⇒ run) |
| `motion.gaitSince` | relógio | quando `gait` muda | `clock − 1` |
| `bodyYaw` | radianos | persegue `facing`: 180°/s parado, 360°/s em movimento, caminho mais curto, igual a `facing` em prone/montado/sentado/ferido/transportado | `facing` |
| `posture` | `stand` · `crouch` · `prone` | só `prone` acrescenta semântica; `crouched` continua autoritativo | de `crouched` |
| `postureSince` | relógio | quando `posture`/`crouched` muda | `clock − 1` |
| `suppressedAt` | relógio | sempre que `suppressedUntil` aumenta | `suppressedUntil − 1,5` |
| `hitAt`, `hitYaw` | relógio, radianos | em `fire()` e granadas, quando há dano; `hitYaw` = direcção de onde veio o tiro | `−1e9`, `facing` |
| `diedAt`, `deathYaw` | relógio, radianos | em todos os pontos em que `alive` passa a `false` | `−1e9` (⇒ pose final), `facing` |
| `reload` | `{startedAt, duration, mode}` ou ausente | riflemen com `rounds` a zero; `mode='clip'`, `duration=3,4` | ausente |
| `cover` | `{nodeId, type, side, height}` ou ausente | parado dentro de um `coverNode`; `side` por `facing` vs normal | ausente |
| `carry` (Bąk) | `{phase, startedAt, duration}` | `pickup`/`carry`/`putdown`, 1,6 s | ausente (ligação imediata) |
| `mg34Prone.loader` | ID ou ausente | TASK D | ausente |
| `ckm.*` (`aim`/`feed`/`fire_burst`) | fases com `startedAt` e plano | TASK D | — |
| `vault` | `{nodeId, startedAt, duration, from, to}` | só se um percurso o exigir | ausente |

### A.2 Validação

Todos finitos; relógios em `[0, clock]`; `odometer ≥ 0`; `speed ∈ [0, 8]`; enumerações fechadas; `reload.duration` igual à ficha da arma; `cover.nodeId` existente no mapa; `carry` só em Bąk com `carriedBy` coerente; `posture='prone'` só para aliados fora da lista de alvos designados; campos desconhecidos dentro dos blocos rejeitados; rejeição atómica (padrão `validateM01Snapshot`).

### A.3 Legacy

Saves sem os campos recebem os defaults da tabela na restauração, sem consumo de RNG nem marcador de migração; o primeiro tick normaliza. Saves com os campos preservam-nos exactamente.

### A.4 Hitboxes para `posture='prone'` genérico

Mesma abordagem da MG34: centros em cabeça/torso/pernas ao longo do eixo `facing`, extents interpolados por `progress` da transição (`postureSince`, 1,2 s), AABB envolvente. A simulação actualiza antes dos raios do jogador (como `updateMG34Posture`).

## Anexo B — Inventário de clips

### B.1 Existentes (preservados byte a byte)

Soldados: `standing_idle` 4 s · `aim` 2 s · `fire_bolt` 1,17 s · `reload_clip` 3,4 s · `walk` 1,0 s (1,10 m/s, 120 passos/min) · `run` 0,68 s (3,25 m/s, 176 passos/min) · `crouched_idle` 3 s · `pinned` 2,4 s · `sapper_work` 3 s · `sapper_work_pinned` 2 s · `carry_wounded` 1,25 s (0,645 m/s) · `carried` 2,5 s · `wounded` 2 s · `fallen` 1,4 s · `seated` 4 s · `rkm_standing_idle`, `rkm_walk`, `rkm_run`, `rkm_aim`, `rkm_fire_burst`, `rkm_crouched_idle`, `rkm_prone`, `rkm_prone_fire`, `rkm_reload`, `rkm_clean`. Estação: `drag_wounded` 1,4 s (0,65 m/s), `station_drag_{medic,patient}_{grab,release}` 1,6 s. MG34: `mg34_aim`, `mg34_fire_burst`, `mg34_reload`; deitada: `mg34_prone_{enter,idle,aim,fire_burst,reload,exit}`, `mg34_loader_prone_{idle,feed,leave}`. ckm: `ckm_wz30_{gunner,loader}_{idle,aim,fire_burst,feed,abandon}`, `ckm_wz30_gun_*`.

### B.2 Novos (TASK C), com velocidade nominal/duração estimadas a confirmar na medição

| Clip | Família / máscara | Duração ou velocidade | Notas |
| --- | --- | --- | --- |
| `sprint` | port / full | 5,3 m/s, ~196 passos/min, ciclo ≈ 0,61 s | retirada do pelotão a 5,5 m/s (taxa 1,04) |
| `run_under_fire` | port / full | 3,25 m/s, mesma cadência de `run` | cabeça baixa, ombros encolhidos; alternativa: `duck_additive` |
| `crouch_walk` | low_ready / full | 1,2 m/s | agachado em movimento |
| `carry_walk` | carry / full | 1,6 m/s | re-autoria de `carry_wounded`; o antigo fica |
| `turn_left_90`, `turn_right_90` | low_ready / lower (+upper neutro) | 0,5 s | passos in-place; rotação vem de `bodyYaw` |
| `stand_to_crouch`, `crouch_to_stand` | low_ready / full | 0,45 s | extremos = `standing_idle` t0 / `crouched_idle` t0 |
| `prone_enter`, `prone_exit`, `prone_idle`, `prone_flinch` | prone / full | 1,2 s / 1,2 s / 4 s / 0,45 s | rifleman genérico (sapadores); extremos ligados a `crouched_idle` |
| `sapper_cover` | hands_free / full | 2,4 s loop | abrigo sem trabalho de mãos, sobressaltos |
| `standing_idle_b`, `standing_idle_c`, `crouched_idle_b`, `seated_b`, `pinned_b` | respectivas / full | 4 / 4 / 3 / 4 / 2,4 s | variantes com peso em pernas diferentes |
| `fidget_look`, `fidget_shift`, `fidget_helmet`, `fidget_check_rifle` | low_ready / upper ou full | 1,5–2,5 s | one-shots com extremos = idle t0 |
| `death_front`, `death_back`, `death_left`, `death_right`, `death_crumple` | hands_free / full | 1,4–1,8 s | terminam numa pose deitada estável; arma larga (escala/socket) |
| `hit_front`, `hit_back`, `hit_left`, `hit_right`, `near_miss_duck`, `blast_duck`, `recoil_rifle`, `recoil_auto`, `breath_additive`, `look_additive` | additive | 0,22–0,8 s; loops | referência = frame 0 da família |
| `cover_low_idle`, `cover_low_peek_fire_l/r`, `cover_high_idle`, `cover_high_lean_l/r`, `cover_return` | cover / full | 3 s loops; 1,2 s one-shots | alturas 0,9 m (sacos/trincheira) e 1,6 m (parede/portal) |
| `vault_low` | hands_free / full | 0,9 s | só se um percurso o exigir; raiz movida pela simulação |
| `carry_pickup_{carrier,patient}`, `carry_putdown_{carrier,patient}` | carry / full | 1,6 s pares | como as transições do arrasto; `carry_socket` liga no `grip_ready` |
| `seated_pass_canteen`, `seated_receive_canteen`, `seated_cup_turn` | seated / upper | 3–4 s | beats da chamada por `scene.elapsed` |
| `climb_step` (ckm) | hands_free / full | 1,2 s | saída da casamata; depende da geometria do mapa |

Todos in-place, 30 fps, `extras` com `semantic`, `family`, `mask`, `loop`, `nominalSpeedMps`, `cycleDuration`, `strideM`, contactos, `events`, `interrupt`; arma/clipe escalados como nos clips actuais; `weapon` e `carry_socket` coerentes com os sockets do manifesto.

## Anexo C — Convenções de evidência

Capturas são continuações de saves alcançados por controlos da simulação ou galerias isoladas, identificadas como tal; nunca playtest humano nem FPS. Relatórios JSON brutos preservados, retries 0, timeouts inalterados. Cada TASK actualiza `DEVELOPMENT_STATUS.md`, `QUALITY_REPORT.md` e o `ENGINE_CONTRACT.md` da missão quando o contrato muda, e regista limitações explícitas. M01 continua **PROTÓTIPO JOGÁVEL** até ao playtest humano e à medição no Chromebook.
