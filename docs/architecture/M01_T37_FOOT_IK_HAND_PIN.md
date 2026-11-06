# M01 T37 — Foot IK, ramp lean, weapon hand pin and IK fidelity tiers

Estado: implementado no renderer (apresentação apenas). Portado da entrega externa Argon (Gemini) `argon/m01-t37-foot-ik-hand-pin-v1` sobre a candidata `5a169ba`; ver "O que foi rejeitado". Não é playtest nem medição de FPS.

## O que faz

`M01Characters.update(actors, time, player, quality, battleClock, world)` aplica, depois de tudo o que o clip e as correcções aditivas já fazem (`resolveTorsoOrientation`, `resolveSupportHandIK`), um passo de IK aos actores skinned seleccionados:

| Modo (por distância/orçamento) | Faz |
| --- | --- |
| `full` | inclinação da pélvis para a rampa + IK de 2 ossos nas pernas + alinhamento do pé (pitch em 2 passagens, roll subtalar) + `hand pin` |
| `foot_slope` | igual sem `hand pin` |
| `slope_only` | inclinação do tronco a partir de `spine_01` (os pés nunca se movem) |
| `clip_only` / `bypassed_exact` | clip puro, zero custo |

- Terreno: `world.heightAt(x, z)` (a mesma função da simulação). Os pés mantêm a posição horizontal do clip; só a altura muda. A pélvis desce até ao pé mais baixo (`<= 24 cm`, `<= 6 cm` para cima) e devolve o deslocamento à coluna, de modo que ombros e mãos ficam onde o clip os pôs.
- Inclinação: eixos do mundo (frente/direita do root renderizado), 36 % do pitch e 26 % do roll do terreno, `spine_01/02` e `neck` devolvem 0,65 + 0,28 (cabeça a ~7 % da inclinação da pélvis).
- Balanço do passo: a elevação do pé em relação ao outro pé (clip) passa pelo `smoothstep(2,5 cm a 6,5 cm)`: estância fica no solo, balanço mantém a sua altura autoral.
- `hand pin`: `hand_l/hand_r` mantêm a posição e orientação **autorais** do clip (a arma e o `muzzle` nunca se movem), com IK de 2 ossos e protracção da clavícula só se o alvo ultrapassa 97 % do alcance.
- Elegibilidade (I7/I8): fora ficam `mg34_*`, `ckm_wz30_*`, `station_drag_*`, `prone_*`, `carry_pickup/putdown_*`, `fallen/wounded/carried/seated/drag_wounded/rkm_prone*`, mortos, feridos, transportados, `posture==='prone'`, guarnições.
- Desfazer: antes de cada amostragem o snapshot pré-IK é reposto (`restoreIkPose`), porque o `AnimationMixer` só reescreve uma propriedade cujo valor mudou (relógio parado, faixas constantes, clavícula sem faixa). IK desligado ou sem `world` = saída idêntica bit a bit.
- Interruptor: `new M01Characters(scene, { ik })`, `setIkEnabled(on)`, e com `?debug=1` `window.m01CharacterIkDebug.setEnabled(on)`.
- Contadores: `gameDiagnostics().m01.characters.ik` (`counts`, `accuracy`, `cost` em ms de `performance.now()`, `byTier`) e `actors[i].ik`. Nunca há FPS.

## Orçamento por tier (`M01_IK_TIER_POLICY`)

| Tier | `full` | `foot_slope` | `slope_only` | `clip_only` |
| --- | --- | --- | --- | --- |
| high | <= 45 m, 16 actores | <= 100 m, 24 | <= 160 m, 28 | resto |
| medium | <= 25 m, 10 | <= 65 m, 16 | <= 130 m, 22 | resto |
| low | <= 12 m, 4 | <= 22 m, 8 | <= 45 m, 12 | resto |

Ordem por distância ao jogador (desempate por id), histerese de 10 % no raio do tier em que o actor já está.

## O que foi rejeitado da entrega externa

- Hand pin ao socket com a origem do osso da mão: nos clips o osso `hand_*` está ~8 cm atrás do socket (a palma está no socket); fixar a origem do osso no socket deslocava as mãos 8 cm. Substituído por "manter a pose autoral".
- Retarget da mão direita ao `bolt_handle` e impulso de recuo em `spine_03` (estético, não pedido; o clip `fire_bolt` já anima a mão).
- Restauro para a bind pose (quebra faixas constantes/pausa); inclinação em eixos locais de `hips`; alvo dos pés após a inclinação (deslizava os pés); sinal errado na projecção do pólo de reserva; alocação por actor/frame (`new Map`, closures, objectos literais, `toFixed`); `TczewWorld` construído por omissão; referências a outro jogo.
- `m01-characters.js` da entrega (base antiga `116c68f`); só os ganchos foram reescritos sobre o ficheiro actual.

## Custo medido (contadores `performance.now()` do próprio módulo, Node, GLB reais)

Mediana por frame do passo de IK, 100 frames estáveis; máquina de CI partilhada com carga ~20 em 4 núcleos, por isso as médias têm picos de pré-emptação e a mediana é o valor útil. Não são FPS nem medida do PC de referência.

| Roster | high | medium | low |
| --- | --- | --- | --- |
| simulação real (11/8/8 actores skinned) | 0,45 ms | 0,31 ms | 0,17 ms |
| sintético denso no limite (28/24/18 actores, rampa de 26,6 graus) | 0,78 ms | 0,61 ms | 0,28 ms |

`TczewWorld.heightAt` (código da simulação) aloca ~0,3 a 0,8 KB por chamada e o IK faz ~15 chamadas por actor; os módulos de IK não constroem objectos THREE por actor/frame (teste A8).

## Provas

`tests/m01-t37-foot-ik-hand-pin.test.js` (Node, GLB reais) e `tests/browser/m01-t37-foot-ik-hand-pin.spec.js` (um smoke no jogo `?debug=1`).
