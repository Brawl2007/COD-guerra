# Reproduzir a fatia SP-08

Node24, dependências do lockfile, Chromium. A partir da raiz da branch/commit do HANDOFF:

```sh
npm ci
npm test
npm run build
npm run verify:bundle
node tools/verification/m01-sp08-views.mjs
CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test -c tools/verification/playwright-port-4191.config.mjs m01-corridor-role.spec.js m01-fair-death.spec.js m01-player-down.spec.js --reporter=line
```

O gerador sem `--write` reproduz e verifica as cinco vistas guardadas; usa o piloto existente e controlos normais. Verifica primeiro que os seus inputs de gameplay são os da D4 publicada `738d294`. `--write` foi usado uma vez para gerar as fixtures; não se editaram snapshots/digests à mão.

A execução registada usa a porta isolada4195, um worker, Chromium/SwiftShader e zero retries. Os novos testes usam Continuar, teclado ou eventos táteis reais, pausa e Reiniciar Checkpoint. O evento de demolição é produzido pelo avanço normal do jogo com a B4 satisfeita. Não se escreve HP, posição, relógio, eventos ou LOS no browser.

Os resultados reais são separados: principal6/8 (dois pilotos incorretos), pilotos corrigidos2/2, layout1/2 (seletor do teste incorreto; retoma tátil passou), layout final1/1 em três resoluções. Os negativos estão preservados; não se declarou um run único8/8. A correção final do layout é verificada por limites DOM: saúde abaixo do painel e dentro do ecrã.

Os inputs de gameplay da emenda15 permanecem idênticos (`GAMEPLAY_INPUTS_UNCHANGED.json`). Não se regeneraram goldens nem se repetiu a calibração48: essas provas pertencem à D4 e a mudança nova é de UI/CSS. A suite completa valida também os locks existentes no commit novo. O percurso12/12 do gerador é de simulação, não uma partida contínua de browser ou playtest humano.
