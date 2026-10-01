# M01 — evidências do protótipo

Capturas reais em Chromium 153/SwiftShader, 1280×720, sobre o build servido em `/COD-guerra/`. Modelos e áudio são provisórios. Estas imagens não aprovam performance nem reconstrução histórica.

| Imagem | Estado verificado |
| --- | --- |
| [menu.png](menu.png) | Selector Tczew/bancada e modelos carregados antes de iniciar. |
| [playing.png](playing.png) | CP-A, arma de cinco cartuchos, mira/recarga e controlos. |
| [message-delivered.png](message-delivered.png) | Caminhada por teclado desde o início e entrega com E no posto ferroviário. |
| [cp-d.png](cp-d.png) | Continuação do CP-D genuíno, com baixas e demolição leste persistidas. |
| [debrief.png](debrief.png) | Continuação do estado de outro e skip por Espaço; debrief habilitado, conclusão persistida. |

CP-D e outro foram atingidos pelo percurso de simulação e continuados no navegador. A suíte não constitui uma partida contínua de M01.

Revisões posteriores: [poses e chamada](poses/README.md) e [fogo de cobertura](cover-combat/README.md). A comparação de cobertura usa duas rotas completas de simulação e continuações por trechos no navegador. As partidas contínuas abaixo precedem estas mudanças.

**Partida contínua:** [continuous/README.md](continuous/README.md). Três partidas de M01, cada uma numa única sessão Chromium do menu ao debrief, conduzidas por um piloto automático com input do navegador. Não houve snapshots injectados. Inclui os problemas encontrados, as correcções e as capturas de resgate, feridos e retardatários. Não é playtest humano. O teste Node verifica morte/restauração dos quatro checkpoints, resgate opcional, relógios/gates, guardas de save e sectores durante 90 s.

[simulation-report.json](simulation-report.json) contém as horas e posições reais dos checkpoints, flags, baixas e eventos do percurso. Reproduzir:

```sh
npm ci
npm test
npm run build
npm run test:browser
node tools/verify-m01-route.mjs
```

O Playwright gera estas capturas em `test-results/`; o CI conserva o mesmo conjunto no artefacto `browser-evidence`. `CHROME_EXECUTABLE` é uma alternativa opcional descrita em `RUNBOOK.md`. Consultar `QUALITY_REPORT.md` para pendências de encenação, navegação, arte e validação.
