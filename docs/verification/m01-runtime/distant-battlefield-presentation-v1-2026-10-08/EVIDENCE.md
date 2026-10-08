# EVIDENCE — M01 distant battlefield presentation V1

Execução **local**: contentor Linux de 4 núcleos, Node 22, Chromium 1194 com ANGLE/SwiftShader (WebGL por software). Não é CI remoto, Chromebook nem GPU real. Nenhum número abaixo é FPS de jogo.

| Campo | Valor |
|---|---|
| Base | `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime verificado | `6ffa820` (plano, renderer, integração, testes, ferramentas), depois da verificação independente ([`VERIFICATION.md`](VERIFICATION.md)). `5c5eed1` só acrescenta um frame à ferramenta de captura. `4763521`, depois da segunda verificação, muda só testes e comentários: o bundle de produção é o mesmo ficheiro (`index-BPZBcUw8.js`, 1 226,30 kB). Os restantes commits são documentação/capturas. |
| Ficheiros | [`FILES_CHANGED.txt`](FILES_CHANGED.txt): só `src/render/*`, testes e ferramentas de verificação. Gameplay/world/core/assets/research/missions/build/CI sem diff contra a base. O único ficheiro também alterado pela correcção de FX é `src/render/m01-view.js`. |

## Testes

| Comando | Resultado |
|---|---|
| `node --test tests/m01-distant-battlefield.test.js` | **17/17 PASS** (`4763521`, 14 s) |
| `npm test` | **341/341 PASS**, 0 skips (`4763521`, [`logs/node.log`](logs/node.log)) |
| `npm run build` | **PASS**, bundle 1 226,30 kB (aviso existente de chunk > 500 kB) (`4763521`, [`logs/build.log`](logs/build.log)): os mesmos ficheiros, com os mesmos hashes de conteúdo, que em `6ffa820` |
| `CI=1 npx playwright test tests/browser/m01-distant-battlefield.spec.js` | **2/2 PASS**, 2,0 min ([`logs/browser-spec.log`](logs/browser-spec.log)). Build de produção, snapshots genuínos da rota; leste em Baixa e norte em Alta. O teste verifica: <ul><li>camadas presentes;</li><li>contagens pedidas dentro dos limites e iguais às desenhadas (nada cortado);</li><li>pausa congela o relógio e o diagnóstico;</li><li>fontes só `evt_m01_*`/`ambient:*`;</li><li>estado da arma intacto;</li><li>zero erros/404.</li></ul> Capturas do frame em pausa (o teste verifica diagnóstico, não composição): [`captures/distant-east-low.png`](captures/distant-east-low.png), [`captures/distant-north-high.png`](captures/distant-north-high.png). |

### Suíte integral de navegador

`CI=1 npx playwright test` em `5c5eed1` (1 worker, 0 retries): **54/63 PASS, 9 FAIL**, 47,7 min ([`logs/browser-full.log`](logs/browser-full.log)). Passam os 2 testes desta camada. Das 9 falhas, 2 passam sozinhas sem carga, nesta branch e na base. As outras 7 falham também na base.

| Teste | Nesta branch | Base `99309d9` |
|---|---|---|
| `game.spec.js:68` (bancada, teclado) | falhou na suíte; **passa** sozinho, sem carga (36,5 s) | passa sozinho (38,1 s) |
| `m01-battlefield-fx.spec.js:72` (impacto de bala real) | falhou na suíte; **passa** sozinho, sem carga (50,0 s) | passa sozinho (47,9 s) |
| `game.spec.js:28` (bancada: tiro, recarga, pausa) | falha na linha 59 | falha igual em 2 de 3 execuções sem carga: a recarga acaba no limite de 12 s ([`logs/game28-repeat.log`](logs/game28-repeat.log), [`logs/base-subset.log`](logs/base-subset.log)) |
| `m01-audio-production.spec.js:36` | falha na linha 46 (na suíte e sozinho, sem carga) | **falha igual** sozinha, sem carga (linha 46, [`logs/browser-rerun-2.log`](logs/browser-rerun-2.log)); numa execução anterior, na linha 53 ([`logs/base-failing7.log`](logs/base-failing7.log)) |
| `m01.spec.js:99` (rigs e mãos) | na suíte, falha na linha 114; sozinho, sem carga, na linha 131 (`fireRound`) | **falha igual** sozinha (linha 131, [`logs/browser-rerun-2.log`](logs/browser-rerun-2.log), [`logs/base-subset.log`](logs/base-subset.log)) |
| `m01.spec.js:318` (salva, 2 variantes) | falham as 2 | falham 1–2 de 2 ([`logs/base-look3.log`](logs/base-look3.log)) |
| `m01.spec.js:337` (demolição na treliça) | falha | **falha igual** (linha 351 do spec, [`logs/base-look3.log`](logs/base-look3.log)) |
| `m01.spec.js:386` (fogo alemão no reparo) | falha | **falha igual** (linha 399 do spec, [`logs/base-failing7.log`](logs/base-failing7.log)) |

Repetições sem carga, nesta branch e na base, alternadas: [`logs/browser-rerun.log`](logs/browser-rerun.log) (`game.spec.js:68`, `m01-battlefield-fx.spec.js:72`) e [`logs/browser-rerun-2.log`](logs/browser-rerun-2.log) (`m01-audio-production.spec.js:36`, `m01.spec.js:99`).

As falhas de `:68` e `:72` na suíte têm causa conhecida. Um revisor de outra branch corria ao mesmo tempo mutantes de um teste Node que esgotaram a memória. O kernel matou esses processos entre as 10:23 e as 10:34 UTC e, às 10:26:30, o Chrome desta suíte, durante `game.spec.js:68` (só ficou o trace, sem contexto de erro). `:72` correu na mesma janela de pressão de memória. Linhas do kernel em [`logs/oom-kills.txt`](logs/oom-kills.txt).

Os logs da base vêm das mesmas execuções da base usadas na branch da arma em primeira pessoa (mesma base, mesmo contentor). Correram num worktree descartável no commit `99309d9`, com o build de produção da própria base; nos logs, o caminho desse worktree aparece como `<base-worktree>`. As causas das falhas da base (pointer lock, prazos de tempo de parede a < 1 frame/s em SwiftShader) estão descritas em `docs/verification/m01-runtime/first-person-weapon-presentation-v1-2026-10-08/EVIDENCE.md`, na branch `codex/m01-first-person-weapon-presentation-v1`. Esta branch não toca na bancada, no áudio, no input nem no HUD.

O que os testes Node cobrem:
- **Separação das camadas:**
  - três camadas, cada uma com a sua fonte;
  - um episódio de apresentação só abre com o seu próprio evento (Koźliny sem contacto norte não abre a frente norte).
- **Pureza e cache:**
  - o plano recalculado sem cache, duas vezes, é igual ao plano com cache;
  - a cache é igual ao recálculo também depois de mudar um marco.
- **Ritmo:**
  - CV dos intervalos, autocorrelação, minutos calmos e surtos;
  - sem repetição de local ou rajada;
  - scan ≥ duração de qualquer evento;
  - impactos pesados ≥0,3 s nos dois sectores pesados.
- **Trocas:** a resposta sai da linha alvejada, sem traçante, 0,45–1,55 s depois do fim da rajada ou da primeira chegada.
- **Distâncias**, garantidas pelas caixas e verificadas além da rota:
  - por construção: a caixa que abrange as duas caixas de cada linha (atiradores, alvos, respostas, impactos e trajectórias) fica à distância mínima do sector;
  - eventos e trajectórias de um em cada três baldes durante duas horas: Lisewo além do raio de tiro, norte a ≥800 m (limite inferior de S4);
  - figuras, viaturas, peça anticarro e colunas a cada 4 s durante duas horas, nas duas fases;
  - aviões ≥2 km.
- **Fases autoritativas:** silêncio, surto, recuo, Koźliny, coluna antes da chamada; lanços e carregadores.
- **Renderer só lê:** proxies que registam escritas e chamadas mostram apenas `heightAt`.
- **Gameplay:** A/B em 400 ticks com e sem a camada.
- **Câmara e qualidade** não mudam os eventos.
- **Pools nunca saturam** (contagens pedidas): a rota inteira em Alta a cada 0,25 s e todas as frentes durante uma hora. Os picos ficam no log ([`logs/node.log`](logs/node.log), linhas 847–848): a rota chega a 145 puffs, todas as frentes a 183 (pool 224). O limite dos aviões é verificado com o voo mais longo e o maior elemento observados em duas horas (amostragem).
- **Espaçamento dos impactos pesados:** o look-back cobre 0,3 s mais a dispersão dos tempos de voo amostrados, com um balde de folga.
- **Pausa e restore:** restore para um save anterior, posterior e no mesmo relógio, com a janela dos clarões reposta como num renderer novo.

Depois das correcções, 8 mutações numa cópia descartável foram todas apanhadas pelo teste focado, incluindo as três que sobreviviam na verificação (lista em [`VERIFICATION.md`](VERIFICATION.md)). Depois da segunda verificação, outras 8 (look-back 11 e 13, sem dispersão, morteiro a 1; caixa antiga das peças; obras 60 m mais perto; linha sul de Lisewo 20 m mais perto; pool de puffs 168) foram todas apanhadas.

## Merge de ensaio com a correcção de FX e com a arma em primeira pessoa

Worktree descartável: esta branch (`8b4d001`) + `origin/codex/m01-battlefield-fx-polish-v3` (`e08755b`) + o runtime da branch da arma em primeira pessoa (`5743b83`). **Os dois merges são automáticos, sem conflitos** ([`logs/merged-merge.log`](logs/merged-merge.log), árvore `69eddab`). O ensaio anterior, com a arma em `d97329c`, também era automático (árvore `9c4e320`, 373/376).

`npm test` no resultado: **374/377** ([`logs/merged-node.log`](logs/merged-node.log)); o teste a mais é o teste novo da arma.
- As 3 falhas são de `tests/m01-mg34-prone-presentation.test.js` («actual muzzle effect after shot 1/4/6…»), com o mesmo `TypeError` (`fireColor.set`).
- **Falham igual na FX V3 sozinha** (`e08755b`: 10/13 nesse ficheiro, confirmado também pela verificação independente).
- O teste constrói um `M01View` parcial sem `fireColor`, e o `updateFire` da V3 passou a pintar o fumo com cor.
- Não é causado por esta branch nem pela da arma. A correcção pertence à V3: o teste deve criar `fireColor`, ou `put` deve tolerar a sua ausência.

## Custo por frame no navegador (SwiftShader, não FPS)

[`logs/frame-cost-ab.mjs`](logs/frame-cost-ab.mjs) abre o build de produção e carrega um snapshot genuíno com a camada distante cheia: contacto norte + 160 s, com frente norte, Lisewo, grupos e aviões. Em Baixa, sem input, conta callbacks de `requestAnimationFrame` e segundos de simulação por segundo de parede durante 20 s, alternando base e esta branch duas vezes ([`logs/frame-cost-ab.jsonl`](logs/frame-cost-ab.jsonl)):

| Execução | callbacks de rAF / s de parede | s de simulação / s de parede |
|---|---|---|
| base `99309d9` | 0,80 · 0,85 | 0,189 · 0,201 |
| esta branch `5c5eed1` | 0,75 · 0,85 | 0,177 · 0,201 |

Sem diferença acima do ruído (n = 2 por braço; ±1 frame por janela de 20 s, ~±7 %; SwiftShader), neste estado.

## Custo JS do plano (relativo, Node, não é FPS)

[`logs/plan-cost.mjs`](logs/plan-cost.mjs) recolhe `(clock, consumed)` em cada um dos **20 976 ticks** da rota genuína e cronometra `planDistantBattlefield` sobre todos, com uma passagem de aquecimento e três repetições ([`logs/plan-cost.jsonl`](logs/plan-cost.jsonl)). A primeira versão foi extraída de `8c4367b` com `git show`, junto do mesmo `m01-atmosphere.js` (inalterado desde a base).

| Plano | µs por chamada |
|---|---|
| Primeira versão (`8c4367b`) | 197 · 208 · 209 |
| Actual (`6ffa820`: rejeição barata + cache por assinatura de marcos) | 70 · 67 · 69 |

O número de eventos difere ligeiramente (117 609 contra 118 060 na soma dos ticks), porque as correcções de revisão mudaram distâncias e espaçamentos.

## Capturas

[`CAPTURES.md`](CAPTURES.md): 15 frames, com diff da camada e xray. O xray separa o que está tapado pelo mundo (eye-02/03/09) do que falta. Há três frames de traçantes com linha de vista, um deles do olho do jogador numa posição genuína da rota (ponte rodoviária).
