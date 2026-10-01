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

Checkpoint automático ao atingir C; restaurar pelo menu de pausa. Estado persistido na origem do navegador: `cod-guerra:checkpoint:v1`. Saves inválidos mostram erro legível e permitem iniciar nova missão. Nenhuma versão anterior completa foi identificada; versões desconhecidas são rejeitadas.

## Diagnóstico

`?debug=1` habilita somente `window.gameDiagnostics()`: renderer, preset, chamadas/triângulos, assets, relógio, posição, fase e sectores. Não expõe a instância nem permite mutações. Não deixar informação de engenharia no HUD normal.

Se o ecrã falha, inspeccionar consola, rede e `#error`. Ausência de WebGL2 mostra mensagem. Asset ausente aparece no diagnóstico e utiliza fallback, sem aprovar qualidade final. `base` deve continuar `/COD-guerra/`; Vite copia `assets` para `dist/assets` no build.

## Publicação

Há um único workflow `.github/workflows/pages.yml`. PRs executam validação; pushes para main/master ou workflow_dispatch validam e publicam somente dist. Deploy depende da validação e tem concorrência Pages própria. Esta alteração deve chegar por PR para main; não publicar directamente uma bancada como campanha concluída.
