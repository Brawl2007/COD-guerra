# M01 — Transições do arrasto do ferido da estação (provisórias, geradas)

**PROPOSTA VISUAL PROVISÓRIA.** Quatro clips originais que ligam a pose agachada do médico e a pose deitada do ferido ao arrasto de costas já encenado em S3 (Dudek arrasta o ferido do pátio para a estação). Não estão ligados a `src/`; a simulação continua a decidir associação, trajecto, entrega e baixa. M01 continua **PROTÓTIPO JOGÁVEL**. As capturas não são playtest humano nem medição de FPS no Chromebook.

- Ficheiros: `assets/models/provisional/m01/characters/station-drag-transitions/`, com `m01_station_drag_transitions.glb` (esqueleto de 61 ossos e 4 clips, sem malhas; 408 488 bytes) e `manifest.json`.
- Gerador: `tools/assets/m01-station-drag-transitions/`. Determinístico: duas execuções dão ficheiros idênticos.
- **Reutiliza sem alterar** (SHA-256 e bytes no manifesto; o teste confirma que não mudaram):
  - `m01_soldier_pl_lod1.glb` (rig: nomes, hierarquia e bind dos 61 ossos);
  - `m01_soldier_animations.glb` (`crouched_idle`, `wounded`);
  - `m01_station_animations.glb` (`drag_wounded`) e o seu `station-animations.manifest.json`;
  - o solver de poses de `tools/assets/m01-soldiers/` (só funções exportadas).
- **Clips existentes intactos:** `crouched_idle`, `wounded` e `drag_wounded` não são substituídos; os clips novos têm nomes novos.

```
cd tools/assets/m01-soldiers && npm ci            # módulos e palco reutilizados (pngjs, playwright)
cd ../../.. && node tools/assets/m01-station-drag-transitions/build.mjs   # GLB + manifest.json
CHROME_EXECUTABLE=… node tools/assets/m01-station-drag-transitions/render/capture.mjs   # capturas + import-report.json
node --test tests/m01-station-drag-transitions-glb.test.js
```

## Clips

Todos com 1,6 s a 30 fps (49 frames), sem ciclo, **duração e instantes estimados** (sem captura de movimento). Cada par partilha duração e relógio: médico e paciente arrancam no mesmo instante.

| Clip | Papel | De → para | Eventos (s) |
| --- | --- | --- | --- |
| `station_drag_medic_grab` | médico | `crouched_idle` t=0 → `drag_wounded` t=0 | `hands_contact` 0,70 · `grip_ready` 0,95 |
| `station_drag_patient_grab` | ferido | `wounded` t=0 → pose de arrasto | `hands_contact` 0,70 · `grip_ready` 0,95 |
| `station_drag_medic_release` | médico | `drag_wounded` t=0 → `crouched_idle` t=0 | `hands_release` 0,65 · `settled` 1,60 |
| `station_drag_patient_release` | ferido | pose de arrasto → `wounded` t=0 | `hands_release` 0,65 · `settled` 1,60 |

Fases do agarrar: aproximação das mãos 0–0,70 s (arco de 0,1 m acima do ferido) → pega 0,70–0,95 s (mãos nos ombros, deslizam para debaixo dos sovacos) → erguer 0,95–1,6 s (tronco do ferido levantado ~20° pela anca; bacia e pernas no chão). A libertação é o agarrar ao contrário, frame a frame: pousar 0–0,65 s, abrir e afastar as mãos 0,65–0,90 s (`hands_clear`, documentado no manifesto), regresso a agachado 0,90–1,6 s.

- `hands_contact`: as mãos do médico pousam nos ombros do ferido deitado.
- `grip_ready`: pega fechada; começa a erguer o tronco.
- `hands_release`: o ferido volta a ficar de costas no chão; a pega abre.
- `settled`: ambos nas poses de chegada (`crouched_idle` t=0 e `wounded` t=0).

Os eventos estão em `extras` de cada animação glTF (`userData` no three.js) como metadados de apresentação. Não há flags, horários nem gameplay nos clips.

**Sem deslocação da raiz:** o osso `root` fica na translação de ligação `[0, 0, 0,0618]` e sem rotação em todos os frames; só a anca se move dentro do corpo.

**Sem armas visíveis:** como em `drag_wounded`, os ossos `weapon` e `weapon_clip` têm escala 0 (faixas `STEP`) em todos os clips, nos dois papéis. O ferido não tem arma. O socket `carry_socket` não é usado: isto não é o transporte ao ombro de Bąk.

## Ligação (para o Codex; `src/` não foi alterado)

- **Offset do par:** raiz do ferido em `[0, 0, −0,92]` m no referencial da raiz do médico (rig virado para −Z), com a mesma rotação. Corresponde ao runtime actual: paciente a medic + 0,92 m na direcção `facing`, raiz com rotação `−facing − π/2`.
- **Sequência sugerida:** quando a simulação passa a arrastar, tocar o par `*_grab` (`LoopOnce`, `clampWhenFinished`); no fim, o médico entra em `drag_wounded` e o ferido **segura o último frame** de `station_drag_patient_grab` enquanto dura o arrasto. Na entrega, tocar o par `*_release`; no fim, médico em `crouched_idle` e ferido em `wounded`.
- **Porque segurar a pose de arrasto:** hoje o renderer mantém o ferido em `wounded` durante `drag_wounded`, e as mãos do médico ficam a **0,3266 m** dos ombros. Com a pose de arrasto ficam a **0,1226 m**; num ciclo de `drag_wounded` (43 frames) as mãos ficam a no máximo 0,0058 m do socket `armpit_grip`.
- **Relógio:** amostrar pelo tempo da simulação (pausa e retoma dão as mesmas matrizes; ver captura). Se a simulação começar a arrastar antes de `grip_ready`, é decisão do Codex encurtar ou cortar a transição; o renderer não decide quando o arrasto começa.

## Sockets (referencial do osso `upperarm_l/r` do ferido)

| Socket | l | r | Uso |
| --- | --- | --- | --- |
| `shoulder_on_ground` | `[−0,1015, 0,1068, 0,0670]` | `[0,1003, 0,1002, 0,0781]` | mão em cima do ombro do ferido deitado (`hands_contact`); = posição de `upperarm` + `[±0,01, 0,15, 0,06]` no mundo |
| `armpit_grip` | `[0,0376, 0,1166, −0,0058]` | `[−0,0777, 0,0935, 0,0156]` | mãos do frame 0 de `drag_wounded` com o ferido na pose de arrasto (debaixo dos sovacos, por trás) |

Entre os dois, a mão segue uma curva de Bézier por cima do ombro (`OVER = [0, 0,12, −0,06]`).

## Verificações (manifesto `checks` e teste)

Contactos medidos com cápsulas entre ossos (raios estimados com fardamento: tronco 0,13/0,10 m, crânio 0,10, braço 0,05, antebraço 0,04, mão 0,03, coxa 0,075, perna 0,055, pé 0,045), em todos os frames, com FK própria e com o `AnimationMixer` do three.js.

| Medida | Valor |
| --- | --- |
| mão → ombro em `hands_contact` / `grip_ready` | 0,1619 / 0,1626 m |
| mão → ombro, máximo entre o contacto e a libertação | 0,1856 m |
| erro máximo do IK | 0 |
| pior aperto mão/antebraço contra o ferido | `forearm_r/upper_chest` −0,030 m a 1,33 s (pega) |
| pior aperto de outros membros | `foot_l/upperarm_l` −0,035 m a 0 s, **já existente** em `crouched_idle` + `wounded` |
| ferido: fundo mínimo das cápsulas abaixo do chão | −0,052 m (igual ao `wounded` actual) |

O teste `tests/m01-station-drag-transitions-glb.test.js` confirma:
- hashes, nomes, ausência de malhas e campos do manifesto;
- alvos dos 61 ossos, valores finitos, quaternões unitários, escalas `STEP`, eventos e relógios dos pares;
- extremos iguais às poses reais, libertação igual ao agarrar invertido e raiz parada;
- com o mixer: raízes no lugar, ferido de costas (frente do tronco para cima) e no chão, nenhum osso do corpo acima de 0,8 m, apertos dentro dos limites acima, mãos a menos de 0,2 m dos ombros durante a pega, mãos no `armpit_grip` no fim, e pausa/retoma.

## Galeria (inspeccionada)

Médico `m01_soldier_pl` (`head_pl_a`) e ferido (`head_nowicki`), sem espingarda nem clipe, no palco de `tools/assets/m01-soldiers/render/`, com `GLTFLoader` e `AnimationMixer` oficiais do three.js no Chromium (SwiftShader). Galeria isolada: não corre a partida.

- `drag_grab_sequence.png`: agarrar em 6 instantes (0, 0,35, 0,70, 0,95, 1,3, 1,6 s) nas vistas lateral, frontal e de cima. Inspeccionado: mãos sobre os ombros em `hands_contact`, depois debaixo dos sovacos por trás; cabeça do ferido entre os braços do médico; ferido sempre de costas, bacia e pernas no chão.
- `drag_release_sequence.png`: libertação em 0, 0,35, 0,65, 0,90, 1,25 e 1,6 s. Inspeccionado: o ferido pousa antes de as mãos abrirem e o médico volta a agachado.
- `drag_contacts.png`: grandes planos dos eventos, ciclo de `drag_wounded` com a pose de arrasto segura e comparação com o runtime actual (`drag_wounded` + `wounded`, mãos longe dos ombros). Mostra também que os extremos coincidem com as poses reais.
- `drag_pause_restore.png`: o mesmo instante depois de saltar no relógio; 0 píxeis diferentes nos dois pares.
- `import-report.json`: 4 clips, 70 faixas cada, 1,6 s; 0 erros.

## Limitações

- Durações, eventos e raios de contacto são **estimados**. A pega pelos sovacos por trás foi inferida do `drag_wounded` existente e da posição do ferido na simulação; não é uma técnica documentada para 1939.
- Cápsulas não são a pele: o aperto do antebraço no peito durante a pega (≈3 cm) e o do pé esquerdo junto ao braço do ferido (já presente nas poses actuais) podem ver-se de perto.
- O `drag_wounded` existente não foi alterado; o médico continua a arrastar com o ferido parado em relação a ele (sem calcanhares a raspar no chão).
- Falta: ligar os pares no runtime (Codex), rever em jogo e no playtest humano.
