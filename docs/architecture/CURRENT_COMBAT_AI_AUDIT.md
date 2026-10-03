# CURRENT_COMBAT_AI_AUDIT

Task: `M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1`  
Base auditada: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`  
Escopo: auditoria somente. Nenhum runtime de produção foi alterado.

## Resumo executivo

A base contém **três camadas distintas** que não devem ser confundidas:

1. **IA genérica/legada** em `src/game/actors.js` + `src/world/world.js`: possui uma state machine pequena, memória visual simples, procura de cover, peek, flank por papel, recarga e reação a granada.
2. **M01** em `src/game/m01-simulation.js`: usa entidades de dados próprias, movimento por alvo/roteiro e fogo dirigido por fase da missão, LOS, cooldown e RNG determinístico. Não instancia a `Soldier.update()` genérica para tomar decisões táticas.
3. **Batalhas distantes** em `src/game/sector-battle.js`: são agendas reduzidas e autoradas (`advance/bombardment/retreat/regroup`), independentes da câmera, não IA individual completa.

Consequência: a IA futura de M01 não deve ser implementada como uma expansão cega de `AI_STATES`, nem como remendo dentro do renderer. O caminho seguro é um núcleo de decisão puro e determinístico que possa ser integrado depois por adaptadores.

## Legenda

- **EXISTS** — comportamento realmente existe de forma reutilizável ou operacional.
- **PARTIAL** — existe parte do contrato, mas falta generalização/qualidade.
- **SCRIPTED** — existe somente por regra de missão, ator ou evento específico.
- **MISSING** — não existe no comportamento tático atual relevante.

## Loops e ownership atuais

| Área | Estado | Evidência na base | Observação |
| --- | --- | --- | --- |
| Loop genérico de soldado | EXISTS | `Soldier.update()` em `src/game/actors.js` | Não é o cérebro tático da M01 atual. |
| Loop de atores M01 | EXISTS | `M01Simulation.updateActors()` | Move grupos, tarefas, evacuação, CKM e alvos autorados. |
| Loop de combate M01 | EXISTS | `M01Simulation.updateCombat()` | Seleciona disparos por fase/grupo, LOS, cooldown e supressão temporal. |
| BattleSector distante | SCRIPTED | `SectorBattle.update()` | Agenda autorada reduzida; adequada como referência para FAR, não para NEAR. |
| Renderer como decisor | EXISTS (regra correta) | `AGENTS.md` / arquitetura atual | Renderer lê estado; não deve decidir combate. |

## Auditoria comportamento por comportamento

| Comportamento | Estado | O que existe hoje | Lacuna para a arquitetura futura |
| --- | --- | --- | --- |
| Estados de IA | PARTIAL | `AI_STATES` legado: GUARD, ALERT, TAKE_COVER, MOVE_TO_COVER, PEEK, SUPPRESS, ADVANCE, FLANK, RETREAT, RELOAD, HIT_REACTION, DOWN, INVESTIGATE. M01 usa strings semelhantes de forma ad hoc. | Não há contrato comum de transição, prioridades ou separação entre ordem e ação. |
| Cooldown de tiro | EXISTS | Genérico usa ms; M01 usa segundos e cooldown por arma/fase. | Normalizar unidades/ownership antes de integração futura. |
| LOS real | EXISTS | `world.lineOfSight()` -> `visible()` -> obstáculos/terreno. | Percepção ainda é quase só visão direta em decisões táticas. |
| Facing | EXISTS | Movimento e tiro atualizam `facing`. | Falta política de facing por ação/cover/porta e limites de rotação. |
| Cover físico M01 | EXISTS | `map-layout.json` fornece cover nodes; `TczewWorld.coverAt()` reconhece cover próximo do ator. | `coverAt()` não escolhe cover; apenas identifica proximidade. |
| Escolha de cover genérica | PARTIAL | `World.findCover()` pontua ocultação, viagem, janela e distância; evita pontos ocupados por proximidade. | Não usa cover nodes da M01, direção explícita, reserva com lease, objetivo, arma/função ou custo de rota. |
| Cover direction | PARTIAL | `World.coverScore()` recompensa estar escondido pelo LOS. | Não há contrato explícito de “protege do norte, não do sul” na M01. |
| Cover reservation | MISSING | Genérico recebe uma lista de cover/pontos ocupados. | Não existe `reservedBy/reservedUntil`, lease, renovação ou expiração. |
| Peek | PARTIAL | Genérico procura offsets cardinais com LOS. | Não existe sistema de arco de tiro/side peek na M01. |
| Flank | PARTIAL | Papel `flanker` chama `findFlank()` no mundo legado. | Não verifica ordem, força disponível, exposição, objetivo ou risco; M01 não o usa. |
| Percepção visual | PARTIAL | Genérico vê alvo <650 unidades + LOS; M01 verifica LOS quando escolhe alguns alvos. | Não há sensor/contato unificado nem campo de visão/reaction delay na M01. |
| Som | MISSING | Sem memória tática de som. | Precisa gerar observações sem revelar posição exata. |
| Impacto próximo | PARTIAL | M01 usa near miss para `suppressedUntil`. | Impacto não cria ThreatMemory reutilizável nem direção de supressão persistida. |
| Ally report / rádio | MISSING | Existem diálogos/eventos, mas não propagação de contato entre cérebros. | Precisa fonte de percepção com confiança menor que visão. |
| Muzzle flash | PARTIAL | Kowal escolhe inimigos que dispararam recentemente via `firedAt`. | É regra específica, não sensor reutilizável. |
| Last known position | PARTIAL | Genérico guarda `lastSeen` por 6 s. | M01 não possui memória tática; genérico mantém apenas posição/confiança implícita, sem fonte/decay estruturado. |
| Tracking através de parede | PARTIAL | Genérico usa `lastSeen`, não posição atual, quando perde LOS. M01 só mira alvo atual se LOS para vários casos. | Falta teste/contrato comum para impedir que integrações futuras usem posição atual invisível. |
| Supressão | PARTIAL | M01 tem `suppressedUntil`; near miss, fogo de Kowal e tiro do jogador estendem temporizadores. | Não há intensidade, decay contínuo, direção, acumulador por fonte ou efeito graduado. |
| Pinned | SCRIPTED/PARTIAL | Pose “pinned” deriva de `suppressedUntil`; engenheiros param trabalho; MG espera recuperação. | Não existe estado tático PINNED distinto com regras de saída. |
| Crouch | PARTIAL | Genérico e M01 usam `crouched`; inimigos M01 agacham enquanto suprimidos. | Falta relação consistente com cover height, exposição e navegação. |
| Fire and maneuver | MISSING | Não há alternância coordenada de teams A/B. | Precisa coordenação de esquadrão, slots e handoff de fogo. |
| Squad cohesion | MISSING | Há `group`, `role` e formações roteirizadas. | Sem líder, membros, distância de coesão, rally ou decisão coletiva. |
| Enemy groups | EXISTS | M01 usa `grp_de_east`, `grp_de_spans`, `grp_east_platoon`, CKM crew etc. | Grupos são ótimos IDs para futuro adaptador, mas hoje não são squads táticos genéricos. |
| Retreat | SCRIPTED | M01 muda destinos/estados após eventos; CKM e pelotões têm rotas autoradas. | Sem decisão contextual “away from threat -> rally -> friendly sector”. |
| Regroup | SCRIPTED | `SectorBattle` tem evento regroup. | Não existe ação individual/squad de reagrupamento na M01 próxima. |
| Grenade throw NPC | MISSING | M01 só lança granada do jogador; sistema legado também é centrado no jogador. | Precisa validação de arco, distância, aliados e cooldown tático. |
| Grenade reaction | MISSING em M01 / EXISTS legado | `GrenadeSystem` legado marca danger, TAKE_COVER e RETREAT via cover. `M01Simulation.updateGrenades()` só move/explode/danifica. | Portar conceito depois, sem integrar nesta tarefa. |
| Artillery/explosion reaction | MISSING | Explosões têm dano/impacto e eventos roteirizados. | Não há decisão genérica de drop/seek cover/disorient/help wounded. |
| Reload | PARTIAL | Genérico recarrega após 5 tiros. Kowal M01 repõe rounds por regra específica. Inimigos M01 não têm logística geral de magazine. | Falta escolha “recarregar protegido” e urgência. |
| Ammo awareness | PARTIAL | Há `rounds` em alguns atores. | Sem estados low/critical/empty, conservação, pedido de munição ou troca de arma. |
| Roles | PARTIAL | Dados incluem RIFLEMAN, SUPPORT, ENGINEER e papéis específicos; genérico tem support/flanker. | Papel ainda não alimenta um utility/decision layer consistente. |
| Wounded | SCRIPTED/PARTIAL | Bąk e ferido da estação usam WOUNDED e fluxos de transporte. | Não há severidade generalizada LIGHT/SERIOUS/INCAPACITATED. |
| Help wounded | SCRIPTED | Evacuação de Bąk e ferido da estação têm atores/tarefas específicos. | Sem avaliação genérica de risco, papel, ordem e recursos. |
| Morale / cohesion | MISSING | Não há modelo tático simples por baixas, líder, isolamento e supressão. | Necessário para hold/withdraw/rout sem sistema RPG. |
| Vehicle reaction | MISSING | Sem contrato de abandonar veículo, fugir de fogo ou usar wreck como cover. | Apenas arquitetura futura. |
| Building combat | MISSING/PARTIAL | Mundo conhece prédios e cover node types como WINDOW/DOORWAY/WALL_CORNER. | Nenhuma política de ocupação de doorway/window/room/stair/corridor. |
| Formation spacing | SCRIPTED/PARTIAL | Pelotão leste recebe offsets autorados; genérico evita cover ocupado por raio. | Falta lane/offset genérico determinístico por squad/seed. |
| Friendly fire awareness | MISSING | LOS/trace existem, mas decisão de disparo não faz um pre-shot corridor check reutilizável contra aliados. | Precisa bloqueio/hold-fire quando companheiro cruza a linha imediata. |
| Espaço com jogador | PARTIAL/PROBLEM | Colisão mundial evita paredes, mas escolta M01 pode mover o jogador quando líder se aproxima. | Futuro policy deve impedir empurrões/porta bloqueada/roubo de cover. |
| Difficulty | MISSING | Sem camada de dificuldade tática identificada. | Futuro deve alterar reaction/accuracy/coordination, nunca wallhack. |
| Determinismo M01 | EXISTS | `M01Simulation` usa RNG próprio; decisões de fogo usam `this.rng`. | Núcleo novo deve receber seed/RNG explícito e nunca `Math.random()`. |
| Determinismo legado | PARTIAL | `Soldier` e `SectorBattle` aceitam RNG injetado, mas default é `Math.random`. | Não reutilizar default aleatório no protótipo. |
| Independência da câmera | PARTIAL | `SectorBattle` declara nunca usar camera triggers; teste M01 compara 90 s olhando frente/longe. | `advanceBattle()` usa `inView()` para recuperação de straggler após gate longo: regra de continuidade roteirizada, não deve contaminar decisão tática nova. |
| Quality independence | EXISTS como princípio | LOD/renderer separados da simulação. | Precisa teste explícito no módulo novo. |
| Off-camera combat | PARTIAL/SCRIPTED | SectorBattle continua sem olhar do jogador; M01 mantém eventos/timers. | MID/FAR ainda não têm ponte formal com IA individual. |
| No wall traversal | PARTIAL/EXISTS | `TczewWorld.move()` faz colisão em passos; `traceObstruction`/LOS respeitam sólidos. | Planejamento tático ainda não consulta rotas de forma reutilizável. |
| Lethal platoon rule | SCRIPTED | A cada 20 s sem supressão, `lethalShot()` escolhe ID definido, mas a bala ainda precisa colidir realmente para contar a baixa. | Deve permanecer lógica de missão; não migrar para IA genérica. |

## Pontos fortes a preservar

- Simulação guarda dados e renderer não decide combate.
- LOS e traçado de tiro respeitam obstáculos/terreno.
- M01 já usa RNG determinístico em produção.
- Tiros inimigos são objetos em voo e o acerto precisa acontecer fisicamente.
- Supressão atual já é consequência de projéteis/near misses reais.
- Dados de grupos, papéis e cover nodes oferecem âncoras para um adaptador futuro.
- BattleSector já demonstra que FAR pode avançar sem depender da câmera.

## Problemas estruturais a não copiar

1. Não expandir `M01Simulation.updateActors()` com dezenas de `if(group/id/task)` para toda IA futura.
2. Não tratar `suppressedUntil` como sistema completo de moral/supressão.
3. Não usar `coverAt()` como seletor de cover.
4. Não transformar cada comportamento em novo `AI_STATES`; ordens, ação imediata, postura e condição devem ser eixos separados.
5. Não usar a posição atual do jogador quando só a última posição conhecida está autorizada.
6. Não ligar decisão a câmera, LOD ou quality.
7. Não mover o jogador como solução de crowding.
8. Não reutilizar `Math.random()` dos defaults legados.

## Fronteira recomendada para integração futura

A arquitetura nova deve entrar futuramente entre percepção/dados de missão e movimento/armas:

```text
mission order + perception events + squad context + world query
                         |
                         v
              Combat AI decision core
                         |
                         v
intent: move / hold / peek / suppress / reload / evade / retreat
                         |
                         v
existing movement + LOS + projectile + animation adapters
```

Nesta tarefa, essa fronteira será apenas prototipada e testada fora do runtime principal.
