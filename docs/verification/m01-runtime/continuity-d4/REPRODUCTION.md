# Reproduzir a D4

Node 24, x86_64, dependências do lockfile. Usar a branch/commit indicada no HANDOFF; não regenerar goldens antigos. Executar a partir da raiz do repositório.

```sh
npm ci
npm test
npm run build
npm run verify:bundle
node tools/verification/m01-integration-golden-audit.mjs --amendment 15
node tools/verification/m01-fair-death-audit.mjs --out /tmp/m01-d4-audit
node tools/verification/m01-fair-death-compare.mjs --baseline /tmp/m01-d3-baseline.json
node tools/verification/m01-fair-death-compare.mjs --compare-only --baseline /tmp/m01-d3-baseline.json --after /tmp/m01-d4-audit/FAIR_DEATH_AUDIT.json --out /tmp/m01-d3-d4-comparison.json
M01_T47_AUDIT_OUT=/tmp/m01-d4-invariants node tools/verification/m01-combat-posture-staging-audit.mjs --live
```

O comparador extrai a D3 exata de Git (`8ebc908`), com os seus próprios módulos/dados, e percorre 48 rotas. `--compare-only` reaproveita o baseline produzido e não volta a executar gameplay. O audit observa controlos/eventos normais; o seu instrumento conta os sorteios sem substituir os resultados. Os testes unitários de política isolada têm fixtures explícitas de dano/LOS; não se apresentam como gameplay natural.

O comando da emenda 15 sem `--write` verifica os ficheiros gerados. A geração final foi feita uma vez pelo mesmo verificador com `--write`, depois de rejeitar a primeira política; não se editaram digests à mão. Os dados das emendas 1–14 mantêm-se intactos.

Com Chromium disponível (ajustar o caminho se necessário), sobre o build padrão `dist`:

```sh
CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test -c tools/verification/playwright-port-4191.config.mjs m01-fair-death.spec.js m01-player-down.spec.js --reporter=line
```

A execução registada usou a porta isolada 4194, uma configuração temporária com as mesmas opções de Chromium/SwiftShader, um worker e zero retries. A emulação tátil vem da própria spec. Os testes partem de saves vivos produzidos por controlos normais; não constituem uma partida contínua menu→debrief. A causa longa é medida/fotografada durante uma pausa real em quatro resoluções; somente o overlay de pausa é ocultado na imagem.

Os três casos de menu/dificuldade passaram na primeira execução (7/8). A execução final contém os cinco cenários afetados; não foi declarado um run único 8/8. Logs negativos e imagens anteriores permanecem preservados.
