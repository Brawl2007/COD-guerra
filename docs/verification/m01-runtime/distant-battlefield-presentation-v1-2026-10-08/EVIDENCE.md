# EVIDENCE — M01 distant battlefield presentation V1

Execução **local**: contentor Linux de 4 núcleos, Node 22, Chromium 1194 com ANGLE/SwiftShader (WebGL por software). Não é CI remoto, Chromebook nem GPU real. Nenhum número abaixo é FPS de jogo.

| Campo | Valor |
|---|---|
| Base | `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime verificado | `24d2ed7` (plano, renderer, integração, testes, ferramentas). Os commits seguintes só acrescentam documentação/capturas. |
| Ficheiros | [`FILES_CHANGED.txt`](FILES_CHANGED.txt): só `src/render/*`, testes e ferramentas de verificação. Gameplay/world/core/assets/research/missions/build/CI sem diff contra a base. O único ficheiro também alterado pela correcção de FX é `src/render/m01-view.js`. |

## Testes

| Comando | Resultado |
|---|---|
| `node --test tests/m01-distant-battlefield.test.js` | **15/15 PASS** |
| `npm test` | **339/339 PASS**, 0 skips ([`logs/node.log`](logs/node.log)) |
| `npm run build` | **PASS** (aviso existente de chunk > 500 kB) ([`logs/build.log`](logs/build.log)) |
| `CI=1 npx playwright test tests/browser/m01-distant-battlefield.spec.js` | **2/2 PASS**, 1,7 min ([`logs/browser-spec.log`](logs/browser-spec.log)). Build de produção, snapshots genuínos da rota; leste em Baixa e norte em Alta. O teste verifica: <ul><li>camadas presentes;</li><li>pools dentro dos limites;</li><li>pausa congela o relógio e o diagnóstico;</li><li>fontes só `evt_m01_*`/`ambient:*`;</li><li>estado da arma intacto;</li><li>zero erros/404.</li></ul> Capturas do frame em pausa (o teste verifica diagnóstico, não composição): [`captures/distant-east-low.png`](captures/distant-east-low.png), [`captures/distant-north-high.png`](captures/distant-north-high.png). |

O que os testes Node cobrem: <ul><li>separação das três camadas;</li><li>pureza/determinismo;</li><li>cache igual ao recálculo;</li><li>ritmo (CV dos intervalos, autocorrelação, minutos calmos/surtos, sem repetição de local ou rajada);</li><li>scan ≥ duração de qualquer evento;</li><li>impactos pesados ≥0,3 s nos dois sectores pesados;</li><li>distâncias e trajectórias por construção (Lisewo e figuras além do raio de tiro, aviões ≥2 km);</li><li>fases autoritativas (silêncio, surto, recuo, Koźliny, coluna antes da chamada);</li><li>lanços e carregadores;</li><li>renderer só lê (proxies que registam escritas e chamadas: só `heightAt`);</li><li>A/B de gameplay em 400 ticks com e sem a camada;</li><li>câmara/qualidade não mudam eventos;</li><li>pools nunca saturam na rota;</li><li>pausa e restore (janela dos clarões reposta).</li></ul>

## Merge de ensaio com a correcção de FX e com a arma em primeira pessoa

Worktree descartável: esta branch (`24d2ed7`) + `origin/codex/m01-battlefield-fx-polish-v3` (`e08755b`) + a branch da arma em primeira pessoa (`a428925`). **Os dois merges são automáticos, sem conflitos.**

`npm test` no resultado: **367/370** ([`logs/merged-node.log`](logs/merged-node.log), merge em [`logs/merged-merge.log`](logs/merged-merge.log)).
- As 3 falhas são de `tests/m01-mg34-prone-presentation.test.js` («actual muzzle effect after shot 1/4/6…»).
- **Falham igual na FX V3 sozinha** (`e08755b`, worktree próprio: 10/13 nesse ficheiro).
- O teste constrói um `M01View` parcial sem `fireColor`, e o `updateFire` da V3 passou a pintar o fumo com cor (`this.fireColor.set`).
- Não é causado por esta branch nem pela da arma. A correcção pertence à V3: o teste deve criar `fireColor`, ou `put` deve tolerar a sua ausência.

## Custo JS do plano (relativo, Node, não é FPS)

| `planDistantBattlefield` por chamada (20 748 relógios da rota, 3 repetições) | µs |
|---|---|
| Plano da primeira versão (`8c4367b`) | 243–260 |
| Plano actual (rejeição barata + cache por assinatura de marcos) | 82–123 |

## Capturas

[`CAPTURES.md`](CAPTURES.md).
