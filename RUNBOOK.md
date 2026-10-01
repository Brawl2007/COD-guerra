# Executar e validar

Node >=22.12.0; CI em Node 24. Dependências fixadas: Three.js 0.186.1, Vite 8.3.1, Playwright 1.58.2. `package-lock.json` versionado.

```sh
npm ci
npm test
npm run build
npm run dev
```

Dev: `http://127.0.0.1:5173/COD-guerra/`. `npm start` é um alias para dev. Produção: `npm run preview`, `http://127.0.0.1:4173/COD-guerra/`.

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

A suíte de navegador inicia o preview do build automaticamente e verifica o prefixo de Pages. Sempre executar build após editar. Capturas e traces são gravados em `test-results/` e enviados como `browser-evidence` no CI. No ambiente desta sessão, o download CFT falhou; usou-se Chromium 153 extraído de um pacote npm em scratch:

```sh
CHROME_EXECUTABLE=/caminho/para/chromium npm run test:browser
```

Essa variável é opcional e não afecta produção/CI. O renderer de teste usa SwiftShader; os resultados não medem desempenho do Chromebook. `agent-browser` foi tentado e seu daemon não arrancou neste ambiente; a verificação efectiva foi realizada com Playwright e imagens inspeccionadas.

O CI mantém viewport 1280×720 e as mesmas assertions, com 180 s por teste (120 s para o percurso) por causa da renderização em software no runner. Não há retries automáticos. Traces, capturas e diagnóstico de simulação nas falhas ajudam a distinguir espera lenta de erro de jogo.

## Controlos e estado

WASD: mover; mouse: olhar; clique esquerdo: um disparo semiautomático; botão direito: mira; R: recarregar; G: granada; Shift: correr; Esc: libertar rato/pausar. Iniciar/Retomar solicita pointer lock e habilita áudio por gesto. Perder foco limpa as teclas e pausa simulação/áudio.

O selector inicia M01 por defeito. A bancada francesa continua seleccionável; `?mission=sandbox-1944` abre-a directamente. M01: E entrega mensagem/material e leva/entrega Bąk; C agacha; V alterna alça 300/500/800/1000 m; Espaço salta somente intro/outro. A referência da alça não implementa queda balística. O wz.29 tem 5 + 40 cartuchos, 2 granadas, ferrolho e recarga por clipe quando vazio; cargas parciais inserem um cartucho de cada vez.

Rota inicial de M01: contorne a trincheira pelo lado sul, atravesse a passagem aberta do portal ferroviário e use E junto de Nowicki. Depois do ataque siga Zieliński até à reorganização, encontre Krawiec no aterro e entre no barracão pela porta oeste para recolher material. Regresse aos sapadores, mantenha o acesso rodoviário, cubra o pelotão e recue ao posto de disparo/abrigo quando receber ordem.

Ao capturar o rato, o input espera a confirmação de pointer lock e descarta a primeira amostra relativa para evitar o salto de coordenadas do cursor. Os movimentos seguintes controlam yaw/pitch normalmente, incluindo após retomar.

Na bancada, checkpoint automático ao atingir C e chave `cod-guerra:checkpoint:v1`. Em M01, CP-A..D usam `cod-guerra:checkpoint:m01:v2`, com os dois relógios, estado real da arma, actores, eventos, flags, diálogos, sectores e destruição. CP-C é adiado até 05:34; CP-D usa posição/hora actuais. Reiniciar Checkpoint restaura o snapshot vivo; Continuar restaura após reload da página. Saves inválidos mostram erro e deixam iniciar de novo. Versões desconhecidas são rejeitadas.

As pontes usam nove GLB de apresentação e colisores em JSON. Se um GLB de M01 falhar, o menu mostra erro e bloqueia início/continuação para não criar uma ponte invisível; a bancada francesa mantém o fallback próprio. Para verificar a exportação e repetir o percurso de simulação:

```sh
npm run assets:m01:colliders -- --check
node tools/verify-m01-route.mjs
node --test tests/m01-runtime.test.js
```

Partida contínua de M01 no navegador, do menu ao debrief, numa única sessão (≈19 min reais em SwiftShader):

```sh
npm run build && npm run preview &
CHROME_EXECUTABLE=/caminho/para/chromium node tools/m01-browser-playthrough.mjs --out test-results/m01-continuous
```

O piloto usa teclado/cliques reais e olhar por `mousemove` relativo, e só lê `gameDiagnostics()` e o HUD: não injecta snapshots, relógios, eventos ou objectivos. Regista bloqueios de movimento, esperas, legendas, mensagens e uma captura por objectivo em `report.json`/`log.jsonl`. É um piloto automático; não substitui um playtest humano. `--skip-cutscenes` salta intro/outro com Espaço. `--adverse` acrescenta rotas adversas:
- sair dos limites a leste e cair no Vístula, cada uma com restauro de CP-A;
- ficar 2 min parado sem seguir o sargento;
- gastar a munição e pedir carregadores a Kowal.

`--cover help|ignore` compara as duas maneiras de jogar "Proteja o reparo" e "Cubra a retirada":
- `help`: o piloto fica na encosta ao lado dos sapadores e cala a MG dos portões, mirando o último clarão visto (`threat.recentFire`). Depois pede carregadores a Kowal e, do lado sul do tabuleiro, dispara sobre os alemães do tabuleiro.
- `ignore`: o piloto espera abrigado sem disparar.

O relatório guarda em `cover`:
- duração do reparo, supressões e percentagem de tempo com a MG calada;
- baixas do pelotão e sobreviventes;
- tiros dados;
- as linhas de estado do HUD e cada vez que divergem da simulação.

Comparação de estado (simulação, sem navegador), por sementes:

```sh
node tools/m01-cover-comparison.mjs [--seeds 19390901,1,2] [--out caminho.json]
```

Os modelos provisórios das pontes regeneram-se com `cd tools/assets/m01-bridges && npm ci && npm run build`; a exportação é determinística. Depois correr `npm run assets:m01:colliders -- --check` e `npm test`.

O verificador grava `docs/verification/m01-runtime/simulation-report.json`. Usa controlos e física reais da simulação com passos de 50 ms, sem injectar relógios/eventos/objectivos. Não é playtest no navegador. Testes de CP-D/outro no navegador continuam snapshots alcançados por esse percurso; estão identificados como verificações por trechos.

Verificação isolada das poses (porta 5181, servidor/browser fechados ao terminar):

```sh
CHROME_EXECUTABLE=/caminho/para/chromium node tools/verify-m01-poses.mjs --out test-results/m01-poses
```

A galeria usa o renderer de personagens com dados de exemplo; não executa a missão. O teste de navegador da chamada usa um snapshot alcançado pela rota de simulação e verifica a pose após reload.

Para a galeria de combate (mira, recuo, postura sob fogo e passo), com dois instantes do mesmo relógio de apresentação:

```sh
CHROME_EXECUTABLE=/caminho/para/chromium node tools/verify-m01-poses.mjs --combat --out test-results/m01-combat-poses
```

Os controlos de relógio desta galeria existem apenas na fixture de verificação. `gameDiagnostics().m01.actorAnimations` mostra as contagens renderizadas de mira, disparo, movimento e supressão; não é estado de gameplay. Provas e limites em `docs/verification/m01-runtime/combat-animation/`.

Comparação do combate de cobertura, duas rotas completas da simulação com a mesma seed:

```sh
node tools/verify-m01-cover.mjs
```

O piloto move-se, aponta com deltas de input e usa disparo/ferrolho/recarga. Não altera actores, RNG, eventos ou relógios; não é uma partida no navegador. Gera `docs/verification/m01-runtime/cover-combat/report.json`, com tiros a menos de 3 m (`round-impact.pinned`) e baixas por tiro real (`victim`). O navegador verifica por continuação o HUD, os efeitos e a pose dos sapadores no reparo, e as perdas na retirada. A flecha do tiro alemão é aproximação de jogo; a balística continua pendente.

## Diagnóstico

`?debug=1` habilita somente `window.gameDiagnostics()`: renderer, preset, chamadas/triângulos, assets, relógio, posição, fase e sectores. Não expõe a instância nem permite mutações. Não deixar informação de engenharia no HUD normal.

Se o ecrã falha, inspeccionar consola, rede e `#error`. Ausência de WebGL2 mostra mensagem. Asset ausente aparece no diagnóstico e utiliza fallback, sem aprovar qualidade final. `base` deve continuar `/COD-guerra/`; Vite copia `assets` para `dist/assets` no build.

## Publicação

Há um único workflow `.github/workflows/pages.yml`. PRs executam validação; pushes para main/master ou workflow_dispatch validam e publicam somente dist. Deploy depende da validação e tem concorrência Pages própria. Esta alteração deve chegar por PR para main; não publicar directamente uma bancada como campanha concluída.

## Verificação visual de M01

Para verificar a origem da salva nos portões e atrás da treliça, depois do build:

```sh
CHROME_EXECUTABLE=/caminho/chromium node tools/capture-m01-visual.mjs test-results/m01-cover-origin --cover-origin-only
```

São continuações de snapshots alcançados por controlos da simulação, esperando em cobertura até uma salva real. O script fecha preview/browser; não é uma partida humana ou contínua.

Para capturar somente a demolição leste, por continuação de snapshots alcançados pela rota de simulação, dentro e fora da treliça:

```sh
npm run build
CHROME_EXECUTABLE=/caminho/chromium node tools/capture-m01-visual.mjs test-results/m01-demolition --demolition-only
```

O script inicia e fecha o seu preview/browser. Guarda capturas originais e erros/diagnóstico; não é partida contínua nem playtest humano. Os snapshots exteriores usam movimento real na simulação até x < −100 depois da demolição.

```sh
npm run build
CHROME_EXECUTABLE=/caminho/chromium node tools/capture-m01-visual.mjs docs/verification/m01-runtime/visual-sprint/after
```

O script gere o seu preview, importa a rota do directório corrente e continua snapshots genuínos no browser; não é playtest contínuo/humano. Captura reparo, estação, retirada e chamada, com diagnóstico e erros. Antes de comparar, usar a mesma qualidade/viewport. Não executar com outro servidor na porta 4173. Guardar capturas fora de `test-results/` se precisarem sobreviver ao próximo Playwright, que limpa essa pasta.
