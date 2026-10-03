# COMBAT_AI_SYSTEM

Task: `M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1`  
Base: `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`  
Status: arquitetura/protótipo isolado; **não integrado à IA de produção**.

## 1. Objetivo

Criar um contrato reutilizável para transformar contatos em decisões plausíveis:

```text
contact
-> localize threat with uncertainty
-> preserve mission order
-> choose immediate survival/combat action
-> coordinate when squad context allows
-> execute through existing movement/fire adapters
-> reassess
```

Sem wallhack, sem rush constante, sem decisões dependentes de câmera/LOD e sem `Math.random()`.

## 2. Não é uma state machine gigante

Um soldado possui eixos separados. Isso evita dezenas de combinações como
`HOLD_ORDER_SUPPRESSED_RELOADING_IN_WINDOW`.

### 2.1 Order layer

A ordem vem de missão/squad e dura mais do que uma ação imediata.

```js
Order {
  type: 'HOLD' | 'ADVANCE' | 'DEFEND' | 'WITHDRAW' | 'COVER_WITHDRAWAL' | 'RALLY',
  anchor: { x, z } | null,
  radius: number,
  facingHint: number | null,
  urgency: 0..1,
  issuedAt: number,
  source: 'mission' | 'leader' | 'radio'
}
```

A ordem delimita liberdade. Exemplo: `HOLD` permite buscar cover dentro do raio,
peek, reload e suppress sem abandonar o setor.

### 2.2 Immediate action layer

Estados curtos, com prioridade e saída explícitas:

```text
IDLE
OBSERVE
SEEK_COVER
MOVE_TO_COVER
HOLD_COVER
PEEK
SUPPRESS
BOUND_MOVE
FLANK
THROW_GRENADE
EVADE_GRENADE
RELOAD
PINNED
SHORT_WITHDRAW
REGROUP
HELP_WOUNDED
CLEAR_DOORWAY
```

`WOUNDED`, `INCAPACITATED` e `DEAD` são condições, não tarefas normais.

### 2.3 Posture layer

```text
STAND | CROUCH | PRONE | MOUNTED | DRAGGING
```

Postura é consequência de ação/cover/arma; não deve decidir a missão.

### 2.4 Condition layer

```js
Condition {
  healthState: 'FIT' | 'LIGHT_WOUND' | 'SERIOUS_WOUND' | 'INCAPACITATED' | 'DEAD',
  suppression: 0..1,
  pinned: boolean,
  ammoState: 'OK' | 'LOW' | 'CRITICAL' | 'EMPTY',
  cohesion: 0..1,
  morale: 0..1
}
```

## 3. Prioridade de decisão

A cada janela de decisão, o cérebro avalia nesta ordem:

1. morte/incapacitação;
2. perigo imediato (granada, fogo, explosão, veículo em chamas);
3. pinned/supressão extrema;
4. recarga obrigatória/arma indisponível;
5. ameaça confirmada ou lembrada;
6. ordem atual;
7. coesão/posição de esquadrão;
8. manutenção de espaço/crowding.

A prioridade não significa recalcular tudo em todo frame. O integrador deve usar
ticks de decisão com jitter determinístico, enquanto movimento/animation sampling
continua por frame.

## 4. Contrato de transição

Toda decisão retorna um `Intent`, sem mover ator nem disparar diretamente:

```js
Intent {
  action,
  targetPosition: {x, z} | null,
  targetActorId: string | null,
  coverNodeId: string | null,
  desiredPosture,
  fireMode: 'NONE' | 'AIM' | 'SINGLE' | 'BURST' | 'SUPPRESS',
  reason,
  validUntil
}
```

O runtime futuro aplica esse intent via adapters existentes de movimento, LOS,
projectile/fire, grenade e animação.

## 5. Regras de transição essenciais

- `SEEK_COVER -> MOVE_TO_COVER`: cover válido e reservado.
- `MOVE_TO_COVER -> HOLD_COVER`: chegou dentro da tolerância.
- `HOLD_COVER -> PEEK`: ameaça conhecida, supressão abaixo do limite, arco útil.
- `PEEK -> SUPPRESS`: LOS ou setor provável autorizado e friendly-fire clear.
- `SUPPRESS -> HOLD_COVER`: burst concluído, ameaça perdida ou supressão recebida.
- `* -> EVADE_GRENADE`: granada percebida com risco suficiente.
- `* -> PINNED`: suppression >= pinned threshold.
- `PINNED -> HOLD_COVER/SHORT_WITHDRAW`: suppression decai abaixo do recovery threshold.
- `* -> RELOAD`: magazine empty; preferir cover quando possível.
- `HOLD_COVER -> BOUND_MOVE`: squad coordinator concede slot de movimento.
- `BOUND_MOVE -> HOLD_COVER`: destino alcançado/risco subiu.
- `* -> SHORT_WITHDRAW`: ordem permite e risco/cohesion exigem.
- `* -> REGROUP`: isolado e sem contato imediato dominante.

Nenhuma transição pode alterar a order layer por conta própria.

## 6. Orders vs behavior

Exemplo:

```text
ORDER = HOLD bridge access, radius 18 m

threat from east
-> SEEK_COVER inside hold radius
-> HOLD_COVER
-> PEEK
-> SUPPRESS
-> RELOAD behind cover
-> HOLD_COVER
```

O soldado continua obedecendo `HOLD`. Só líder/mission/radio pode substituir a
ordem por `WITHDRAW`, salvo uma `SHORT_WITHDRAW` local para sobreviver que
permaneça dentro dos limites configurados.

## 7. Actor brain state mínimo

```js
CombatBrainState {
  actorId,
  order,
  action,
  intent,
  threatMemory,
  suppression,
  reservedCoverId,
  reservationExpiresAt,
  squadId,
  role,
  decisionAt,
  actionStartedAt
}
```

Este estado deve ser serializável no futuro, mas **esta tarefa não altera schema**.

## 8. World-query interface

O núcleo não deve importar diretamente `TczewWorld`. Ele recebe queries:

```js
WorldQuery {
  hasLineOfSight(from, to),
  routeExists(from, to),
  routeExposure(from, to, threat),
  nearbyCover(position, radius),
  isOccupied(position, radius),
  friendlyInFireCorridor(from, to, radius),
  heightAt(x, z)
}
```

Isso permite testes puros e um adapter futuro para `TczewWorld`.

## 9. Deterministic decision context

```js
DecisionContext {
  now,
  dtDecision,
  seed,
  actor,
  allies,
  order,
  observations,
  world,
  camera: ignored,
  quality: ignored
}
```

O RNG é explícito e derivado de seed + actor ID + decision serial. Render quality e
camera podem existir no contexto de integração, mas o core não as consulta.

## 10. Cadência proposta

Não executar path/cover scoring caro em todo frame.

- threat/suppression decay: atualização barata;
- decisão imediata sob grenade/hit: evento;
- reavaliação tática: 4–10 Hz NEAR, com jitter determinístico;
- squad coordination: 2–5 Hz;
- path recalculation: somente quando destino muda, rota invalida ou ator fica preso.

Valores finais precisam ser medidos no runtime; são budgets arquiteturais, não promessa de FPS.

## 11. Relação com a base atual

- Reusar LOS/trace existentes por adapter.
- Reusar movimento/collision existentes por adapter.
- Reusar grupos/roles da M01 como entrada, não como regras hardcoded do core.
- Preservar `lethalShot`, horários, gates e eventos históricos como regras da missão.
- Não chamar `Soldier.update()` legado a partir da M01 nesta tarefa.
- Não alterar `src/game/m01-simulation.js`, `src/world/spatial.js` ou `src/world/tczew-world.js`.
