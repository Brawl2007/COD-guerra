# ckm wz.30 de M01 — arma, tripé, fita, caixa e guarnição (provisório verificado)

Kit isolado para `grp_ckm_crew`, a metralhadora da casamata oeste de M01 — Tczew. Gerado por código original em `tools/assets/m01-ckm-wz30/` (`npm ci && npm run build`; capturas com `npm run render`). Ficha histórica: [`research/weapons/ckm_wz30.md`](../../../research/weapons/ckm_wz30.md). Fonte: T34, só por resumos de busca.

**Estado:** PROVISÓRIO VERIFICADO e ainda **não ligado ao jogo**. As capturas vêm de uma galeria isolada (three.js no Chromium com SwiftShader): não são playtest nem medição de FPS. M01 continua PROTÓTIPO JOGÁVEL.

## 1. O que foi verificado

| Verificação | Como | Resultado |
| --- | --- | --- |
| Importação dos 4 GLB | `GLTFLoader` do three.js 0.186.1 no palco de captura → [`import-report.json`](import-report.json) | 9 malhas, 9 draw calls e 5 clips da arma por LOD; 10 clips no GLB de animações |
| Escala e eixos | `tests/m01-ckm-wz30-glb.test.js` | Arma 1,211 m (1,2 m ± 2 %), boca do cone em −Z, +Y para cima, tripé no chão |
| Transforms finitos | Teste: translações/rotações/escalas dos nós, limites dos vértices e todas as amostras dos clips | Finitos |
| LODs | Teste: orçamento (LOD0 ≤ 4000), ordem decrescente, bytes iguais ao manifesto, normal map só no LOD0 | 3904 → 2298 → 754 triângulos |
| Redução do LOD0 | Teste: caixa da cena, comprimento, volume de cada nó, pivôs, sockets, peças da fita e clips da arma iguais; SHA-256 do LOD1, LOD2 e GLB dos clips iguais aos de `lod0_budget.preserved_sha256`; no three.js, todos os triângulos e as 9 malhas do LOD0 são desenhados (`import-report.json` → `rendered`, duas passagens: sombra e cor); captura antes/depois | 5004 → 3904 (365 kB, 9 draw calls, bbox igual); LOD1, LOD2 e clips byte a byte |
| Pivôs e hierarquia | Teste: tradução local e pai de cada nó iguais ao manifesto; tampa a 110° | OK |
| Clips da arma | Teste: alvos só nos nós móveis; rajada de 8 a 0,1 s; a alavanca recua ~0,055 m por tiro; a fita volta ao pivô (serra); na alimentação a ponta começa fora, a fita vazia aparece depois de puxada e a alavanca vai 0,10 m atrás duas vezes | OK |
| Clips da guarnição | Teste: todos os canais apontam para ossos do esqueleto de `m01_soldier_pl_lod0.glb`; os nomes não repetem os clips dos soldados nem os da rkm; `weapon` e `weapon_clip` com escala 0 (uma só arma) | OK |
| Mãos, olho e poses | Capturas inspeccionadas, abaixo | Ver limitações |

## 2. Nós, pivôs e peças móveis

Raiz `ckm_wz30` no chão, por baixo do pião. `pivot_scene` está no referencial da raiz em repouso.

| Nó | Pai | Pivô (m) | Movimento |
| --- | --- | --- | --- |
| `ckm_tripod` | `ckm_wz30` | 0, 0, 0 | fixo: tripé de três pernas, sapatas com espigões, barra de direcção |
| `ckm_traverse` | `ckm_wz30` | 0, 0,55, 0 | rotação em Y (direcção) no pião |
| `ckm_elevate` | `ckm_traverse` | 0, 0,60, 0 | rotação em X nos munhões; + = boca para cima. Contém a arma inteira |
| `ckm_cocking_handle` | `ckm_elevate` | 0,031, 0,60, 0,13 | translação em +Z: 0,055 m por tiro, 0,10 m à mão |
| `ckm_feed_belt` | `ckm_elevate` | −0,03, 0,655, 0,08 | translação em X: +16 mm por tiro (serra) e entrada pela esquerda |
| `ckm_belt_spent` | `ckm_elevate` | 0,03, 0,655, 0,08 | sai pela direita; escala 0 antes de a ponta ser puxada |
| `ckm_belt_free` | `ckm_wz30` | −0,13, 0,655, 0,08 | fita da caixa à entrada; translação (folga e entrada) |
| `ckm_ammo_box` | `ckm_wz30` | −0,33, 0, 0,08 | fixa, à esquerda da arma |
| `ckm_ammo_box_lid` | `ckm_ammo_box` | dobradiça de trás, y 0,175 | rotação em X; repouso aberta a 110° |

A fita livre vai da caixa à entrada e não segue a direcção nem a elevação. Para ângulos grandes, o runtime pode escondê-la ou deixá-la como está; nos clips a direcção não passa de ±1,2°.

## 3. Sockets (extras da raiz e `manifest.json`)

- **`sockets_gun`**, no referencial de `ckm_elevate` (origem nos munhões):
  - `muzzle` (boca do cano, dentro do cone, z −0,68) e `muzzle_flash` (boca do cone, z −0,83);
  - `trunnion`, `trigger`, `ejection`;
  - **pontos de pega:** `grip_r` (punho) e `grip_l` (lado esquerdo da caixa da culatra);
  - `eye` (olho do atirador), `rear_sight`, `front_sight`;
  - `charging_handle` / `charging_handle_back`, `feed_entry` / `feed_exit`;
  - `water_fill`, `steam_outlet`.
- **`sockets_scene`**, no referencial da raiz:
  - **encaixe no tripé:** `pintle` (pião, y 0,55) e `trunnion` (munhões, y 0,60);
  - `tripod_feet` (3), `box_mouth`, `box_handle`, `elevating_handwheel`;
  - todos os `gun_*` convertidos para a pose de repouso.
- **`hands`:** pulso, direcção dos dedos e normal da palma do atirador para as duas mãos.

## 4. Guarnição e clips

`m01_ckm_wz30_animations.glb` usa o esqueleto do soldado polaco actual. Cada actor recebe o GLB `m01_soldier_pl_*` na posição `crew` do manifesto e toca o clip com o mesmo sufixo do clip da arma; `extras.sync` indica-o.

| Papel | Lugar (raiz da ckm) | Pose |
| --- | --- | --- |
| Atirador | (−0,029, 0, 0,794), yaw 0 | sentado no chão atrás da arma. Inclinação de 15,5°, resolvida para pôr o olho direito na linha alça–massa. Mão direita no punho, esquerda no lado da caixa da culatra |
| Municiador | (−0,52, 0, −0,08), yaw −112° | de joelho à esquerda, do lado da caixa; mãos na fita (esquerda por baixo) |

| Sufixo | Duração | Arma (`ckm_wz30_gun_*`) | Eventos (`extras.events`) |
| --- | --- | --- | --- |
| `idle` | 4 s, ciclo | parada | — |
| `aim` | 3 s, ciclo | direcção ±1,2°, elevação ±0,35° | — |
| `fire_burst` | 1,3 s | 8 tiros a 600/min: salto da boca, alavanca e fita por tiro | `fire` 0…0,7 s de 0,1 em 0,1 |
| `feed` | 3,2 s | o municiador mete a ponta, o atirador puxa-a para a direita e arma duas vezes | `belt_in` 0,8 · `belt_pulled` 1,3 · `handle_back` 1,7 e 2,25 · `ready` 3,0 |
| `abandon` | 3 s | arma em repouso | `released` 0,4 · `standing` 1,6 · `leave` 2,2 |

Os nomes são `ckm_wz30_gunner_<sufixo>` e `ckm_wz30_loader_<sufixo>`. Nenhum clip existente foi substituído. A espingarda e o clipe do soldado ficam com escala 0 em todos os clips, para cada atirador mostrar uma só arma. O terceiro homem não tem clips novos: pode usar os clips já existentes dos soldados.

## 5. LODs, materiais e texturas

| Ficheiro | Bytes | Triângulos | Texturas | Uso sugerido |
| --- | --- | --- | --- | --- |
| `m01_ckm_wz30_lod0.glb` | 364 660 | 3904 | cor 1024² JPEG, ORM 512², normal 512² (atlas próprio) | perto (< 15 m) |
| `m01_ckm_wz30_lod1.glb` | 194 356 | 2298 | cor 512², ORM 256² | 15–40 m |
| `m01_ckm_wz30_lod2.glb` | 84 208 | 754 | cor 256² | longe / Chromebook |
| `m01_ckm_wz30_animations.glb` | 891 712 | — | — | 10 clips da guarnição |

- **Material:** um só, com atlas procedural (~689 px/m): aço oxidado, manga com marcas de calor, tripé verde-caqui com lascas e lama, caixa caqui, madeira, tecido da fita, latão e balas de tombak.
- **Orçamento:** o LOD0 cabe nos 4000 triângulos previstos em `assets-m01.json` para "armas de apoio": passou de 5004 para 3904 (`manifest.json` → `lod0_budget`). O gerador faz uma variante leve só para o LOD0 (`buildCkm({ lean: true })`):
  - cartuchos sem as partes escondidas no tecido: fundo do estojo com tampo, e a frente (fim do estojo, ombro, gargalo e bala) numa peça de 3 anéis com a ponta fechada; a junção latão/tombak é pintada (`round_tip`);
  - tampos poligonais (n − 2 triângulos) em vez de leques com vértice central;
  - aros da manga de água sem tampos, que ficavam escondidos pela manga;
  - tecido do troço livre por Douglas–Peucker a 0,2 mm (31 → 14 secções); o traçado é quase recto entre os pontos de controlo, por isso os cartuchos continuam no centro do tecido.
- Peças, nomes, grupos, pivôs, sockets, comprimento (1,2106 m) e caixa da cena não mudam. O LOD0 leve tem um atlas próprio, cozido depois do original. Assim o LOD1, o LOD2 e `m01_ckm_wz30_animations.glb` saem byte a byte iguais aos da entrega anterior (#31).
- Por nó, o LOD0 baixou em `ckm_belt_free` (1832 → 1036), `ckm_feed_belt` (568 → 372) e `ckm_elevate` (1268 → 1160).

## 6. Capturas (inspeccionadas)

- [`ckm_views.png`](ckm_views.png) — direita, esquerda, 3/4 da frente e de trás, alimentação, saída da fita, cone, caixa e punho.
- [`ckm_lods.png`](ckm_lods.png) — LOD0/1/2 inteiros e de perto.
- [`ckm_lod0_budget.png`](ckm_lod0_budget.png) — LOD0 antes (5004, tirado do git em `4170eea`) e depois (3904), aos pares: três ângulos inteiros (3/4 da frente, lado direito, 3/4 de trás), alimentação, troço livre de trás e de lado, caixa com tampa e boca da fita, alça, massa e aro da frente, aro do meio da manga, pontas e fundos dos cartuchos. As silhuetas coincidem; as pontas mostram o latão a passar para tombak.
- [`ckm_hands.png`](ckm_hands.png) — mãos do atirador (punho, lado da caixa, ponta da fita, alavanca), olho na linha de mira, mãos do municiador e rajada.
- [`ckm_crew.png`](ckm_crew.png) — equipa em `aim` (três ângulos), `idle`, `fire_burst` e `abandon`.
- [`ckm_clips.png`](ckm_clips.png) — sequências de `feed` e `abandon`.

## 7. Autoria, licenças e fontes

- **Autoria:** geometria, texturas e animações originais do Claude Code, geradas por código neste repositório.
- **Rig:** o esqueleto é o do soldado polaco já existente (malha base CC0 do MakeHuman, ver `ASSET_CREDITS.md`). Nada foi extraído de jogos nem de modelos de terceiros.
- **Ferramentas gratuitas:** Node.js, @gltf-transform/core (MIT), meshoptimizer (MIT), jpeg-js (BSD-3), pngjs (MIT); three.js (MIT) e Playwright/Chromium nas capturas.
- **Fontes:** T34 em `research/SOURCES.md`, com URLs no manifesto, mais T03.

## 8. Limitações

- **Medidas:** são de resumos de busca. Manga, cone, caixa da culatra, punho, miras, tripé, passo da fita e curso da alavanca são estimativas (`estimated: true`).
- **Tripé:** a geometria é genérica (uma perna à frente, duas atrás, barra de direcção) e não distingue o wz.30 do wz.34. O adaptador antiaéreo, a lata de água, a mangueira de condensação e a ferramenta de armar não foram modelados.
- **Mãos:** os dedos seguem o encaixe automático do rig. Há pequenas interpenetrações no punho e na fita, e nos grandes planos parte das mãos do municiador fica tapada pelo corpo.
- **Fita:** a fita vazia é um troço fixo que aparece quando a ponta sai. Não se acumula no chão.
- **`abandon`:** termina com dois passos. O caminho até à saída é do runtime.
- **Testes:** não houve playtest, medição de FPS nem teste na casamata real do mapa.

## 9. Sugestões de integração com `grp_ckm_crew` (sem regras novas)

1. Pôr a raiz `ckm_wz30` no chão por trás de `cv_casemate_emb_s`, com o cano (−Z) virado para a normal da seteira, que é `[1, 0, 0]`: no Three.js, `rotation.y = −π/2`. Converter a posição como o runtime já faz para os outros `cv_*`.
2. Altura: em repouso, o eixo do cano fica a 0,64 m do chão e a boca do cone a 0,83 m à frente do pião.
   - Se o peitoril da seteira estiver mais alto, elevar a raiz (degrau ou plataforma) em vez de escalar o modelo.
   - O tripé de 1939 ia até 880 mm (T34); a altura da seteira está por confirmar.
3. Colocar o atirador e o municiador nas posições `crew` do manifesto, relativas à raiz, e tocar o clip da arma e os dois clips da guarnição com o mesmo sufixo e o mesmo tempo.
4. Ligar `fire_burst` ao disparo que a simulação já decidir para o grupo. O som do emissor `ae_s2_ckm_east` e o clarão em `sockets_gun.muzzle_flash` ficam como hoje. Os eventos `fire` dos clips servem só para sincronizar a animação; o renderer não decide tiros.
5. Tocar `abandon` quando a missão já mandar a guarnição sair, antes de `evt_m01_west_demolition` (prontidão "grp_ckm_crew saiu da casamata"). Depois de `leave`, entregar os soldados à locomoção existente.
6. Escolha de LOD por distância: LOD0 dentro da casamata, LOD2 da outra margem.
