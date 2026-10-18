# M01 — navegação dos atores (P0 do playtest: «os NPC atravessam paredes») — 2026-10-18

Estado: **implementado e medido em Node (x86-64), sem playtest humano.** Tudo o que se segue são medições da simulação nas rotas reais (`tests/helpers/m01-route.js`), não jogo.
Predecessor auditado: `f6913a0` (candidata #80 + PR #90 + #89, o que o proprietário jogou). Golden: não regenerado nesta branch (secção 5).

## 1. Como os atores se moviam (causa)

- **Não havia navegação.** Todos os atores M01 andam por `M01Simulation.moveActor` (`src/game/m01-simulation.js:547` em `f6913a0`): rumo em linha reta ao alvo, `TczewWorld.move` por eixos
  (desliza numa parede, não contorna) e, se não avança, um passo fixo para `+z` (`:553`). Sem grelha, sem grafo de pontos, sem desvio de outros homens.
- **Rotas autoradas para evitar os obstáculos.** As rotas da missão (pelotão leste, sapadores, Dudek, retirada) foram escritas à mão para não tocarem os colliders. Fora delas — um aliado
  que segue o jogador, um alvo atrás da barraca, a retirada de qualquer ponto — o homem fica encostado à parede (sem rota) ou desliza para o lado errado.
- **Sólidos desenhados sem collider.** O horseshoe de sacos de areia da ckm (`src/render/m01-environment.js:125` em `f6913a0`) estava fechado nos quatro lados e não tem collider (decoração):
  a tripulação (`ckm_gunner`, `ckm_loader`, `ckm_reserve`) sai para oeste direta pela parede de trás (`:748`, `moveActor`).
- **Portal de Lisewo exportado como um bloco.** `COL_portal_lisewo_1912` (`assets/models/provisional/m01/bridge-colliders.json`) é uma laje de 9 m por toda a largura; os `grp_de_spans`
  nascem dentro dela (x 1059–1077) e andam por ela com `a.x+=…` direto (`:770`), sem `world.move`.
- **Nenhuma separação entre homens.** `moveActor` ignora os outros: depois da retirada, todos os aliados vão para o mesmo ponto (`:776`, `{x:-170,z:22}`) e ficam uns dentro dos outros durante minutos.

## 2. Reprodução (antes), nas rotas reais

`tests/m01-npc-navigation.test.js` + `tests/helpers/m01-clipping.js` observam **cada tick** de cada rota: corpo de cada ator contra `world.obstacles`, as treliças (`partialCover`) e os sacos da ckm,
varrimento do movimento do tick (atravessar sem terminar dentro) e pares de homens a menos de 0,35 m. Em `f6913a0`:

| medida | antes (`f6913a0`) | depois |
|---|---|---|
| eventos de clipping, rota completa, semente 19390901 (21 862 ticks) | **14** em bruto: 11 na laje de Lisewo, 3 nos sacos da ckm (`ckm_reserve` t=770,1 s, `ckm_gunner` 770,3, `ckm_loader` 770,55; x≈5,1, z 24,6–25,9). **3** depois de declarar a passagem de Lisewo (a auditoria da emenda 04 conta estes). A rota com apoio (semente 7) repete os mesmos 3. | 0 nas duas rotas do golden e nas sementes 3 e 7 (ver secção 5) |
| pares de homens a menos de 0,35 m | 49 na rota completa (o mais longo 6 260 ticks = 313 s), 55 na rota com apoio: cerca de dez aliados e a tripulação da ckm no mesmo ponto de retirada `(-170,22)`, doze homens do pelotão no pátio da estação, e Zieliński/Pawlak/sapadores empilhados desde t=71 s | 0 (medido fora da marcha escrita da retirada alemã T48, ver §4) |
| 150 pares origem/destino determinísticos no oeste (um aliado, `staszek_pawlak`, tempo limitado) | 140 chegam, 10 ficam presos contra uma parede. Nenhum corpo entra num collider; 11 percursos fazem cantos de colliders que a corda entre dois ticks cruza (estação, barracão, vagões), o que a auditoria marca como `sweep` e é só o deslizar de `world.move` por eixos | 150 chegam, 0 eventos |

## 3. O que mudou

- `src/world/m01-navigation.js` — **planeador determinístico, só de dados** (reutiliza as listas de colliders de `TczewWorld` e aceita uma lista extra de sólidos, `extraSolids`; o mapa não tem grafo de pontos nem rotas nos `coverNodes`, que são posições de tiro, por isso não há nós autorados — marcas `ponytail:` no código): grelha de 0,5 m rasterizada sob pedido numa janela à volta do pedido, A* de oito vizinhos sem cortar esquinas,
  string pulling com testes exatos de segmento. Sólidos: `world.obstacles`, treliças, faixas de bordo dos tabuleiros (o centro já era contido por `world.move`; as faixas afastam o corpo das treliças) e os sacos da ckm
  (somem com a demolição oeste). Sem RNG, sem relógio, sem estado escondido: a mesma entrada dá as mesmas esquinas. Não move ninguém.
- `src/world/m01-nav-layout.js` — dados partilhados do horseshoe (o renderizador desenha a partir dele; a navegação e a auditoria leem os mesmos sacos) e as **passagens** (o arco rodoviário de Lisewo).
  O horseshoe passa a ter a **retaguarda aberta** (2,1 m): é o que o nome diz e é por onde a tripulação sai.
- `moveActor` (`m01-simulation.js`): se o caminho reto está livre, anda **exatamente como antes**; senão segue as esquinas de uma rota guardada no próprio ator (`a.nav`: `goal`, `key`, `at`, `i`, `stall`, `pts`).
  A rota refaz-se quando o alvo muda >1,5 m, cai um vão, fica gasta ou o homem não avança (nada mais muda debaixo de uma rota). Uma rota que não existe não é pedida a cada tick: a falha fica guardada (`nav.fail`, validada no restore) e só se tenta de novo quando o alvo mexe >1,5 m, cai um vão ou passam `NAV.retrySec` (5 s). A segunda tentativa usa a janela mais larga que cabe no orçamento de células (o rodeio da estação, 122 m, precisa dela). Um homem desvia-se de quem está à frente (35° e depois 70°, para o lado livre), e na última zona de um objetivo cheio
  (<2,5 m) pára onde está, como numa fila. Depois de andar, quem estiver mais perto do que a soma dos raios menos 0,1 m empurra-o (≤0,15 m por tick, através de `world.move`).
- **Compatibilidade de saves.** `a.nav` é opcional; um save antigo não o tem e a rota refaz-se a partir da posição e do alvo; `validateM01Snapshot` recusa um `nav` que a máquina não faria. `nav.key` vem
  dos eventos consumidos (não do contador de revisões do mundo), por isso um save e um restore dão o mesmo.

## 4. O que ficou como estava, e as duas exceções declaradas

Jogador, colisão do jogador e física (`TczewWorld.move`, `heightAt`) não foram tocados. O RNG de `M01Simulation` não é consumido pela navegação. As 12 objetivos, os checkpoints A–D, os eventos consumidos,
os sobreviventes e a hora final da missão são idênticos aos do predecessor na rota própria dele (secção 5); a única deriva é de tempo (≤0,25 s em eventos do fim, ver `movedEvents`).
**Exceções, ditas sem rodeios:**
- **Lisewo.** Os 11 eventos da laje de Lisewo não desaparecem por mudança de movimento mas por uma **passagem declarada em dados** (`M01_PASSAGES`, o arco rodoviário de 5,6 m). `grp_de_spans` continuam a andar por
  `a.x+=…` direto, sem `world.move`, por uma laje que o collider exportado enche; o `bridge-colliders.json` não foi regenerado (é gerado do modelo).
- **Marcha da retirada alemã (T48).** `stepFallBack` é uma linha reta por relógio, de onde a demolição leste achou cada homem até ao seu lugar do grupo; duas linhas podem cruzar-se durante ~2 s a 700 m do jogador.
  A auditoria de empilhamento **exclui** os pares em que os dois homens estão nessa marcha (`fallBack`); parados, contam.
`props`, vegetação e trens continuam decoração sem collider.

## 5. Golden e verificação (estado na branch npc, antes da integração; HISTÓRIA desde a secção 7)

`src/game/m01-simulation.js` mudou, logo o golden da T47 (que fixa o hash dessa fonte) já não vale para esta árvore. **Por ordem do Captain (merge phys → npc → pacing → combat) o golden não é regenerado
nesta branch**: o merge da física torná-lo-ia obsoleto, e é o Captain quem o re-baseia no merge. A ferramenta `tools/verification/m01-npc-navigation-golden-audit.mjs` (lockstep contra o predecessor + invariantes
+ efeito medido) foi corrida **uma vez** contra `f6913a0` e o resultado ficou no commit `31ea980` (golden e `GOLDEN_AMENDMENT_04.json`), retirado depois da árvore; a ferramenta fica para o merge (re-apontar `PREDECESSOR`).
O que essa corrida mostrou, em `f6913a0` + esta mudança (rotas do golden: semente 19390901 sem apoio e semente 7 com apoio):
- a primeira diferença do predecessor, nas duas rotas, é `$.state.actors.2.x` de `tadeusz_nowicki` ao tick 356 (t=17,8 s, 1,3 mm): o primeiro passo vai para o primeiro canto da rota, `(-33,75; 4,25)`, e não para o
  alvo `(-40; 10)`, cuja linha reta atravessa o pilar sul do portal ferroviário; antes disso 355 ticks byte a byte iguais;
- 12 objetivos, 4 checkpoints, eventos consumidos, sobreviventes e relógio final iguais aos do predecessor na rota própria dele; `movedEvents`: rota completa `west_demolition` +0,15 s e os três seguintes; rota com
  apoio `dudek_retrieves_bak` e `east_demolition` +0,10 s, `west_demolition`, `roll_call`, `debrief` +0,25 s;
- quem seguiu uma rota guardada: `tadeusz_nowicki` (t=17,8–23,9 s), `jozef_bak` (a caminho do tabuleiro), `pl_east_17` (1 tick) e `ckm_reserve` (2 ticks, a saída do horseshoe).
- **24 rotas** (`m01-combat-posture-staging-audit.mjs --live`, 12 sementes × {sem, com apoio}, contra o predecessor 5a169ba como na T47): `INVARIANTS_24_ROUTES.json` desta pasta, **0 rotas com violação** (conclusão,
  relógio final, checkpoints, objetivos, ordem dos eventos consumidos, horas fixas de relógio de batalha incluindo `west_demolition`, 18 sobreviventes às 06:00, sobreviventes finais, `dlg_m01_049`, quedas de atrição a 0–5 s).
- Sementes 3 e 7, rota completa e com apoio, auditoria de clipping e de empilhamento: 0 eventos de clipping e 0 pares empilhados nas quatro (21 815–22 133 ticks), todas completas, sobreviventes 12 sem apoio e 18 com apoio.
- **Testes de golden que falham por desenho nesta branch** (o Captain re-baseia no merge): `tests/m01-animation-contract.test.js` — «the T47 golden … pins the live simulation» (hash de `m01-simulation.js`), os dois
  «all gameplay bytes hashed each tick …» (sementes 19390901 e 7; os blocos de 512 ticks divergem desde o primeiro) e os cinco testes que dependem do `completed` desses (CP-A..D, Bąk/CKM/MG34, saves 86/89, migração
  parcial, corrupção); `tests/m01-ckm-fire-arc.test.js` — a varredura da rota inteira (`samples` 1110 → 1111, `enemySamples` 36 456 → 36 502, amostras claras 135 → 144: a rota ficou 3 ticks mais longa) fica por
  re-medir com a nova base. O guarda `m01-mg34-prone-runtime` foi atualizado (fixa `walkStraight`, o andar antigo, byte a byte).

## 7. Integração phys × npc (2026-10-18, branch `claude/busy-ritchie-3fkvk2-integ-npc`)

Merge `--no-ff` da npc (`c61ce98`) sobre a árvore da física (`98f094f`) e depois da física `c7d8341` (rampa do rio). Conflito só no bloco de imports de `m01-simulation.js` (os dois lados mantidos);
`moveActor`, `validateM01Snapshot` (`a.nav` e `player.fall`) e `restoreSnapshot` juntaram-se sem conflito.
- **Os NPC também param no que o corpo do jogador para** (`world.playerSolids` tipos `structure`, `bridge`, `truss`, `prop`: casamata, paredes do abrigo, parapeitos/pilares/cordas das cabeças de ponte, balanço das
  treliças e guardas das juntas, barris da cabana e os props T12; `playerSolidsForNav` em `src/world/m01-navigation.js`). Caixas orientadas (88 props rodados) testadas no próprio referencial. Sem collider de
  mundo, são `decor`: o planeador contorna-as e `settle` empurra o homem para fora depois de **cada** passo (também do andar reto, que fica byte a byte quando nada está no caminho), pela face mais rasa **livre**
  (já não empurra através de um collider).
- **Altura**: um sólido é parede onde encontra a faixa de um corpo de pé no chão **desse** lugar (`heightAt`), não à altura de partida; treliças e faixas de bordo mantêm a altura do caminhante. Sem isto, o
  caminho de Bąk do posto da secção para o tabuleiro via a casamata enterrada (tecto −1,4 m, debaixo do tabuleiro) como parede, o plano falhava e ele ficava preso.
- **Uma só tabela da ckm** (`CKM_EMPLACEMENT` em `m01-nav-layout.js`, meia-saca 0,273 m medida no GLB/cápsula): renderizador, NPC e jogador. A porta de trás existe agora também para o jogador; a libertação do
  anel ao restaurar (F1 da física) foi retirada (teleportaria quem gravou lá dentro); testes da física reescritos para a premissa da porta.
- **Prop movido**: o grupo `bridge_mid_01` 1,5 m para sul (as latas t12_82 estavam entre os lugares da secção; Marek nascia 7 cm dentro delas).
- **Auditoria** (`tests/helpers/m01-clipping.js`): conta a camada do jogador; colocações de mais de 1 m num tick (a chamada final senta a secção) ficam numa lista à parte e o destino continua auditado; sentados
  no banco do abrigo isentos; o *sweep* é julgado à altura a que o homem andou (a de `TczewWorld.move`).
- **Medido** (predecessor = árvore da física `c7d8341`, rota própria; depois = esta árvore): eventos de clipping **14 → 0** nas seis rotas (sementes 19390901, 3 e 7, sem e com apoio): Marek e Bąk nas latas, Nowicki
  e Bąk nos pilares/parapeitos do portal oeste, Dudek a carregar Bąk no pilar do portal da estrada, a tripulação da ckm na parede de trás fechada; pares empilhados 49/55/57 → 0. 150 percursos livres: todos chegam,
  0 clipping (49 precisam de desvio).
- **Golden: emenda 05** (`GOLDEN_AMENDMENT_05.json`, `tests/fixtures/m01-npc-navigation-gameplay-baseline.json`, `tools/verification/m01-npc-navigation-golden-audit.mjs --write`, x86). O golden da T47 (emenda 04)
  fica byte a byte e é história. Delta nomeado: a primeira diferença, nas duas rotas, é `$.state.actors.2.x` de `tadeusz_nowicki` ao tick 356 (1,3 mm), 355 ticks iguais antes; 12 objetivos, 4 checkpoints,
  eventos, sobreviventes e relógio final iguais; `west_demolition` +0,15 s (rota completa) e +0,25 s (com apoio). Varredura `m01-ckm-fire-arc`: amostras claras 144 → 135 (os mesmos nove alvos, uma amostra a menos
  cada depois da demolição oeste). Invariantes: 24/24 rotas sem violação (`INVARIANTS_24_ROUTES.json`).
- **Continua inferior**: os NPC ainda sobem/descem os encontros e tabuleiros por teletransporte (`TczewWorld.move` usa `heightAt`, sem degraus nem queda); balas, visão e granadas continuam a ignorar a camada do
  jogador; o A* não custa desníveis; nunca jogado por um humano.

## 6. Limites (o que continua inferior à referência)

Sem rotas sob fogo (a grelha não tem custo de exposição nem de linha de visão), sem salto de sacos de areia, sem formação nem movimento de cobertura a cobertura, e a deteção de colisão dos homens é um círculo de 0,3 m.
