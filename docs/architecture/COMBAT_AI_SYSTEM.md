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


## 12. Perception: observações, não conhecimento mágico

O cérebro não recebe diretamente “player current position” como verdade universal.
Recebe observações.

```js
Observation {
  kind: 'VISION' | 'HEARING' | 'IMPACT' | 'ALLY_REPORT' | 'RADIO' | 'MUZZLE_FLASH',
  sourceId: string | null,
  perceivedPosition: {x, z} | null,
  direction: {x, z} | null,
  confidence: 0..1,
  uncertaintyRadius: number,
  observedAt: number
}
```

### 12.1 Fontes

**VISION**
- exige LOS e limites de percepção definidos pelo adapter;
- pode atualizar posição com confiança alta;
- a posição deixa de ser atualizada no instante em que LOS é perdido.

**HEARING**
- informa posição aproximada ou direção;
- nunca fornece coordenada exata do emissor silenciosamente;
- confiança depende do tipo/distância/oclusão.

**IMPACT**
- near miss pode informar direção aproximada do fogo;
- aumenta supressão;
- não identifica automaticamente o atirador.

**ALLY_REPORT**
- compartilha a última observação do aliado;
- confidence é limitada pelo reportante e sofre atraso;
- nunca fica mais precisa que a observação original.

**RADIO/ORDER**
- pode indicar setor ou objetivo;
- não equivale a visão em tempo real.

**MUZZLE_FLASH**
- só existe se o flash/disparo foi percebido;
- pode reforçar direção/posição aproximada;
- a regra específica de Kowal por `firedAt` é referência de intenção, não implementação genérica.

## 13. ThreatMemory

```js
ThreatMemory {
  sourceId,
  lastKnownPosition,
  confidence,
  uncertaintyRadius,
  seenAt,
  heardAt,
  reportedAt,
  lastObservationAt,
  lastDirection,
  classification
}
```

Regras:

1. `lastKnownPosition` só muda por nova observação autorizada.
2. Perder LOS **não** copia a posição atual do alvo.
3. Confidence decai com tempo; uncertainty cresce.
4. Ao cair abaixo do limiar de confiança, a memória deixa de autorizar mira precisa.
5. Memória fraca ainda pode autorizar “watch/suppress provável saída”, nunca tracking exato.
6. Um alvo invisível que percorra 20 m atrás de parede não desloca `lastKnownPosition`.

Curva inicial proposta para o protótipo:

```text
vision exact:       confidence 1.00
muzzle flash:       <= 0.85
ally report:        <= 0.75
hearing:            <= 0.60
impact direction:   <= 0.50

decay: fonte específica
confidence < 0.20 -> memória tática expira
```

Os números são parâmetros de protótipo, não balance final.

## 14. Cover data contract

O futuro adapter deve converter cover nodes do mapa para:

```js
CoverNode {
  id,
  position: {x, z},
  type,
  height,
  protectionDirections: [{x, z}],
  firingArcs: [{minYaw, maxYaw}],
  capacity,
  occupancyRadius,
  active
}
```

`protectionDirections` aponta para os setores dos quais o node oferece proteção.
Uma parede que protege contra ameaça a norte não recebe score de proteção contra sul.

## 15. Cover candidate gates

Antes de pontuar, rejeitar cover se:

- inativo/destruído;
- fora dos limites impostos pela ordem;
- rota inexistente;
- reservado por outro ator e sem capacidade;
- posição final bloqueada;
- proteção direcional insuficiente quando a urgência é alta;
- exige atravessar exposição absurda para ganho mínimo.

Somente depois calcular score.

## 16. Cover quality score

Score conceitual normalizado:

```text
score =
  + 4.0 * protectionFromThreat
  + 1.4 * routeSafety
  + 1.2 * firingArcUtility
  + 0.8 * squadSpacing
  + 1.0 * objectiveAdherence
  + 0.8 * roleWeaponFit
  - 1.4 * normalizedTravelDistance
  - 1.2 * crowdingRisk
```

Não escolher simplesmente o node mais próximo.

### 16.1 Protection from threat

```text
threatDirection = normalize(threatPos - coverPos)
protection = max(dot(threatDirection, each protectionDirection))
```

Ameaça oposta à face protegida deve produzir proteção baixa/zero.

### 16.2 Route safety

Pode começar simples:

- rota existe;
- porcentagem do segmento exposta à ameaça;
- cruza doorway congestionado;
- passa por área de explosão/granada;
- cruza linha de fogo amiga.

Não é necessário pathfinding militar perfeito.

### 16.3 Role / weapon fit

- machine gunner: valoriza arco estável e campo de fogo;
- rifleman: balanceado;
- medic: valoriza proteção/acesso ao ferido;
- engineer: forte penalidade por abandonar objetivo técnico;
- leader/NCO: valoriza posição que mantém coesão/visibilidade da equipa.

## 17. Cover reservation

Contrato mínimo:

```js
CoverReservation {
  coverNodeId,
  reservedBy,
  reservedUntil,
  purpose
}
```

Política:

- reserva tem lease curto;
- ator renova enquanto realmente avança/ocupa;
- morte, incapacidade, troca de destino ou timeout libera;
- nunca manter lock permanente;
- disputa simultânea usa desempate determinístico por actor ID/decision serial;
- cover com capacidade >1 usa slots distintos, não a mesma coordenada.

Isso substitui a heurística frágil “lista de pontos ocupados” do legado.

## 18. Suppression model

Supressão é estado comportamental, não dano.

```js
SuppressionState {
  intensity: 0..1,
  sourceDirection: {x, z} | null,
  lastEventAt,
  lastUpdatedAt
}
```

Eventos possíveis:

```text
round impact muito perto    + alto
near miss                   + médio
burst sustentada            + acumulativo
explosão próxima            + alto
hit sem incapacitação       + alto
tempo sem pressão           -> decay
```

### 18.1 Direção

Eventos carregam direção estimada da origem. Ao acumular:

```text
sourceDirection = normalized weighted average of recent suppression sources
```

Isso permite preferir cover que proteja do lado correto.

### 18.2 Decay e hysteresis

Parâmetros iniciais do protótipo:

```text
SUPPRESSED threshold = 0.35
PINNED enter         = 0.72
PINNED recover       = 0.48
decay                = contínuo quando não há eventos
```

Usar limiar de saída menor evita alternância PINNED/unpinned a cada tick.

### 18.3 Efeitos

**SUPPRESSED**
- menor willingness de expor;
- precisão reduzida dentro de limites;
- interrompe avanço arriscado;
- aumenta preferência por cover;
- pode solicitar suppressive support.

**PINNED**
- bloqueia flank/bound agressivo temporariamente;
- mantém cover/postura baixa;
- permite short withdraw seguro se ordem/política autorizarem;
- nunca congela para sempre: decay/recovery continua.

## 19. Reload preference

Reload não é só timer:

```text
ammo empty
+ under direct threat
+ valid cover nearby
=> seek/duck behind cover
=> reload

ammo empty
+ no route / immediate close threat
=> emergency exposed reload or weapon switch policy
```

O core retorna intenção; o adapter de arma continua responsável pela animação/tempo real.

## 20. Grenade perception/reaction contract

Ao perceber granada:

1. estimar blast-risk;
2. procurar ponto alcançável antes da detonação;
3. preferir cover que interponha sólido;
4. evitar correr para junto de aliados/parede sem saída;
5. retornar `EVADE_GRENADE`;
6. após risco, reavaliar a ordem original.

Para lançar granada:

- range/arc plausível;
- rota balística básica sem obstáculo imediato;
- nenhum aliado na zona de risco;
- ameaça conhecida com confiança suficiente;
- cooldown/budget por squad;
- ordem permite.

Nada de spam.

## 21. No-magic-tracking acceptance rule

Teste obrigatório do core:

```text
t0: player visible at (10, 0)
t1: vision observation stored
t2: player moves behind wall to (30, 0)
t3: no new observation

expected:
ThreatMemory.lastKnownPosition == (10, 0)
not (30, 0)
confidence decays
```

Câmera, quality e posição real invisível não podem alterar o resultado.


## 22. Squad model

Um squad é coordenação leve, não um “hive mind”.

```js
SquadState {
  id,
  leaderId,
  memberIds,
  order,
  contactSector,
  suppressorIds,
  moverIds,
  rallyPoint,
  cohesion: 0..1,
  morale: 0..1,
  grenadeBudget,
  lastCoordinationAt
}
```

Cada soldado continua a decidir sobrevivência local. O coordinator só distribui permissões e papéis temporários.

## 23. Fire and maneuver

Fluxo mínimo:

```text
contact confirmed
-> choose 1..N suppressors with LOS / useful arc
-> choose movers with valid covered route
-> suppressors fire bounded bursts
-> movers receive BOUND_MOVE slot
-> movers reach cover and report READY
-> roles may swap
-> reassess
```

Regras: não mover todos ao mesmo tempo; não deixar todos presos em suppress; abortar bound se suppressors ficarem pinned; respeitar raio da ordem HOLD; support/MG é candidato forte a suppressor, mas não fica preso ao papel eternamente.

## 24. Flanking

`FLANK` só é candidato quando ordem permite, ThreatMemory tem confiança suficiente, rota é válida, parte da equipa mantém pressão/observação, cover final é útil, exposição da rota é aceitável e o movimento não invade setor histórico/proibido. Falhou qualquer gate: usar cover/hold/bound normal.

Nenhum comportamento `role=flanker => sempre flank`.

## 25. Retreat / regroup

Retirada local escolhe destino por score:

```text
awayFromThreat
+ routeSafety
+ friendlyProximity
+ rallyAdherence
+ coverAtDestination
- exposure
- isolation
```

`SHORT_WITHDRAW` preserva a ordem macro. `WITHDRAW` macro vem de mission/leader ou de política de morale explicitamente autorizada. `REGROUP` serve ao ator isolado sem perigo imediato dominante.

## 26. Roles

- **Rifleman:** cover/bound/suppress curto/flank quando autorizado.
- **Machine gunner:** prefere posição estável e firing arc; forte candidato a suppressor.
- **Assistant gunner:** mantém proximidade funcional sem ocupar o mesmo slot.
- **Medic:** prioriza feridos apenas quando risco e ordem permitem.
- **Engineer:** forte aderência ao objetivo técnico; pode baixar/procurar cover local e retomar.
- **Officer/NCO:** distribui order/rally/contact reports; não recebe visão sobrenatural.

## 27. Wounded state model

```text
LIGHT_WOUND
SERIOUS_WOUND
INCAPACITATED
DEAD
```

LIGHT pode continuar com penalidade; SERIOUS reduz mobilidade/combate; INCAPACITATED não combate e pode receber ajuda; DEAD não decide. O sistema real de dano continua fora desta tarefa.

## 28. Help wounded

`HELP_WOUNDED` exige ferido alcançável, helper/recurso compatível, rota aceitável, squad sem perder toda capacidade de fogo, ordem permissiva e destino seguro. Ações futuras: drag, first aid, cover rescuer, call medic.

Os fluxos específicos de Bąk e do ferido da estação continuam sob o script M01 até migração consciente.

## 29. Morale e cohesion

Não é RPG. Dois escalares simples modulam gates.

Cohesion cai com isolamento, leader loss, spacing excessivo e comunicação quebrada. Morale cai com casualties, supressão pesada, explosão catastrófica próxima e isolamento; sobe com líder, reforço, rally seguro e beats de missão.

Efeito: willingness para advance/hold/withdraw. Nunca altera HP, verdade percebida ou cria informação escondida. Historical constraints podem impor piso/teto para preservar a missão.

## 30. Artillery / explosion reaction

Evento de blast inclui posição, classe de raio, intensidade, instante e se a origem é conhecida. Respostas: drop/crouch, seek cover, interromper fogo exposto, short withdraw, desorientação temporária e check de casualties depois do perigo.

Não requer física nova nesta tarefa.

## 31. Vehicle reaction

Evento `VEHICLE_DISABLED/VEHICLE_FIRE` pode gerar crew evacuation, safety radius, uso do wreck como cover quando seguro, afastamento de incêndio e eventual rescue. VehicleController continua fora desta tarefa.
