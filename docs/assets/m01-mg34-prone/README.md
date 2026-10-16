# M01 — MG 34 deitada: atirador e municiador (provisória, gerada)

**PROPOSTA VISUAL PROVISÓRIA.** Clips da MG 34 em posição deitada sobre o bípode para a dupla alemã de M01 (`grp_de_east`, Panzerzug 7): o atirador com a arma e o municiador que lhe passa o tambor novo. Não está ligada a `src/`; o motor não tem `pose: prone` e esta galeria não o implementa. M01 continua **PROTÓTIPO JOGÁVEL**. As capturas não são playtest humano nem medição de FPS no Chromebook.

- Ficheiros: `assets/models/provisional/m01/weapons/mg34-prone/`, com `m01_mg34_prone_animations.glb` (esqueleto, 6 nós móveis da MG 34 e 9 clips; 859 kB) e `manifest.json`.
- Gerador: `tools/assets/m01-mg34-prone/`. Não gera malhas.
- **Reutiliza sem alterar:**
  - o kit da MG 34 do PR #30: malhas, LODs, pivôs, sockets e perfil da mão direita;
  - o rig e os GLB dos soldados alemães;
  - o solver de poses de `tools/assets/m01-soldiers/`.

  O manifesto guarda o SHA-256 e os bytes desses 8 ficheiros, e o teste confirma que não mudaram.
- **Clips de pé intactos:** `mg34_aim`, `mg34_fire_burst` e `mg34_reload` continuam em `m01_mg34_animations.glb`, sem alterações. Os clips novos usam nomes novos.

```
cd tools/assets/m01-soldiers && npm ci && npm run fetch   # dependências e malha base CC0 (rig e pele para medir contactos)
cd ../m01-rkm-wz28 && npm ci && cd ../m01-mg34 && npm ci  # módulos reutilizados
cd ../m01-mg34-prone && npm ci && node build.mjs           # GLB de clips + manifest.json (duas execuções = ficheiros idênticos)
CHROME_EXECUTABLE=… node render/capture.mjs                # capturas e import-report.json nesta pasta
```

## Clips

| Clip | Papel | Duração | Ciclo | Eventos (s) |
| --- | --- | --- | --- | --- |
| `mg34_prone_enter` | atirador | 1,9 s | não | `bipod_swing` 0,45 · `bipod_open` 0,8 · `bipod_on_ground` 1,2 · `settled` 1,6 |
| `mg34_prone_idle` | atirador | 4 s | sim | cabeça levantada, dedo fora do gatilho, respiração |
| `mg34_prone_aim` | atirador | 2 s | sim | balanço de pontaria à volta das patas do bípode |
| `mg34_prone_fire_burst` | atirador | 1,02 s | não | `fire` 0 · 0,075 · 0,15 · 0,225 · 0,3 · 0,375 · 0,45 |
| `mg34_prone_reload` | atirador | 4,8 s | não | `cover_open` 0,8 · `drum_off` 1,3 · `drum_down` 1,6 · `drum_from_assistant` 1,7 · `drum_handoff` 2,15 · `drum_on` 2,75 · `belt_in` 3,05 · `cover_closed` 3,35 · `handle_back` 3,85 · `handle_forward` 4,15 |
| `mg34_prone_exit` | atirador | 1,9 s | não | `bipod_lift` 0,7 · `bipod_folded` 1,1 · `standing` 1,9 (é a entrada ao contrário) |
| `mg34_loader_prone_idle` | municiador | 4 s | sim | respiração; olha de vez em quando para a arma |
| `mg34_loader_prone_feed` | municiador | 4,8 s | não | `reach_carrier` 0,95 · `drum_from_assistant` 1,7 · `drum_handoff` 2,15 |
| `mg34_loader_prone_leave` | municiador | 1,8 s | não | mãos e joelhos → agachado sobre o joelho direito, pronto a sair (sem deslocar a raiz) |

**Continuidade**, verificada pelo teste em todas as faixas do rig:
- `mg34_prone_enter` começa no frame 0 de `mg34_aim` do kit, e `mg34_prone_exit` acaba nesse mesmo frame;
- o fim da entrada, o início e o fim da rajada e o início e o fim da recarga coincidem com o frame 0 de `mg34_prone_aim`;
- `mg34_prone_idle`, `mg34_prone_aim` e `mg34_loader_prone_idle` fecham o ciclo;
- `mg34_loader_prone_feed` começa e acaba em `mg34_loader_prone_idle`, e `mg34_loader_prone_leave` parte dele.

## Ligação (para o Codex; `src/` não foi alterado)

**Atirador:**
- Usa `m01_soldier_de_*` com a cena `m01_mg34_lod*` presa ao osso `weapon` com transformação nula. A arma tem de ser presa **antes** de criar as acções do mixer, para os clips encontrarem os nós `mg34_*` pelo nome.
- Fica uma só MG 34. A Kar98k fica escondida pela escala 0 do osso `weapon_clip` (o clipe) e pelo esconder da `rifle`, como no kit de pé.

**Municiador:**
- Usa outro `m01_soldier_de_*` com a raiz em `LOADER_OFFSET = [−0,72, 0, 0,35]` m no referencial da raiz do atirador, com a mesma rotação.
- Não tem arma: os ossos `weapon` e `weapon_clip` têm escala 0 em todos os clips do municiador.

**Bípode:**
- O GLB da arma marca `mg34_bipod_open` com `visible=false`.
- Ao entrar em prone, o runtime põe `mg34_bipod_open.visible = true` e deixa os clips decidirem pela escala: faixas `STEP` 0/1 em `mg34_bipod_open` e `mg34_bipod_folded`.
- Nos clips deitados o bípode aberto tem escala 1 e o dobrado escala 0. Na entrada, o dobrado roda 99° em X à volta do suporte entre 0,45 e 0,8 s, com a mão esquerda nas pernas, e troca-se pelo aberto em 0,8 s.
- Depois de `mg34_prone_exit`, o runtime volta a pôr `visible = false`.

**Sincronia:** `mg34_prone_reload` e `mg34_loader_prone_feed` arrancam no mesmo instante e duram o mesmo. O tambor novo é o nó `mg34_drum` da arma do atirador. Entre `drum_from_assistant` e `drum_handoff` acompanha a mão direita do municiador; no teste, com o mixer, fica a menos de 0,15 m dela.

**Eventos:** são só de apresentação (som, clarão, cápsulas, mãos). A simulação (`src/game/m01-simulation.js`) continua a decidir tiros, dano e munição.

### Janela de fogo e interrupção da rajada

- **Janela de fogo:** `fire_window_s = [0, 0,525]`, os 7 eventos mais um intervalo de 0,075 s. Depois disso o clip só faz o retorno da arma ao bípode e acaba igual a `mg34_prone_aim`.
- **Corte depois de 4 tiros:** cruzar para `mg34_prone_aim` aos 0,3 s, antes do 5.º evento, com `fade_s = 0,2`.
- **Corte depois de 6 tiros:** cruzar aos 0,45 s, antes do 7.º evento.
- **Ao cortar:** os eventos seguintes não se emitem. Os valores estão em `extras.interrupt` do clip e no manifesto.
- **Movimento da rajada:** a boca sobe 0,28° por tiro à volta da coronha, com recuo de 1,2 cm ao longo do cano e um pequeno salto das patas. Estes valores são estimativas de apresentação.

## Postura e contactos

Pose de pontaria (`mg34_prone_aim`, frame 0); centros das articulações em metros, com y como altura ao chão:
- **Bípode:** patas (socket `bipod_feet`) em y = 0 e boca para −Z. A inclinação da arma é de 3,5°, definida pelo olho na linha de mira e pelas patas no chão.
- **Coronha e face:** a coronha fica a 7–9 mm do bolso do ombro direito, e o socket `cheek` coincide com o olho direito.
- **Mão direita:** no punho, com o perfil `MG34_GRIP.r` do kit e o dedo no gatilho; em `idle`, o dedo fica fora do gatilho.
- **Mão esquerda:** por baixo da coronha, a puxá-la ao ombro.
- **Cotovelos:** esquerdo em y 0,049 e direito em y 0,051.
- **Joelhos:** em y 0,068.
- **Dedos dos pés:** em y 0,041, com os calcanhares para cima.
- **Peito:** levantado, apoiado nos cotovelos.

Pele, medida com o vértice mais baixo de cada zona por LBS, como no GLB (`posture.contacts.skin_lowest_y_m`); y < 0 significa que a malha entra no chão:

| Zona | Atirador | Municiador |
| --- | --- | --- |
| rótulas E/D | 0,003 / 0,003 | 0,008 / −0,003 |
| antebraços junto ao cotovelo E/D | 0,015 / 0,012 | −0,009 / −0,008 |
| coxas E/D | 0,005 / 0,005 | 0,003 / 0,007 |
| biqueiras E/D | −0,004 / −0,004 | −0,004 / −0,004 |

**Contactos com o chão:**
- **Clips em movimento:** na entrada, na saída e no levantar do municiador, `groundSolve` sobe o pé quando a pele da bota desce abaixo de −1,3 cm e afasta-o para trás quando o joelho desce abaixo de 7 cm. Não há saltos da raiz: a raiz fica na origem, e só as ancas e os pés se movem.
- **Bípode na entrada:** antes de assentar, a arma sobe o que faltar para as patas não entrarem no chão; essa correcção é nula em `bipod_on_ground`.
- **Pior caso medido em todos os clips:** −1,7 cm, na rajada aos 0,1 s, por causa do recuo do corpo (tecido e solas). Detalhe em `import-report.json`.

## Recarga deitada (atirador e municiador)

Pela ordem dos eventos:
1. A mão esquerda vai ao fecho e a tampa abre (`cover_open`).
2. O tambor vazio sai (`drum_off`) e é pousado no chão à esquerda (`drum_down`, deixa de se ver).
3. O municiador já tirou o tambor novo do porta-tambores, que não está modelado, à direita da anca (`reach_carrier`). Estende-o por baixo da caixa, e o atirador recebe-o (`drum_from_assistant` → `drum_handoff`).
4. O atirador engata o tambor no pivô (`drum_on`) e mete a ponta da cinta (`belt_in`).
5. Fecha a tampa (`cover_closed`).
6. A mão direita deixa o punho, puxa a alavanca de armar 0,12 m (`handle_back`), solta-a (`handle_forward`) e volta ao punho.

A cabeça e o peito levantam-se um pouco para ver a alimentação. O municiador olha para a arma e depois volta ao repouso.

## Capturas inspeccionadas

Feitas com three.js 0.186.1 (GLTFLoader e AnimationMixer) em Chromium/SwiftShader. A arma está presa ao osso `weapon` antes do mixer, e os soldados e a MG 34 são os GLB reais.

| Ficheiro | Conteúdo |
| --- | --- |
| `mg34_prone_pair.png` | dupla: lateral direita, lateral esquerda, frontal e de cima (corpo inteiro) |
| `mg34_prone_details.png` | bípode e cotovelos; cotovelo esquerdo e mão sob a coronha; face na coronha (sem capacete); mão direita no punho; joelhos e pés; `idle` |
| `mg34_prone_burst.png` | 1.º tiro, recuo, corte após 4 tiros, 7.º tiro (lateral e frontal) e fim |
| `mg34_prone_reload.png` | 12 instantes da recarga com o municiador |
| `mg34_prone_enter_exit.png` | entrada (8 instantes), saída e levantar do municiador |
| `import-report.json` | malhas carregadas, faixas e duração por clip, vértice mais baixo da pele por clip (a cada 0,05 s) e deriva ao pausar/retomar o mixer: 0 em todos |

Inspecção visual: patas do bípode, cotovelos, joelhos e biqueiras no chão; mão direita no punho e esquerda sob a coronha; olho na linha de mira com o cano livre à frente do bípode; o tambor passa da mão do municiador para a caixa; sem membros através do chão nem saltos da raiz na entrada e na saída.

## Teste

`tests/m01-mg34-prone-glb.test.js` verifica:
- os hashes dos ficheiros reutilizados;
- os nomes novos, que não repetem clips existentes, e os clips de pé intactos;
- os alvos das faixas: ossos do rig alemão e os 6 nós `mg34_*`, filhos de `weapon` e com o pivô do kit;
- valores finitos, tempos crescentes, quaterniões unitários e durações;
- a escala de `weapon` (1 no atirador, 0 no municiador) e o clipe escondido;
- os 7 eventos de tiro a 0,075 s, a janela de fogo e os cortes;
- os estados STEP do bípode;
- a ordem dos eventos da recarga e a tampa, o tambor, a cinta e a alavanca;
- a continuidade com `mg34_aim` e entre clips;
- no `AnimationMixer` do three.js (GLTFLoader em Node):
  - as patas do bípode em y ≈ 0, a coronha ao ombro e a face na coronha;
  - os cotovelos e joelhos baixos;
  - o tambor na mão do municiador na passagem e engatado em `drum_on`;
  - pausar e retomar o mixer dá o mesmo frame em todos os clips.

## Fontes, estimativas e licença

- **Sem fontes novas.** As medidas e o mecanismo da MG 34 vêm do kit (T33, [`docs/assets/m01-mg34/README.md`](../m01-mg34/README.md)).
- **Estimativas de apresentação, a afinar em playtest:**
  - a postura deitada;
  - a posição do municiador;
  - os tempos da entrada, saída e recarga;
  - a subida da boca e o salto do bípode;
  - o balanço de pontaria;
  - o porta-tambores, que não está modelado.
- **Licença:** clips gerados por código original deste repositório (Claude Code). Não há conteúdo de terceiros nem de jogos. A licença global do repositório continua por decidir pelo proprietário (`ASSET_CREDITS.md`).
- **Ferramentas gratuitas:** Node.js, `@gltf-transform/core` 4.5.1 (MIT), three.js 0.186.1 (MIT) e Playwright/Chromium.

## Limitações

- O motor não tem `pose: prone`. Ligar a dupla às posições `grp_de_east`, esconder a Kar98k e gerir `mg34_bipod_open.visible` fica com o Codex.
- O porta-tambores do municiador, a cinta de 250 e a mira antiaérea não existem.
- O municiador não tem clip de rastejar até à posição; a raiz não se desloca.
- A malha só foi medida pelo LBS do corpo e do equipamento. O capacete e as cabeças não entram na medida da pele; foram verificados nas capturas.
- Sem playtest humano nem FPS no Chromebook.
