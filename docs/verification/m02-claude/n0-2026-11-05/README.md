# Capturas reais N0: bancada M02 em `a22520ce` (2026-11-05)

As capturas foram geradas pelo Playwright com o comando abaixo:

```bash
CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4391 npx playwright test -c tools/m02/playwright-m02-01.config.js
```

- Renderer: SwiftShader (WebGL por software).
- Resultado: 2 passed (5,8 min). Prova automática: 30/30 conjuntos, 120 PNG no total.

Esta pasta guarda uma seleção:
- SN1–SN5, luz de tarde, perfil medium, direção 0°;
- SN3, luz de manhã, direção 90°;
- o manifesto completo `n0-manifest.json`, com o sha256 de todas as 120 capturas.

As restantes imagens regeneram-se com o comando acima e ficam em `test-results/`, que não está no git.

**Não é aprovação do N0.** A leitura humana das imagens, a oclusão, os interiores e o vídeo das rotas continuam pendentes.
O SwiftShader não representa a GPU: não há FPS medido.
